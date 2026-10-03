-- ============================================================
-- PHASE 3D1.20B
-- OFFLINE RECEIPT <-> VILLAGE DONATION PAYMENT LINK
-- DESIGN / MIGRATION
-- ============================================================
--
-- PURPOSE
--   Explicitly link one ISSUED offline receipt to one existing
--   Village Donation payment without creating a second donation
--   or treating receipt printing as receipt issuance.
--
-- SAFETY
--   * RESERVED receipts cannot be linked.
--   * VOID receipts cannot be linked.
--   * One offline receipt can be linked only once.
--   * One donation payment can be linked only once.
--   * Same-village validation is mandatory.
--   * Link/unlink is performed only through SECURITY DEFINER RPCs.
--   * Unlink requires a reason.
--   * Link history is retained for audit.
--   * No receipt book / receipt generation occurs here.
--   * No printing/export/reprint state is changed here.
-- ============================================================


-- ------------------------------------------------------------
-- 1. LINK TABLE
-- ------------------------------------------------------------

create table if not exists public.offline_receipt_donation_links
(
    id uuid primary key default gen_random_uuid(),

    village_id uuid not null,

    offline_receipt_id uuid not null
        references public.offline_receipts(id)
        on delete restrict,

    donation_payment_id uuid not null
        references public.village_commitment_payments(id)
        on delete restrict,

    offline_receipt_number text not null,

    linked_at timestamptz not null default now(),

    linked_by uuid not null,

    link_note text,

    is_active boolean not null default true,

    unlinked_at timestamptz,

    unlinked_by uuid,

    unlink_reason text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint offline_receipt_donation_links_unlink_consistency
        check
        (
            (
                is_active = true
                and unlinked_at is null
                and unlinked_by is null
                and unlink_reason is null
            )
            or
            (
                is_active = false
                and unlinked_at is not null
                and unlinked_by is not null
                and nullif(btrim(unlink_reason), '') is not null
            )
        )
);


-- ------------------------------------------------------------
-- 2. ACTIVE-LINK UNIQUENESS
--
-- Historical unlinked rows remain in the audit table.
-- Only one ACTIVE link is permitted for each side.
-- ------------------------------------------------------------

create unique index if not exists
    uq_offline_receipt_donation_links_active_receipt
on public.offline_receipt_donation_links
    (offline_receipt_id)
where is_active = true;


create unique index if not exists
    uq_offline_receipt_donation_links_active_payment
on public.offline_receipt_donation_links
    (donation_payment_id)
where is_active = true;


create index if not exists
    idx_offline_receipt_donation_links_village
on public.offline_receipt_donation_links
    (village_id);


create index if not exists
    idx_offline_receipt_donation_links_receipt_number
on public.offline_receipt_donation_links
    (offline_receipt_number);


-- ------------------------------------------------------------
-- 3. RLS
--
-- Browser clients do not write this table directly.
-- Mutations happen only through the controlled RPCs below.
-- ------------------------------------------------------------

alter table public.offline_receipt_donation_links
enable row level security;


revoke all
on table public.offline_receipt_donation_links
from anon;


revoke insert, update, delete
on table public.offline_receipt_donation_links
from authenticated;


-- ------------------------------------------------------------
-- 4. LINK RPC
-- ------------------------------------------------------------

create or replace function public.link_offline_receipt_to_donation_payment
(
    p_offline_receipt_id uuid,
    p_donation_payment_id uuid,
    p_note text default null
)
returns public.offline_receipt_donation_links
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id uuid;
    v_receipt public.offline_receipts%rowtype;
    v_payment public.village_commitment_payments%rowtype;
    v_link public.offline_receipt_donation_links%rowtype;
