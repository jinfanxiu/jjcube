alter table public.profiles
    add column nickname text;

create or replace function public.handle_new_user()
    returns trigger
    language plpgsql
    security definer set search_path = public
as $$
begin
insert into public.profiles (id, email, nickname, role, is_approved)
values (new.id, new.email, new.raw_user_meta_data ->> 'name', 'member', false);
return new;
end;
$$;