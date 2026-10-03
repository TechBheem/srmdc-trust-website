-- ============================================================
-- SRMDC
-- PHASE 3D1.19B
-- SECURE CREATE-NEXT-OFFLINE-RECEIPT-BOOK RPC
--
-- PURPOSE
--   Create the next sequential offline receipt book without
--   allowing the browser/admin UI to choose:
--
--     * book number
--     * start serial
--     * end serial
--     * receipt numbers
--
-- EXAMPLE
--
--   Existing:
--     Book 001 = serials 1-500
--
--   Next:
--     Book 002 = serials 501-1000
--
-- IMPORTANT
--   This migration creates the RPC only.
--   It DOES NOT create Book 002.
-- ============================================================


create or replace function public.create_next_offline_receipt_book(
    p_village_id uuid,
    p_financial_year text,
    p_description text default null
)
returns table (
    book_id uuid,
    book_number integer,
    financial_year text,
    start_serial integer,
    end_serial integer,
    quantity integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_next_book_number integer;
    v_start_serial integer;
    v_end_serial integer;
    v_book_id uuid;
begin

    -- --------------------------------------------------------
    -- Authorization
    -- --------------------------------------------------------

    if not public.is_village_admin(p_village_id) then
        raise exception
            'You are not authorized to manage receipts for this village.';
    end if;


    -- --------------------------------------------------------
    -- Validate financial year
    -- --------------------------------------------------------

    if p_financial_year is null
       or p_financial_year !~ '^[0-9]{4}-[0-9]{2}$'
    then
        raise exception
            'Financial year must use YYYY-YY format.';
    end if;


    -- --------------------------------------------------------
    -- Serialize next-book creation for this village/FY.
    --
    -- Prevent two admin sessions from calculating the same
    -- next book/range concurrently.
    -- --------------------------------------------------------

    perform pg_advisory_xact_lock(
        hashtext(p_village_id::text),
        hashtext(p_financial_year)
    );


    -- --------------------------------------------------------
    -- Determine next book number.
    --
    -- Book numbering is sequential per village/FY.
    -- Existing Book 001 -> next Book 002.
    -- --------------------------------------------------------

    select
        coalesce(max(b.book_number), 0) + 1
    into
        v_next_book_number
    from public.offline_receipt_books b
    where b.village_id = p_village_id
      and b.financial_year = p_financial_year;


    -- --------------------------------------------------------
    -- Determine next serial range.
    --
    -- Receipt serials must continue globally within the same
    -- village/FY because receipt_number is based on the serial
    -- and serial ranges must not overlap.
    --
    -- Existing 1-500 -> next 501-1000.
    -- --------------------------------------------------------

    select
        coalesce(max(r.serial_number), 0) + 1
    into
        v_start_serial
    from public.offline_receipts r
    join public.offline_receipt_books b
      on b.id = r.book_id
    where r.village_id = p_village_id
      and b.financial_year = p_financial_year;


    v_end_serial :=
        v_start_serial + 499;


    -- --------------------------------------------------------
    -- Defensive continuity check.
    --
    -- For an existing FY, next book must follow the previous
    -- highest configured end_serial exactly.
    -- --------------------------------------------------------

    if exists (
        select 1
        from public.offline_receipt_books b
        where b.village_id = p_village_id
          and b.financial_year = p_financial_year
    ) then

        if v_start_serial <> (
            select
                max(b.end_serial) + 1
            from public.offline_receipt_books b
            where b.village_id = p_village_id
              and b.financial_year = p_financial_year
        ) then
            raise exception
                'Offline receipt serial history is not contiguous. Next book creation was blocked.';
        end if;

    end if;


    -- --------------------------------------------------------
    -- Delegate actual reservation to the existing frozen RPC.
    --
    -- That RPC already provides:
    --   * admin authorization
    --   * input validation
    --   * max 500 receipts
    --   * overlap protection
    --   * receipt-number generation
    --   * Book + receipt inserts in one transaction
    -- --------------------------------------------------------

    v_book_id :=
        public.reserve_offline_receipt_book(
            p_village_id,
            v_next_book_number,
            p_financial_year,
            v_start_serial,
            v_end_serial,
            nullif(trim(p_description), '')
        );


    -- --------------------------------------------------------
    -- Return authoritative created-book information.
    -- --------------------------------------------------------

    return query
    select
        b.id,
        b.book_number,
        b.financial_year,
        b.start_serial,
        b.end_serial,
        b.quantity
    from public.offline_receipt_books b
    where b.id = v_book_id;

end;
$$;



-- ============================================================
-- PHASE 3D1.19B.1
-- READ-ONLY NEXT OFFLINE RECEIPT BOOK PREVIEW
--
-- IMPORTANT
--   This function DOES NOT create a book.
--   It performs no INSERT / UPDATE / DELETE.
--
--   It returns the authoritative next:
--     * book number
--     * financial year
--     * start serial
--     * end serial
--     * quantity
--
--   The browser must display these server-derived values
--   rather than calculate authoritative numbering itself.
-- ============================================================

create or replace function public.preview_next_offline_receipt_book(
    p_village_id uuid,
    p_financial_year text
)
returns table (
    book_number integer,
    financial_year text,
    start_serial integer,
    end_serial integer,
    quantity integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_next_book_number integer;
    v_start_serial integer;
    v_end_serial integer;
begin

    -- --------------------------------------------------------
    -- Authorization
    -- --------------------------------------------------------

    if not public.is_village_admin(p_village_id) then
        raise exception
            'You are not authorized to manage receipts for this village.';
    end if;


    -- --------------------------------------------------------
    -- Validate financial year
    -- --------------------------------------------------------

    if p_financial_year is null
       or p_financial_year !~ '^[0-9]{4}-[0-9]{2}$'
    then
        raise exception
            'Financial year must use YYYY-YY format.';
    end if;


    -- --------------------------------------------------------
    -- Use the same village/FY transaction lock key as creation.
    --
    -- Preview remains read-only. The lock only serializes the
    -- calculation against concurrent create-next-book calls.
    -- --------------------------------------------------------

    perform pg_advisory_xact_lock(
        hashtext(p_village_id::text),
        hashtext(p_financial_year)
    );


    -- --------------------------------------------------------
    -- Calculate authoritative next book number.
    -- --------------------------------------------------------

    select
        coalesce(max(b.book_number), 0) + 1
    into
        v_next_book_number
    from public.offline_receipt_books b
    where b.village_id = p_village_id
      and b.financial_year = p_financial_year;


    -- --------------------------------------------------------
    -- Calculate authoritative next serial.
    -- --------------------------------------------------------

    select
        coalesce(max(r.serial_number), 0) + 1
    into
        v_start_serial
    from public.offline_receipts r
    join public.offline_receipt_books b
      on b.id = r.book_id
    where r.village_id = p_village_id
      and b.financial_year = p_financial_year;


    v_end_serial :=
        v_start_serial + 499;


    -- --------------------------------------------------------
    -- Defensive continuity check.
    -- --------------------------------------------------------

    if exists (
        select 1
        from public.offline_receipt_books b
        where b.village_id = p_village_id
          and b.financial_year = p_financial_year
    ) then

        if v_start_serial <> (
            select
                max(b.end_serial) + 1
            from public.offline_receipt_books b
            where b.village_id = p_village_id
              and b.financial_year = p_financial_year
        ) then
            raise exception
                'Offline receipt serial history is not contiguous. Next book preview was blocked.';
        end if;

    end if;


    -- --------------------------------------------------------
    -- Return preview only.
    -- No receipt-book or receipt row is written.
    -- --------------------------------------------------------

    return query
    select
        v_next_book_number,
        p_financial_year,
        v_start_serial,
        v_end_serial,
        500;

end;
$$;

-- ============================================================
-- SECURITY
-- ============================================================

revoke all
on function public.create_next_offline_receipt_book(
    uuid,
    text,
    text
)
from public;


grant execute
on function public.create_next_offline_receipt_book(
    uuid,
    text,
    text
)
to authenticated;



-- ------------------------------------------------------------
-- Preview RPC security
-- ------------------------------------------------------------

revoke all
on function public.preview_next_offline_receipt_book(
    uuid,
    text
)
from public;


grant execute
on function public.preview_next_offline_receipt_book(
    uuid,
    text
)
to authenticated;

-- ============================================================
-- PHASE 3D1.19B END
--
-- IMPORTANT:
--   Defining this function DOES NOT create another receipt book.
--   A book is created only when an authorized admin explicitly
--   invokes create_next_offline_receipt_book(...).
-- ============================================================