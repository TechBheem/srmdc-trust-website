-- ============================================================
-- MANA BODABANDA / REUSABLE VILLAGE PORTAL
-- Database Foundation V1
-- ============================================================

begin;

create extension if not exists pgcrypto;

-- ============================================================
-- VILLAGES
-- ============================================================

create table if not exists public.villages (
    id uuid primary key default gen_random_uuid(),

    slug text not null unique,
    name text not null,
    name_telugu text,

    portal_title text,
    portal_subtitle text,

    district text,
    state text default 'Andhra Pradesh',

    entrance_background_url text,

    is_active boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- ============================================================
-- VILLAGE ADMIN MEMBERSHIP
-- ============================================================

create table if not exists public.village_admins (
    id uuid primary key default gen_random_uuid(),

    village_id uuid not null
        references public.villages(id)
        on delete cascade,

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    role text not null default 'village_admin'
        check (
            role in (
                'super_admin',
                'village_admin'
            )
        ),

    is_active boolean not null default true,

    created_at timestamptz not null default now(),

    unique(village_id, user_id)
);


-- ============================================================
-- VILLAGE SETTINGS
-- ============================================================

create table if not exists public.village_settings (
    village_id uuid primary key
        references public.villages(id)
        on delete cascade,

    -- Never store a plain-text village PIN here.
    pin_hash text,

    currency_code text not null default 'INR',

    interest_rate_monthly numeric(8,4)
        not null default 1.5000,

    updated_at timestamptz not null default now()
);


-- ============================================================
-- ACTIVITIES
-- ============================================================

create table if not exists public.village_activities (
    id uuid primary key default gen_random_uuid(),

    village_id uuid not null
        references public.villages(id)
        on delete cascade,

    name text not null,
    name_telugu text,

    activity_date date,

    description text,

    status text not null default 'active'
        check (
            status in (
                'planned',
                'active',
                'completed',
                'cancelled'
            )
        ),

    is_published boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- ============================================================
-- ACTIVITY FUNDS RECEIVED
-- ============================================================

create table if not exists public.village_activity_funds (
    id uuid primary key default gen_random_uuid(),

    village_id uuid not null
        references public.villages(id)
        on delete cascade,

    activity_id uuid not null
        references public.village_activities(id)
        on delete cascade,

    contributor_name text not null,

    received_date date,

    amount numeric(14,2) not null
        check (amount >= 0),

    payment_mode text,
    reference_number text,
    notes text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- ============================================================
-- ACTIVITY / VILLAGE EXPENSES
-- ============================================================

create table if not exists public.village_expenses (
    id uuid primary key default gen_random_uuid(),

    village_id uuid not null
        references public.villages(id)
        on delete cascade,

    activity_id uuid
        references public.village_activities(id)
        on delete set null,

    expense_date date,

    paid_to text,
    purpose text not null,

    expense_amount numeric(14,2) not null
        check (expense_amount >= 0),

    amount_paid numeric(14,2) not null default 0
        check (amount_paid >= 0),

    payment_mode text,

    status text not null default 'pending'
        check (
            status in (
                'pending',
                'part_paid',
                'paid',
                'cancelled'
            )
        ),

    bill_url text,
    notes text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- ============================================================
-- DONOR COMMITMENTS
-- ============================================================

create table if not exists public.village_commitments (
    id uuid primary key default gen_random_uuid(),

    village_id uuid not null
        references public.villages(id)
        on delete cascade,

    activity_id uuid
        references public.village_activities(id)
        on delete set null,

    donor_name text not null,
    residence text,

    commitment_date date,

    committed_amount numeric(14,2) not null
        check (committed_amount >= 0),

    expected_payment_date date,

    notes text,

    is_cancelled boolean not null default false,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- ============================================================
-- COMMITMENT PAYMENTS
-- ============================================================

create table if not exists public.village_commitment_payments (
    id uuid primary key default gen_random_uuid(),

    village_id uuid not null
        references public.villages(id)
        on delete cascade,

    commitment_id uuid not null
        references public.village_commitments(id)
        on delete cascade,

    payment_date date not null,

    amount numeric(14,2) not null
        check (amount > 0),

    payment_mode text,
    reference_number text,
    receipt_number text,
    notes text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- ============================================================
-- TEMPLE FUND ACCOUNTS
-- ============================================================

create table if not exists public.temple_fund_accounts (
    id uuid primary key default gen_random_uuid(),

    village_id uuid not null
        references public.villages(id)
        on delete cascade,

    person_name text not null,

    relation_details text,
    residence text,

    taken_date date,

    principal_amount numeric(14,2) not null
        check (principal_amount >= 0),

    monthly_interest_rate numeric(8,4)
        not null default 1.5000,
    status text not null default 'active'
        check (
            status in (
                'active',
                'part_paid',
                'closed',
                'transferred',
                'cancelled'
            )
        ),

    notes text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- ============================================================
-- TEMPLE FUND TRANSACTIONS
-- ============================================================

create table if not exists public.temple_fund_transactions (
    id uuid primary key default gen_random_uuid(),

    village_id uuid not null
        references public.villages(id)
        on delete cascade,

    account_id uuid
        references public.temple_fund_accounts(id)
        on delete set null,

    transaction_date date not null,

    transaction_type text not null
        check (
            transaction_type in (
                'opening_balance',
                'deposit',
                'principal_given',
                'principal_repayment',
                'interest_received',
                'expense',
                'adjustment'
            )
        ),

    amount numeric(14,2) not null
        check (amount >= 0),

    paid_to_or_from text,

    payment_mode text,
    reference_number text,
    document_url text,
    notes text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- ============================================================
-- DOCUMENTS
-- ============================================================

create table if not exists public.village_documents (
    id uuid primary key default gen_random_uuid(),

    village_id uuid not null
        references public.villages(id)
        on delete cascade,

    title text not null,
    category text,

    document_date date,

    description text,

    file_url text not null,

    is_published boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- ============================================================
-- EVENT-WISE GALLERY
-- ============================================================

create table if not exists public.village_gallery_events (
    id uuid primary key default gen_random_uuid(),

    village_id uuid not null
        references public.villages(id)
        on delete cascade,

    title text not null,
    title_telugu text,

    event_date date,

    description text,

    cover_media_url text,

    display_order integer not null default 0,

    is_published boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- ============================================================
-- PHOTOS + VIDEOS
-- ============================================================

create table if not exists public.village_gallery_media (
    id uuid primary key default gen_random_uuid(),

    village_id uuid not null
        references public.villages(id)
        on delete cascade,

    event_id uuid not null
        references public.village_gallery_events(id)
        on delete cascade,

    media_type text not null
        check (
            media_type in (
                'photo',
                'video'
            )
        ),

    media_url text not null,

    thumbnail_url text,

    title text,
    caption text,

    display_order integer not null default 0,

    is_cover boolean not null default false,

    use_as_entrance_background boolean
        not null default false,

    is_published boolean not null default true,

    created_at timestamptz not null default now()
);


-- ============================================================
-- AUDIT LOG
-- ============================================================

create table if not exists public.village_audit_log (
    id bigint generated by default as identity primary key,

    village_id uuid
        references public.villages(id)
        on delete set null,

    user_id uuid
        references auth.users(id)
        on delete set null,

    action text not null,
    table_name text,
    record_id text,

    old_data jsonb,
    new_data jsonb,

    created_at timestamptz not null default now()
);


-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_village_admins_user
    on public.village_admins(user_id);

create index if not exists idx_village_activities_village
    on public.village_activities(village_id);

create index if not exists idx_village_commitments_village
    on public.village_commitments(village_id);

create index if not exists idx_village_expenses_village
    on public.village_expenses(village_id);

create index if not exists idx_temple_accounts_village
    on public.temple_fund_accounts(village_id);

create index if not exists idx_gallery_events_village
    on public.village_gallery_events(village_id);

create index if not exists idx_gallery_media_event
    on public.village_gallery_media(event_id);


-- ============================================================
-- SECURITY HELPER FUNCTIONS
-- ============================================================

create or replace function public.is_srmdc_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.admin_profiles ap
        where ap.user_id = auth.uid()
          and ap.is_active = true
          and lower(coalesce(ap.role, '')) in (
              'super_admin',
              'super admin'
          )
    );
$$;


create or replace function public.is_village_admin(
    requested_village_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select
        public.is_srmdc_super_admin()
        or exists (
            select 1
            from public.village_admins va
            where va.user_id = auth.uid()
              and va.village_id = requested_village_id
              and va.is_active = true
              and va.role in (
                  'super_admin',
                  'village_admin'
              )
        );
$$;


-- ============================================================
-- ENABLE RLS
-- ============================================================

alter table public.villages enable row level security;
alter table public.village_admins enable row level security;
alter table public.village_settings enable row level security;
alter table public.village_activities enable row level security;
alter table public.village_activity_funds enable row level security;
alter table public.village_expenses enable row level security;
alter table public.village_commitments enable row level security;
alter table public.village_commitment_payments enable row level security;
alter table public.temple_fund_accounts enable row level security;
alter table public.temple_fund_transactions enable row level security;
alter table public.village_documents enable row level security;
alter table public.village_gallery_events enable row level security;
alter table public.village_gallery_media enable row level security;
alter table public.village_audit_log enable row level security;


-- ============================================================
-- ADMIN POLICIES
-- V1: authenticated village admins manage assigned village.
-- Public/villager read policies will be added with secure PIN
-- access rather than exposing financial tables anonymously.
-- ============================================================

create policy "village admins read villages"
on public.villages
for select
to authenticated
using (
    public.is_srmdc_super_admin()
    or public.is_village_admin(id)
);


create policy "super admins manage villages"
on public.villages
for all
to authenticated
using (
    public.is_srmdc_super_admin()
)
with check (
    public.is_srmdc_super_admin()
);


create policy "village admins read memberships"
on public.village_admins
for select
to authenticated
using (
    public.is_srmdc_super_admin()
    or public.is_village_admin(village_id)
);


create policy "super admins manage memberships"
on public.village_admins
for all
to authenticated
using (
    public.is_srmdc_super_admin()
)
with check (
    public.is_srmdc_super_admin()
);


-- Generic assigned-village policies.

create policy "admins manage village settings"
on public.village_settings
for all
to authenticated
using (
    public.is_village_admin(village_id)
)
with check (
    public.is_village_admin(village_id)
);


create policy "admins manage activities"
on public.village_activities
for all
to authenticated
using (
    public.is_village_admin(village_id)
)
with check (
    public.is_village_admin(village_id)
);


create policy "admins manage activity funds"
on public.village_activity_funds
for all
to authenticated
using (
    public.is_village_admin(village_id)
)
with check (
    public.is_village_admin(village_id)
);


create policy "admins manage expenses"
on public.village_expenses
for all
to authenticated
using (
    public.is_village_admin(village_id)
)
with check (
    public.is_village_admin(village_id)
);


create policy "admins manage commitments"
on public.village_commitments
for all
to authenticated
using (
    public.is_village_admin(village_id)
)
with check (
    public.is_village_admin(village_id)
);


create policy "admins manage commitment payments"
on public.village_commitment_payments
for all
to authenticated
using (
    public.is_village_admin(village_id)
)
with check (
    public.is_village_admin(village_id)
);


create policy "admins manage temple accounts"
on public.temple_fund_accounts
for all
to authenticated
using (
    public.is_village_admin(village_id)
)
with check (
    public.is_village_admin(village_id)
);


create policy "admins manage temple transactions"
on public.temple_fund_transactions
for all
to authenticated
using (
    public.is_village_admin(village_id)
)
with check (
    public.is_village_admin(village_id)
);


create policy "admins manage documents"
on public.village_documents
for all
to authenticated
using (
    public.is_village_admin(village_id)
)
with check (
    public.is_village_admin(village_id)
);


create policy "admins manage gallery events"
on public.village_gallery_events
for all
to authenticated
using (
    public.is_village_admin(village_id)
)
with check (
    public.is_village_admin(village_id)
);


create policy "admins manage gallery media"
on public.village_gallery_media
for all
to authenticated
using (
    public.is_village_admin(village_id)
)
with check (
    public.is_village_admin(village_id)
);


create policy "admins read audit log"
on public.village_audit_log
for select
to authenticated
using (
    public.is_village_admin(village_id)
);


-- ============================================================
-- INITIAL VILLAGE
-- ============================================================

insert into public.villages (
    slug,
    name,
    name_telugu,
    portal_title,
    portal_subtitle,
    district,
    state
)
values (
    'bodabanda',
    'Bodabanda',
    U&'\0C2C\0C4B\0C21\0C2C\0C02\0C21',
    U&'\0C2E\0C28 \0C2C\0C4B\0C21\0C2C\0C02\0C21',
    U&'\0C2C\0C4B\0C21\0C2C\0C02\0C21 \0C17\0C4D\0C30\0C3E\0C2E \0C38\0C2E\0C3E\0C1A\0C3E\0C30 \0C35\0C47\0C26\0C3F\0C15',
    null,
    'Andhra Pradesh'
)
on conflict (slug)
do update set
    name = excluded.name,
    name_telugu = excluded.name_telugu,
    portal_title = excluded.portal_title,
    portal_subtitle = excluded.portal_subtitle;


insert into public.village_settings (
    village_id,
    interest_rate_monthly
)
select
    id,
    1.5000
from public.villages
where slug = 'bodabanda'
on conflict (village_id)
do nothing;


commit;
-- ============================================================
-- AUTHENTICATED ROLE TABLE PRIVILEGES
-- RLS STILL CONTROLS WHICH ROWS EACH ADMIN MAY ACCESS.
-- ============================================================

grant usage on schema public to authenticated;

grant select, insert, update, delete
on table
    public.villages,
    public.village_admins,
    public.village_settings,
    public.village_activities,
    public.village_activity_funds,
    public.village_expenses,
    public.village_commitments,
    public.village_commitment_payments,
    public.temple_fund_accounts,
    public.temple_fund_transactions,
    public.village_documents,
    public.village_gallery_events,
    public.village_gallery_media
to authenticated;

grant select
on table public.village_audit_log
to authenticated;
