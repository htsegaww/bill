create extension if not exists "pgcrypto";

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_currency text not null default 'USD',
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'manager', 'member')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (household_id, user_id)
);

create table if not exists public.bill_accounts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  provider text,
  category text,
  amount_due numeric(12,2) default 0,
  next_due_on date,
  autopay boolean not null default false,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.bill_payments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  bill_account_id uuid not null references public.bill_accounts (id) on delete cascade,
  amount_paid numeric(12,2) not null,
  paid_on date not null default current_date,
  status text not null default 'paid' check (status in ('paid', 'pending', 'failed')),
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.spending_transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  merchant text not null,
  category text,
  amount numeric(12,2) not null,
  spent_at timestamptz not null default timezone('utc', now()),
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.handle_updated_at();

create trigger households_set_updated_at
before update on public.households
for each row
execute function public.handle_updated_at();

create trigger bill_accounts_set_updated_at
before update on public.bill_accounts
for each row
execute function public.handle_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

create or replace function public.is_household_member(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members
    where household_id = target_household_id
      and user_id = auth.uid()
  );
$$;

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.bill_accounts enable row level security;
alter table public.bill_payments enable row level security;
alter table public.spending_transactions enable row level security;

create policy "profiles are readable by owner"
on public.profiles
for select
using (auth.uid() = id);

create policy "profiles are updatable by owner"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "households readable by members"
on public.households
for select
using (public.is_household_member(id));

create policy "households insert by authenticated users"
on public.households
for insert
with check (auth.uid() = created_by);

create policy "households update by owners and managers"
on public.households
for update
using (
  exists (
    select 1
    from public.household_members
    where household_id = households.id
      and user_id = auth.uid()
      and role in ('owner', 'manager')
  )
)
with check (
  exists (
    select 1
    from public.household_members
    where household_id = households.id
      and user_id = auth.uid()
      and role in ('owner', 'manager')
  )
);

create policy "members readable by household members"
on public.household_members
for select
using (public.is_household_member(household_id));

create policy "members insert by owners and managers"
on public.household_members
for insert
with check (
  exists (
    select 1
    from public.household_members existing_member
    where existing_member.household_id = household_members.household_id
      and existing_member.user_id = auth.uid()
      and existing_member.role in ('owner', 'manager')
  )
);

create policy "bill accounts readable by members"
on public.bill_accounts
for select
using (public.is_household_member(household_id));

create policy "bill accounts writable by owners and managers"
on public.bill_accounts
for all
using (
  exists (
    select 1
    from public.household_members
    where household_id = bill_accounts.household_id
      and user_id = auth.uid()
      and role in ('owner', 'manager')
  )
)
with check (
  exists (
    select 1
    from public.household_members
    where household_id = bill_accounts.household_id
      and user_id = auth.uid()
      and role in ('owner', 'manager')
  )
);

create policy "bill payments readable by members"
on public.bill_payments
for select
using (public.is_household_member(household_id));

create policy "bill payments writable by owners and managers"
on public.bill_payments
for all
using (
  exists (
    select 1
    from public.household_members
    where household_id = bill_payments.household_id
      and user_id = auth.uid()
      and role in ('owner', 'manager')
  )
)
with check (
  exists (
    select 1
    from public.household_members
    where household_id = bill_payments.household_id
      and user_id = auth.uid()
      and role in ('owner', 'manager')
  )
);

create policy "transactions readable by members"
on public.spending_transactions
for select
using (public.is_household_member(household_id));

create policy "transactions writable by household members"
on public.spending_transactions
for insert
with check (
  public.is_household_member(household_id)
  and auth.uid() = user_id
);

create policy "transactions update by owner of row"
on public.spending_transactions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);