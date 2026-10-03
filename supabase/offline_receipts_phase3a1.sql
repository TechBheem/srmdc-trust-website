-- ============================================================
-- SRMDC / MANA BODABANDA
-- PHASE 3A1 - OFFLINE RECEIPT BOOK FOUNDATION
--
-- PURPOSE
--   1. Maintain physical/offline receipt books.
--   2. Reserve receipt numbers before printing.
--   3. Never reuse a receipt number.
--   4. Keep offline numbering separate from MB-VD receipts.
--   5. Preserve village-scoped RLS.
--
-- IMPORTANT
--   This migration DOES NOT create Book 001 or reserve 1-500.
--   Reservation will be performed separately after verification.
-- ============================================================


-- ============================================================
-- 1. OFFLINE RECEIPT BOOKS
-- ============================================================

create table if not exists public.offline_receipt_books (
    id uuid primary key default gen_random_uuid(),

    village_id uuid not null
        references public.villages(id)
        on delete restrict,

    book_number integer not null
        check (book_number > 0),

    financial_year text not null
        check (
            financial_year ~ '^[0-9]{4}-[0-9]{2}$'
        ),

    receipt_prefix text not null
        default 'SRMDC-OR',

    start_serial integer not null
        check (start_serial > 0),

    end_serial integer not null
        check (end_serial >= start_serial),

    quantity integer generated always as
        (end_serial - start_serial + 1) stored,

    status text not null
        default 'reserved'
        check (
            status in (
                'reserved',
                'active',
                'completed',
                'cancelled'
            )
        ),

    description text,

    issued_to_name text,
    issued_on date,

    created_by uuid
        references auth.users(id)
        on delete set null,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint offline_receipt_books_village_book_unique
        unique (village_id, financial_year, book_number),

    constraint offline_receipt_books_village_range_unique
        unique (
            village_id,
            financial_year,
            start_serial,
            end_serial
        )
);


-- ============================================================
-- 2. RESERVED / ISSUED OFFLINE RECEIPTS
-- ============================================================

create table if not exists public.offline_receipts (
    id uuid primary key default gen_random_uuid(),

    village_id uuid not null
        references public.villages(id)
        on delete restrict,

    book_id uuid not null
        references public.offline_receipt_books(id)
        on delete restrict,

    serial_number integer not null
        check (serial_number > 0),

    receipt_number text not null,

    verification_id uuid not null
        default gen_random_uuid(),

    status text not null
        default 'reserved'
        check (
            status in (
                'reserved',
                'issued',
                'void'
            )
        ),

    -- --------------------------------------------------------
    -- HANDWRITTEN / OFFLINE RECEIPT DETAILS
    -- --------------------------------------------------------

    honorific text
        check (
            honorific is null
            or honorific in (
                'Sri',
                'Srimathi'
            )
        ),

    donor_name text,

    pan_number text,

    address text,

    mobile_number text,

    receipt_date date,

    fund_type text,

    purpose text,

    payment_mode text
        check (
            payment_mode is null
            or payment_mode in (
                'Cash',
                'UPI',
                'Bank Transfer',
                'Cheque',
                'Other'
            )
        ),

    amount numeric(14,2)
        check (
            amount is null
            or amount > 0
        ),

    amount_in_words text,

    reference_number text,

    remarks text,

    -- --------------------------------------------------------
    -- PHYSICAL RECEIPT SIGNATURE / CONTROL DETAILS
    -- --------------------------------------------------------

    donor_signature_confirmed boolean
        not null default false,

    received_by_name text,

    received_by_user_id uuid
        references auth.users(id)
        on delete set null,

    authorized_signatory_name text,

    -- --------------------------------------------------------
    -- ACCOUNTING LINK
    --
    -- These fields allow a verified offline receipt to point
    -- to the genuine transaction created by the existing
    -- accounting workflow.
    -- --------------------------------------------------------

    linked_record_type text
        check (
            linked_record_type is null
            or linked_record_type in (
                'village_commitment_payment',
                'temple_fund_transaction',
                'village_activity_fund',
                'other'
            )
        ),

    linked_record_id uuid,

    -- --------------------------------------------------------
    -- ISSUE / VOID AUDIT
    -- --------------------------------------------------------

    issued_by uuid
        references auth.users(id)
        on delete set null,

    issued_at timestamptz,

    void_reason text,

    voided_by uuid
        references auth.users(id)
        on delete set null,

    voided_at timestamptz,

    created_by uuid
        references auth.users(id)
        on delete set null,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint offline_receipts_receipt_number_unique
        unique (receipt_number),

    constraint offline_receipts_verification_id_unique
        unique (verification_id),

    constraint offline_receipts_book_serial_unique
        unique (book_id, serial_number),

    constraint offline_receipts_status_consistency
        check (
            (
                status = 'reserved'
                and issued_at is null
                and voided_at is null
            )
            or
            (
                status = 'issued'
                and issued_at is not null
                and receipt_date is not null
                and donor_name is not null
                and amount is not null
                and voided_at is null
            )
            or
            (
                status = 'void'
                and voided_at is not null
                and void_reason is not null
            )
        )
);


