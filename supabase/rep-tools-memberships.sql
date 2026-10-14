create table if not exists public.rep_tools_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  status text not null default 'pending_payment',
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rep_tools_memberships enable row level security;

create policy "users can read own membership"
on public.rep_tools_memberships
for select
to authenticated
using (auth.uid() = user_id);
