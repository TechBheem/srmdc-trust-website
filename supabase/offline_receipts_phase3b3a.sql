-- ============================================================
-- SRMDC OFFLINE RECEIPTS
-- PHASE 3B3A
--
-- Secure transition:
-- RESERVED -> ISSUED
--
-- IMPORTANT:
-- This RPC records the physical/manual receipt only.
-- It does NOT post to any accounting ledger.
-- ============================================================

create or replace function public.issue_offline_receipt(
    p_receipt_id uuid,
    p_honorific text,
    p_donor_name text,
    p_pan_number text,
    p_address text,
    p_mobile_number text,
    p_receipt_date date,
    p_fund_type text,
    p_purpose text,
    p_payment_mode text,
    p_amount numeric,
    p_amount_in_words text,
    p_reference_number text,
    p_remarks text,
    p_received_by_name text,
    p_authorized_signatory_name text
)
returns public.offline_receipts
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_receipt public.offline_receipts%rowtype;
begin

    -- --------------------------------------------------------
    -- Find and lock the receipt.
    -- Prevents two admins issuing the same receipt at once.
    -- --------------------------------------------------------

    select *
    into v_receipt
    from public.offline_receipts
    where id = p_receipt_id
    for update;

    if not found then
        raise exception
            'Offline receipt was not found.';
    end if;


    -- --------------------------------------------------------
    -- Authorization
    -- --------------------------------------------------------

    if not public.is_village_admin(v_receipt.village_id) then
        raise exception
            'You are not authorized to manage receipts for this village.';
    end if;


    -- --------------------------------------------------------
    -- Lifecycle protection
    -- --------------------------------------------------------

    if v_receipt.status <> 'reserved' then
        raise exception
            'Receipt % cannot be issued because its current status is %.',
            v_receipt.receipt_number,
            v_receipt.status;
    end if;


    -- --------------------------------------------------------
    -- Required receipt information
    -- --------------------------------------------------------

    if nullif(btrim(p_donor_name), '') is null then
        raise exception
            'Donor name is required.';
    end if;

    if p_receipt_date is null then
        raise exception
            'Receipt date is required.';
    end if;

    if p_amount is null or p_amount <= 0 then
        raise exception
            'Receipt amount must be greater than zero.';
    end if;

    if nullif(btrim(p_received_by_name), '') is null then
        raise exception
            'Received By name is required.';
    end if;


    -- --------------------------------------------------------
    -- Honorific validation
    -- --------------------------------------------------------

    if p_honorific is not null
       and nullif(btrim(p_honorific), '') is not null
       and btrim(p_honorific) not in ('Sri', 'Srimathi')
    then
        raise exception
            'Honorific must be Sri or Srimathi.';
    end if;


    -- --------------------------------------------------------
    -- Payment mode validation
    -- Must match Phase 3A table constraint.
    -- --------------------------------------------------------

    if p_payment_mode is not null
       and nullif(btrim(p_payment_mode), '') is not null
       and btrim(p_payment_mode) not in (
           'Cash',
           'UPI',
           'Bank Transfer',
           'Cheque',
           'Other'
       )
    then
        raise exception
            'Invalid payment mode.';
    end if;


    -- --------------------------------------------------------
    -- ISSUE RECEIPT
    --
    -- Deliberately NOT setting:
    -- linked_record_type
    -- linked_record_id
    --
    -- Accounting linkage is a separate controlled phase.
    -- --------------------------------------------------------

    update public.offline_receipts
    set
        status =
            'issued',

        honorific =
            nullif(btrim(p_honorific), ''),

        donor_name =
            btrim(p_donor_name),

        pan_number =
            nullif(upper(btrim(p_pan_number)), ''),

        address =
            nullif(btrim(p_address), ''),

        mobile_number =
            nullif(btrim(p_mobile_number), ''),

        receipt_date =
            p_receipt_date,

        fund_type =
            nullif(btrim(p_fund_type), ''),

        purpose =
            nullif(btrim(p_purpose), ''),

        payment_mode =
            nullif(btrim(p_payment_mode), ''),

        amount =
            p_amount,

        amount_in_words =
            nullif(btrim(p_amount_in_words), ''),

        reference_number =
            nullif(btrim(p_reference_number), ''),

        remarks =
            nullif(btrim(p_remarks), ''),

        received_by_name =
            btrim(p_received_by_name),

        received_by_user_id =
            auth.uid(),

        authorized_signatory_name =
            nullif(
                btrim(p_authorized_signatory_name),
                ''
            ),

        issued_by =
            auth.uid(),

        issued_at =
            now()

    where id = v_receipt.id

    returning *
    into v_receipt;


    return v_receipt;

end;
$$;


-- ============================================================
-- PERMISSIONS
-- ============================================================

revoke all
on function public.issue_offline_receipt(
    uuid,
    text,
    text,
    text,
    text,
    text,
    date,
    text,
    text,
    text,
    numeric,
    text,
    text,
    text,
    text,
    text
)
from public;


grant execute
on function public.issue_offline_receipt(
    uuid,
    text,
    text,
    text,
    text,
    text,
    date,
    text,
    text,
    text,
    numeric,
    text,
    text,
    text,
    text,
    text
)
to authenticated;


comment on function public.issue_offline_receipt(
    uuid,
    text,
    text,
    text,
    text,
    text,
    date,
    text,
    text,
    text,
    numeric,
    text,
    text,
    text,
    text,
    text
)
is
'Issues one previously RESERVED SRMDC offline receipt. Does not post to Village Donation, Temple Fund or other accounting ledgers.';