-- ============================================================
-- 3. INDEXES
-- ============================================================

create index if not exists idx_offline_receipt_books_village
    on public.offline_receipt_books(village_id);

create index if not exists idx_offline_receipt_books_status
    on public.offline_receipt_books(village_id, status);

create index if not exists idx_offline_receipts_village
    on public.offline_receipts(village_id);

create index if not exists idx_offline_receipts_book
    on public.offline_receipts(book_id);

create index if not exists idx_offline_receipts_status
    on public.offline_receipts(village_id, status);

create index if not exists idx_offline_receipts_serial
    on public.offline_receipts(
        village_id,
        serial_number
    );

create index if not exists idx_offline_receipts_date
    on public.offline_receipts(
        village_id,
        receipt_date
    );


-- ============================================================
-- 4. PREVENT CHANGING RESERVED RECEIPT IDENTITY
--
-- Receipt number, serial, book and village become immutable
-- once created.
-- ============================================================

create or replace function public.protect_offline_receipt_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

    if new.village_id is distinct from old.village_id then
        raise exception
            'Offline receipt village cannot be changed.';
    end if;

    if new.book_id is distinct from old.book_id then
        raise exception
            'Offline receipt book cannot be changed.';
    end if;

    if new.serial_number is distinct from old.serial_number then
        raise exception
            'Offline receipt serial number cannot be changed.';
    end if;

    if new.receipt_number is distinct from old.receipt_number then
        raise exception
            'Offline receipt number cannot be changed.';
    end if;

    if new.verification_id is distinct from old.verification_id then
        raise exception
            'Offline receipt verification ID cannot be changed.';
    end if;

    return new;
end;
$$;


drop trigger if exists trg_protect_offline_receipt_identity
on public.offline_receipts;

create trigger trg_protect_offline_receipt_identity
before update on public.offline_receipts
for each row
execute function public.protect_offline_receipt_identity();


-- ============================================================
-- 5. UPDATED_AT TRIGGERS
-- ============================================================

create or replace function public.set_offline_receipt_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;


drop trigger if exists trg_offline_receipt_books_updated_at
on public.offline_receipt_books;

create trigger trg_offline_receipt_books_updated_at
before update on public.offline_receipt_books
for each row
execute function public.set_offline_receipt_updated_at();


drop trigger if exists trg_offline_receipts_updated_at
on public.offline_receipts;

create trigger trg_offline_receipts_updated_at
before update on public.offline_receipts
for each row
execute function public.set_offline_receipt_updated_at();


-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================

alter table public.offline_receipt_books
enable row level security;

alter table public.offline_receipts
enable row level security;


-- ------------------------------------------------------------
-- Receipt Books
-- ------------------------------------------------------------

drop policy if exists
    "admins manage offline receipt books"
on public.offline_receipt_books;

create policy
    "admins manage offline receipt books"
on public.offline_receipt_books
for all
to authenticated
using (
    public.is_village_admin(village_id)
)
with check (
    public.is_village_admin(village_id)
);


-- ------------------------------------------------------------
-- Individual Offline Receipts
-- ------------------------------------------------------------

drop policy if exists
    "admins manage offline receipts"
on public.offline_receipts;

create policy
    "admins manage offline receipts"
on public.offline_receipts
for all
to authenticated
using (
    public.is_village_admin(village_id)
)
with check (
    public.is_village_admin(village_id)
);


-- ============================================================
-- 7. AUTHENTICATED GRANTS
-- ============================================================

grant select, insert, update
on table public.offline_receipt_books
to authenticated;

grant select, insert, update
on table public.offline_receipts
to authenticated;


-- ============================================================
-- 8. ATOMIC RECEIPT BOOK RESERVATION RPC
--
-- Creates:
--   * One receipt-book record
--   * Every receipt number in the requested range
--
-- Example future call:
--
-- reserve_offline_receipt_book(
--   village,
--   1,
--   '2026-27',
--   1,
--   500
-- )
--
-- This function is NOT called by this migration.
-- ============================================================

