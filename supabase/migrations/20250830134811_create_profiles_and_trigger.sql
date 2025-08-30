-- 1. Create a custom type for user roles for data integrity
create type public.user_role as enum ('admin', 'member');

-- 2. Create the profiles table
create table public.profiles (
                                 id uuid primary key references auth.users(id) on delete cascade,
                                 email text,
                                 role public.user_role not null default 'member',
                                 is_approved boolean not null default false,
                                 created_at timestamp with time zone not null default now()
);

-- 3. Enable Row Level Security for the profiles table
alter table public.profiles enable row level security;

-- 4. Create a policy that allows users to see their own profile
create policy "Users can view their own profile."
  on public.profiles for select
                                    using ( auth.uid() = id );

-- 5. Create a policy that allows admins to view all profiles
create policy "Admins can view all profiles."
  on public.profiles for select
                                    using ( (select role from public.profiles where id = auth.uid()) = 'admin' );

-- 6. Create a policy that allows admins to update profiles
create policy "Admins can update profiles."
  on public.profiles for update
                                    using ( (select role from public.profiles where id = auth.uid()) = 'admin' );

-- 7. Create the function that handles new user creation
create function public.handle_new_user()
    returns trigger
    language plpgsql
security definer set search_path = public
as $$
begin
insert into public.profiles (id, email, role, is_approved)
values (new.id, new.email, 'member', false);
return new;
end;
$$;

-- 8. Create the trigger that calls the function on new user signup
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();