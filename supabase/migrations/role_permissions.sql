-- Role permissions table: controls which modules each role can access
create table if not exists public.role_permissions (
  id uuid default gen_random_uuid() primary key,
  role text not null check (role in ('admin', 'manager', 'staff')),
  module_key text not null,
  enabled boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(role, module_key)
);

-- User permission overrides: per-user module access (overrides role default)
create table if not exists public.user_module_permissions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  module_key text not null,
  enabled boolean not null default true,
  created_at timestamptz default now(),
  unique(user_id, module_key)
);

-- RLS policies
alter table public.role_permissions enable row level security;
alter table public.user_module_permissions enable row level security;

create policy "Admins can manage role_permissions" on public.role_permissions
  for all using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

create policy "All authenticated can read role_permissions" on public.role_permissions
  for select using (auth.uid() is not null);

create policy "Admins can manage user_module_permissions" on public.user_module_permissions
  for all using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

create policy "Users can read own permissions" on public.user_module_permissions
  for select using (user_id = auth.uid());
