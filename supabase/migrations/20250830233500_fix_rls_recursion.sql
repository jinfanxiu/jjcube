create or replace function public.get_my_role()
returns text
language sql
security definer
set search_path = public
as $$
select role::text from public.profiles where id = auth.uid();
$$;

drop policy "Admins can view all profiles." on public.profiles;
drop policy "Admins can update profiles." on public.profiles;

create policy "Admins can view all profiles."
  on public.profiles for select
                                              using ( public.get_my_role() = 'admin' );

create policy "Admins can update profiles."
  on public.profiles for update
                                    using ( public.get_my_role() = 'admin' );