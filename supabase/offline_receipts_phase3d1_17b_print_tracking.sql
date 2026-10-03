-- ============================================================
-- SRMDC - PHASE 3D1.17B
-- OFFLINE RECEIPT PRINT / EXPORT TRACKING
-- ============================================================

-- Physical printing is separate from:
-- RESERVED / ISSUED / VOID.

create table if not exists public.offline_receipt_print_batches (
    id uuid primary key default gen_random_uuid(),

    village_id uuid not null
        references public.villages(id)
        on delete restrict,

    book_id uuid not null
        references public.offline_receipt_books(id)
        on delete restrict,

    from_serial integer not null,
    to_serial integer not null,
    receipt_count integer not null,

    batch_type text not null default 'ORIGINAL'
        check (batch_type in ('ORIGINAL', 'REPRINT')),

    reason text,

    exported_at timestamptz not null default now(),
    exported_by uuid default auth.uid(),
    created_at timestamptz not null default now(),

    constraint offline_receipt_print_batch_serial_check
        check (
            from_serial > 0
            and to_serial >= from_serial
        ),

    constraint offline_receipt_print_batch_count_check
        check (
            receipt_count = (to_serial - from_serial + 1)
        )
);

create index if not exists
    offline_receipt_print_batches_book_idx
on public.offline_receipt_print_batches (
    book_id,
    exported_at desc
);


create table if not exists public.offline_receipt_print_items (
    id uuid primary key default gen_random_uuid(),

    print_batch_id uuid not null
        references public.offline_receipt_print_batches(id)
        on delete restrict,

    offline_receipt_id uuid not null
        references public.offline_receipts(id)
        on delete restrict,

    printed_at timestamptz not null default now(),
    printed_by uuid default auth.uid(),
    created_at timestamptz not null default now(),

    constraint offline_receipt_print_items_batch_receipt_unique
        unique (
            print_batch_id,
            offline_receipt_id
        )
);

create index if not exists
    offline_receipt_print_items_receipt_idx
on public.offline_receipt_print_items (
    offline_receipt_id,
    printed_at desc
);


alter table public.offline_receipt_print_batches
    enable row level security;

alter table public.offline_receipt_print_items
    enable row level security;


drop policy if exists
    offline_receipt_print_batches_admin_select
on public.offline_receipt_print_batches;

create policy
    offline_receipt_print_batches_admin_select
on public.offline_receipt_print_batches
for select
to authenticated
using (
    public.is_village_admin(village_id)
);


drop policy if exists
    offline_receipt_print_items_admin_select
on public.offline_receipt_print_items;

create policy
    offline_receipt_print_items_admin_select
on public.offline_receipt_print_items
for select
to authenticated
using (
    exists (
        select 1
        from public.offline_receipt_print_batches b
        where b.id =
              offline_receipt_print_items.print_batch_id
          and public.is_village_admin(b.village_id)
    )
);


create or replace view public.offline_receipt_print_register
with (security_invoker = true)
as
select
    r.id as offline_receipt_id,
    r.village_id,
    r.book_id,
    b.book_number,
    b.financial_year,
    b.receipt_prefix,
    r.serial_number,
    r.receipt_number,
    r.status as receipt_status,

    count(i.id)::integer as print_count,
    min(i.printed_at) as first_printed_at,
    max(i.printed_at) as last_printed_at,

    case
        when count(i.id) = 0 then 'NOT_PRINTED'
        when count(i.id) = 1 then 'PRINTED'
        else 'REPRINTED'
    end as print_state

from public.offline_receipts r

join public.offline_receipt_books b
    on b.id = r.book_id

left join public.offline_receipt_print_items i
    on i.offline_receipt_id = r.id

group by
    r.id,
    r.village_id,
    r.book_id,
    b.book_number,
    b.financial_year,
    b.receipt_prefix,
    r.serial_number,
    r.receipt_number,
    r.status;


comment on table public.offline_receipt_print_batches is
'Controlled audit record for offline receipt print/export batches.';

comment on table public.offline_receipt_print_items is
'Receipt-level history for offline receipt print/export batches.';

comment on view public.offline_receipt_print_register is
'Shows NOT_PRINTED, PRINTED or REPRINTED separately from RESERVED, ISSUED and VOID.';

-- END PHASE 3D1.17B