begin
    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception 'Authentication required.';
    end if;


    -- --------------------------------------------------------
    -- Reuse the existing village-admin authorization model.
    -- This intentionally assumes public.is_village_admin(...)
    -- is the established authorization helper.
    -- Migration must NOT be installed until this helper/signature
    -- has been verified against the live schema.
    -- --------------------------------------------------------

    select *
      into v_receipt
      from public.offline_receipts
     where id = p_offline_receipt_id
     for update;

    if not found then
        raise exception 'Offline receipt not found.';
    end if;


    if not public.is_village_admin(v_receipt.village_id) then
        raise exception 'Village administrator permission required.';
    end if;


    if lower(coalesce(v_receipt.status, '')) <> 'issued' then
        raise exception
            'Only an ISSUED offline receipt may be linked. Current status: %',
            coalesce(v_receipt.status, 'UNKNOWN');
    end if;


    select *
      into v_payment
      from public.village_commitment_payments
     where id = p_donation_payment_id
     for update;

    if not found then
        raise exception 'Village donation payment not found.';
    end if;


    if v_payment.village_id is distinct from v_receipt.village_id then
        raise exception
            'Village mismatch. Receipt and donation payment must belong to the same village.';
    end if;


    if exists
    (
        select 1
          from public.offline_receipt_donation_links l
         where l.offline_receipt_id = v_receipt.id
           and l.is_active = true
    ) then
        raise exception
            'This offline receipt is already linked to a donation payment.';
    end if;


    if exists
    (
        select 1
          from public.offline_receipt_donation_links l
         where l.donation_payment_id = v_payment.id
           and l.is_active = true
    ) then
        raise exception
            'This donation payment is already linked to an offline receipt.';
    end if;


    insert into public.offline_receipt_donation_links
    (
        village_id,
        offline_receipt_id,
        donation_payment_id,
        offline_receipt_number,
        linked_by,
        link_note
    )
    values
    (
        v_receipt.village_id,
        v_receipt.id,
        v_payment.id,
        v_receipt.receipt_number,
        v_user_id,
        nullif(btrim(p_note), '')
    )
    returning *
      into v_link;


    return v_link;
end;
$$;


-- ------------------------------------------------------------
-- 5. UNLINK / CORRECTION RPC
--
-- Unlink does NOT delete history.
-- ------------------------------------------------------------

create or replace function public.unlink_offline_receipt_from_donation_payment
(
    p_link_id uuid,
    p_reason text
)
returns public.offline_receipt_donation_links
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id uuid;
    v_link public.offline_receipt_donation_links%rowtype;
begin
    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception 'Authentication required.';
    end if;


    if nullif(btrim(p_reason), '') is null then
        raise exception 'Unlink reason is required.';
    end if;


    select *
      into v_link
      from public.offline_receipt_donation_links
     where id = p_link_id
     for update;

    if not found then
        raise exception 'Receipt/donation link not found.';
    end if;


    if not v_link.is_active then
        raise exception 'This receipt/donation link is already inactive.';
    end if;


    if not public.is_village_admin(v_link.village_id) then
        raise exception 'Village administrator permission required.';
    end if;


    update public.offline_receipt_donation_links
       set is_active = false,
           unlinked_at = now(),
           unlinked_by = v_user_id,
           unlink_reason = btrim(p_reason),
           updated_at = now()
     where id = v_link.id
     returning *
       into v_link;


    return v_link;
end;
$$;


-- ------------------------------------------------------------
-- 6. RPC PERMISSIONS
-- ------------------------------------------------------------

revoke all
on function public.link_offline_receipt_to_donation_payment(uuid, uuid, text)
from public;


revoke all
on function public.unlink_offline_receipt_from_donation_payment(uuid, text)
from public;


grant execute
on function public.link_offline_receipt_to_donation_payment(uuid, uuid, text)
to authenticated;


grant execute
on function public.unlink_offline_receipt_from_donation_payment(uuid, text)
to authenticated;


-- ------------------------------------------------------------
-- 7. DOCUMENTATION
-- ------------------------------------------------------------

comment on table public.offline_receipt_donation_links is
'Explicit audited relationship between one issued offline receipt and one existing Village Donation payment. Linking does not create another donation or payment.';


comment on function public.link_offline_receipt_to_donation_payment(uuid, uuid, text) is
'Links one ISSUED offline receipt to one existing Village Donation payment after authenticated village-admin validation. Does not create a donation/payment, issue another receipt, or change print history.';


comment on function public.unlink_offline_receipt_from_donation_payment(uuid, text) is
'Deactivates an existing offline-receipt/donation-payment link while preserving audit history. Requires an authenticated village administrator and an unlink reason.';


-- ============================================================
-- END PHASE 3D1.20B DESIGN
-- ============================================================