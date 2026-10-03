-- ============================================================
-- SRMDC OFFLINE RECEIPTS
-- PHASE 3D1.17D2A
-- CONFIRM ORIGINAL PRINT / EXPORT
--
-- Physical print/export tracking only.
--
-- IMPORTANT:
--   * Does NOT change public.offline_receipts.status.
--   * Does NOT issue a donation receipt.
--   * ORIGINAL export is allowed only when every receipt in the
--     requested range has never been printed/exported before.
--   * Entire operation is atomic.
-- ============================================================

create or replace function public.confirm_offline_receipt_export(
    p_village_id uuid,
    p_book_id uuid,
    p_from_serial integer,
    p_to_serial integer
)
returns public.offline_receipt_print_batches
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_batch public.offline_receipt_print_batches%rowtype;
    v_expected_count integer;
    v_receipt_count integer;
    v_existing_print_count integer;
begin
    -- --------------------------------------------------------
    -- Authentication
    -- --------------------------------------------------------

    if auth.uid() is null then
        raise exception
            'Authentication required.';
    end if;

    -- --------------------------------------------------------
    -- Basic range validation
    -- --------------------------------------------------------

    if p_village_id is null then
        raise exception
            'Village is required.';
    end if;

    if p_book_id is null then
        raise exception
            'Receipt book is required.';
    end if;

    if p_from_serial is null or p_to_serial is null then
        raise exception
            'From and To serial numbers are required.';
    end if;

    if p_from_serial <= 0 then
        raise exception
            'From serial must be greater than zero.';
    end if;

    if p_to_serial < p_from_serial then
        raise exception
            'To serial must be greater than or equal to From serial.';
    end if;

    v_expected_count :=
        p_to_serial - p_from_serial + 1;

    -- --------------------------------------------------------
    -- Village authorization
    -- --------------------------------------------------------

    if not public.is_village_admin(p_village_id) then
        raise exception
            'You are not authorized to manage receipts for this village.';
    end if;

    -- --------------------------------------------------------
    -- Validate book belongs to village.
    -- Lock the book row for the duration of this transaction.
    -- --------------------------------------------------------

    perform 1
    from public.offline_receipt_books b
    where b.id = p_book_id
      and b.village_id = p_village_id
    for update;

    if not found then
        raise exception
            'Receipt book was not found for this village.';
    end if;

    -- --------------------------------------------------------
    -- Lock every selected receipt.
    --
    -- This prevents concurrent ORIGINAL confirmation for the
    -- same physical receipt range.
    -- --------------------------------------------------------

    perform r.id
    from public.offline_receipts r
    where r.village_id = p_village_id
      and r.book_id = p_book_id
      and r.serial_number between p_from_serial and p_to_serial
    order by r.serial_number
    for update;

    -- --------------------------------------------------------
    -- Every serial in the requested range must exist.
    -- --------------------------------------------------------

    select count(*)::integer
    into v_receipt_count
    from public.offline_receipts r
    where r.village_id = p_village_id
      and r.book_id = p_book_id
      and r.serial_number between p_from_serial and p_to_serial;

    if v_receipt_count <> v_expected_count then
        raise exception
            'Not every serial number in the requested range exists. Expected %, found %.',
            v_expected_count,
            v_receipt_count;
    end if;

    -- --------------------------------------------------------
    -- ORIGINAL protection.
    --
    -- Any previous print item means that receipt already had an
    -- ORIGINAL export or controlled REPRINT. It therefore cannot
    -- be confirmed again as a new ORIGINAL.
    -- --------------------------------------------------------

    select count(distinct i.offline_receipt_id)::integer
    into v_existing_print_count
    from public.offline_receipt_print_items i
    join public.offline_receipts r
      on r.id = i.offline_receipt_id
    where r.village_id = p_village_id
      and r.book_id = p_book_id
      and r.serial_number between p_from_serial and p_to_serial;

    if v_existing_print_count > 0 then
        raise exception
            'ORIGINAL export blocked. % selected receipt(s) already have print/export history. Use the controlled Reprint workflow.',
            v_existing_print_count;
    end if;

    -- --------------------------------------------------------
    -- Create ORIGINAL batch.
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
        'ORIGINAL',
        null,
        now(),
        auth.uid()
    )
    returning *
    into v_batch;

    -- --------------------------------------------------------
    -- Create one physical print-history item per receipt.
    --
    -- IMPORTANT:
    -- No update is made to public.offline_receipts.status.
    -- RESERVED / ISSUED / VOID lifecycle remains unchanged.
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
        v_batch.exported_at,
        auth.uid()
    from public.offline_receipts r
    where r.village_id = p_village_id
      and r.book_id = p_book_id
      and r.serial_number between p_from_serial and p_to_serial
    order by r.serial_number;

    return v_batch;
end;
$$;


-- ============================================================
-- RPC PERMISSIONS
-- ============================================================

revoke all
on function public.confirm_offline_receipt_export(
    uuid,
    uuid,
    integer,
    integer
)
from public;

grant execute
on function public.confirm_offline_receipt_export(
    uuid,
    uuid,
    integer,
    integer
)
to authenticated;


comment on function public.confirm_offline_receipt_export(
    uuid,
    uuid,
    integer,
    integer
) is
'Atomically confirms an ORIGINAL physical print/export batch for a controlled offline receipt range. Does not change receipt financial lifecycle status.';

-- END PHASE 3D1.17D2A