create or replace function public.reserve_offline_receipt_book(
    p_village_id uuid,
    p_book_number integer,
    p_financial_year text,
    p_start_serial integer,
    p_end_serial integer,
    p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_book_id uuid;
    v_serial integer;
    v_receipt_number text;
begin

    -- --------------------------------------------------------
    -- Authorization
    -- --------------------------------------------------------

    if not public.is_village_admin(p_village_id) then
        raise exception
            'You are not authorized to manage receipts for this village.';
    end if;


    -- --------------------------------------------------------
    -- Input validation
    -- --------------------------------------------------------

    if p_book_number is null or p_book_number <= 0 then
        raise exception
            'Book number must be greater than zero.';
    end if;

    if p_financial_year is null
       or p_financial_year !~ '^[0-9]{4}-[0-9]{2}$'
    then
        raise exception
            'Financial year must use YYYY-YY format.';
    end if;

    if p_start_serial is null
       or p_end_serial is null
       or p_start_serial <= 0
       or p_end_serial < p_start_serial
    then
        raise exception
            'Invalid receipt serial range.';
    end if;

    if (p_end_serial - p_start_serial + 1) > 500 then
        raise exception
            'A single offline receipt book cannot exceed 500 receipts.';
    end if;


    -- --------------------------------------------------------
    -- Prevent overlapping serial ranges for same village/FY.
    -- --------------------------------------------------------

    if exists (
        select 1
        from public.offline_receipts r
        join public.offline_receipt_books b
          on b.id = r.book_id
        where r.village_id = p_village_id
          and b.financial_year = p_financial_year
          and r.serial_number
              between p_start_serial and p_end_serial
    ) then
        raise exception
            'One or more receipt serial numbers are already reserved.';
    end if;


    -- --------------------------------------------------------
    -- Create receipt book.
    -- --------------------------------------------------------

    insert into public.offline_receipt_books (
        village_id,
        book_number,
        financial_year,
        receipt_prefix,
        start_serial,
        end_serial,
        status,
        description,
        created_by
    )
    values (
        p_village_id,
        p_book_number,
        p_financial_year,
        'SRMDC-OR',
        p_start_serial,
        p_end_serial,
        'reserved',
        p_description,
        auth.uid()
    )
    returning id
    into v_book_id;


    -- --------------------------------------------------------
    -- Reserve every receipt number.
    --
    -- Example:
    -- SRMDC-OR-2026-27-000001
    -- --------------------------------------------------------

    for v_serial in
        p_start_serial .. p_end_serial
    loop

        v_receipt_number :=
            'SRMDC-OR-'
            || p_financial_year
            || '-'
            || lpad(
                v_serial::text,
                6,
                '0'
            );

        insert into public.offline_receipts (
            village_id,
            book_id,
            serial_number,
            receipt_number,
            status,
            created_by
        )
        values (
            p_village_id,
            v_book_id,
            v_serial,
            v_receipt_number,
            'reserved',
            auth.uid()
        );

    end loop;


    return v_book_id;

end;
$$;


revoke all
on function public.reserve_offline_receipt_book(
    uuid,
    integer,
    text,
    integer,
    integer,
    text
)
from public;

grant execute
on function public.reserve_offline_receipt_book(
    uuid,
    integer,
    text,
    integer,
    integer,
    text
)
to authenticated;


-- ============================================================
-- 9. SAFE READ-ONLY VERIFICATION VIEW
--
-- Useful for Admin Receipt Register.
-- Does not alter accounting.
-- ============================================================

create or replace view public.offline_receipt_register
with (security_invoker = true)
as
select
    r.id,
    r.village_id,
    r.book_id,

    b.book_number,
    b.financial_year,

    r.serial_number,
    r.receipt_number,
    r.verification_id,

    r.status,

    r.receipt_date,

    r.honorific,
    r.donor_name,
    r.pan_number,
    r.address,
    r.mobile_number,

    r.fund_type,
    r.purpose,

    r.payment_mode,
    r.amount,

    r.received_by_name,
    r.authorized_signatory_name,

    r.linked_record_type,
    r.linked_record_id,

    r.issued_at,

    r.void_reason,
    r.voided_at,

    r.created_at,
    r.updated_at

from public.offline_receipts r
join public.offline_receipt_books b
  on b.id = r.book_id;


grant select
on public.offline_receipt_register
to authenticated;


-- ============================================================
-- END PHASE 3A1
--
-- IMPORTANT:
-- No receipt numbers have been generated by this migration.
-- ============================================================