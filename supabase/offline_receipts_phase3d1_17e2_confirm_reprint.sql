-- ============================================================
-- SRMDC
-- Phase 3D1.17E2
-- Controlled Offline Receipt REPRINT Confirmation
--
-- IMPORTANT:
-- * ORIGINAL print history is immutable.
-- * Reprint reason is mandatory.
-- * Only receipts with existing print history may be reprinted.
-- * Financial lifecycle is NOT changed.
-- * No receipt identity is changed or reused.
-- * Each confirmation creates a separate REPRINT audit batch.
-- ============================================================

begin;

create or replace function public.confirm_offline_receipt_reprint(
    p_village_id uuid,
    p_book_id uuid,
    p_from_serial integer,
    p_to_serial integer,
    p_reason text
)
returns public.offline_receipt_print_batches
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_user_id uuid;
    v_book public.offline_receipt_books%rowtype;
    v_batch public.offline_receipt_print_batches%rowtype;
    v_expected_count integer;
    v_receipt_count integer;
    v_previously_printed_count integer;
    v_reason text;
begin
    -- --------------------------------------------------------
    -- AUTHENTICATION
    -- --------------------------------------------------------

    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception 'Authentication required.';
    end if;

    -- --------------------------------------------------------
    -- BASIC INPUT VALIDATION
    -- --------------------------------------------------------

    if p_village_id is null then
        raise exception 'Village is required.';
    end if;

    if p_book_id is null then
        raise exception 'Receipt book is required.';
    end if;

    if p_from_serial is null or
       p_to_serial is null or
       p_from_serial < 1 or
       p_to_serial < p_from_serial then

        raise exception 'Invalid receipt serial range.';
    end if;

    v_reason := btrim(coalesce(p_reason, ''));

    if length(v_reason) < 3 then
        raise exception 'A reprint reason is required.';
    end if;

    if length(v_reason) > 500 then
        raise exception 'Reprint reason must not exceed 500 characters.';
    end if;

    v_expected_count :=
        p_to_serial - p_from_serial + 1;

    -- Safety limit for a single confirmation.
    -- This does not change the existing ORIGINAL proof limit.
    if v_expected_count > 500 then
        raise exception 'A maximum of 500 receipts may be reprinted in one batch.';
    end if;

    -- --------------------------------------------------------
    -- ADMIN AUTHORIZATION
    -- --------------------------------------------------------

    if not public.is_village_admin(p_village_id) then
        raise exception 'Village administrator permission required.';
    end if;

    -- --------------------------------------------------------
    -- VALIDATE RECEIPT BOOK
    -- --------------------------------------------------------

    select *
      into v_book
      from public.offline_receipt_books
     where id = p_book_id
       and village_id = p_village_id;

    if not found then
        raise exception 'Receipt book was not found for this village.';
    end if;

    -- --------------------------------------------------------
    -- LOCK THE CONTROLLED RECEIPT RANGE
    -- --------------------------------------------------------

    perform 1
      from public.offline_receipts r
     where r.book_id = p_book_id
       and r.village_id = p_village_id
       and r.serial_number between p_from_serial and p_to_serial
     order by r.serial_number
     for update;

    -- --------------------------------------------------------
    -- RANGE MUST BE COMPLETE / CONTIGUOUS
    -- --------------------------------------------------------

    select count(*)
      into v_receipt_count
      from public.offline_receipts r
     where r.book_id = p_book_id
       and r.village_id = p_village_id
       and r.serial_number between p_from_serial and p_to_serial;

    if v_receipt_count <> v_expected_count then
        raise exception
            'Not every receipt serial in the requested range exists.';
    end if;

    -- --------------------------------------------------------
    -- REPRINT ELIGIBILITY
    --
    -- Every selected receipt must already have at least one
    -- physical print record. This prevents REPRINT from being
    -- used as a substitute for ORIGINAL.
    -- --------------------------------------------------------

    select count(*)
      into v_previously_printed_count
      from public.offline_receipts r
     where r.book_id = p_book_id
       and r.village_id = p_village_id
       and r.serial_number between p_from_serial and p_to_serial
       and exists (
           select 1
             from public.offline_receipt_print_items pi
            where pi.offline_receipt_id = r.id
       );

    if v_previously_printed_count <> v_expected_count then
        raise exception
            'REPRINT blocked. Every selected receipt must already have ORIGINAL or prior REPRINT history.';
    end if;

    -- --------------------------------------------------------
    -- CREATE AUDIT BATCH
    -- --------------------------------------------------------

    insert into public.offline_receipt_print_batches (
        village_id,
        book_id,
        from_serial,
        to_serial,
        receipt_count,
        batch_type,
        reason,
        exported_at,
        exported_by
    )
    values (
        p_village_id,
        p_book_id,
        p_from_serial,
        p_to_serial,
        v_expected_count,
        'REPRINT',
        v_reason,
        now(),
        v_user_id
    )
    returning *
      into v_batch;

    -- --------------------------------------------------------
    -- CREATE ONE NEW PRINT ITEM PER RECEIPT
    --
    -- Existing ORIGINAL/REPRINT items are never modified.
    -- --------------------------------------------------------

    insert into public.offline_receipt_print_items (
        print_batch_id,
        offline_receipt_id,
        printed_at,
        printed_by
    )
    select
        v_batch.id,
        r.id,
        now(),
        v_user_id
      from public.offline_receipts r
     where r.book_id = p_book_id
       and r.village_id = p_village_id
       and r.serial_number between p_from_serial and p_to_serial
     order by r.serial_number;

    -- --------------------------------------------------------
    -- FINANCIAL LIFECYCLE INTENTIONALLY UNTOUCHED
    --
    -- No UPDATE against public.offline_receipts occurs here.
    -- reserved / issued / void remains exactly as-is.
    -- --------------------------------------------------------

    return v_batch;
end;
$$;

revoke all
on function public.confirm_offline_receipt_reprint(
    uuid,
    uuid,
    integer,
    integer,
    text
)
from public;

revoke all
on function public.confirm_offline_receipt_reprint(
    uuid,
    uuid,
    integer,
    integer,
    text
)
from anon;

grant execute
on function public.confirm_offline_receipt_reprint(
    uuid,
    uuid,
    integer,
    integer,
    text
)
to authenticated;

commit;

-- ============================================================
-- ROLLBACK GUIDANCE
--
-- Use ONLY if the function itself must be removed.
-- This does NOT delete any REPRINT audit history already created.
--
-- drop function if exists
-- public.confirm_offline_receipt_reprint(
--     uuid,
--     uuid,
--     integer,
--     integer,
--     text
-- );
--
-- Never delete print batches/items merely to "undo" a reprint.
-- Operational correction must preserve audit history.
-- ============================================================