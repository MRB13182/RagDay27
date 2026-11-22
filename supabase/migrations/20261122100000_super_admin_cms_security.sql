-- Super Admin authentication, CMS write authorization, and cross-device Gallery persistence.
-- Raw passcodes are NEVER committed in migrations; set/rotate via service_role:
--   select public.set_super_admin_passcode('your-strong-passcode');

create extension if not exists pgcrypto;
create schema if not exists private;

-- 1. Private Super Admin credential store (bcrypt-hashed via pgcrypto)
create table if not exists private.super_admin_credentials (
  id boolean primary key default true check (id = true),
  passcode_hash text not null,
  updated_at timestamptz not null default now()
);

revoke all on schema private from public, anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;

create or replace function private.is_valid_super_admin(p_passcode text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clean text := btrim(coalesce(p_passcode, ''));
  v_hash text;
  v_role text;
begin
  if v_clean = '' then
    return false;
  end if;

  -- Check dedicated Super Admin credential store
  select c.passcode_hash
    into v_hash
    from private.super_admin_credentials c
   where c.id = true;

  if v_hash is not null and extensions.crypt(v_clean, v_hash) = v_hash then
    return true;
  end if;

  -- Also support verify_admin_passcode if a super_admin role entry exists there
  begin
    select (public.verify_admin_passcode(v_clean)->>'role')
      into v_role;
    if v_role = 'super_admin' then
      return true;
    end if;
  exception when undefined_function or others then
    null;
  end;

  return false;
end;
$$;

create or replace function public.set_super_admin_passcode(p_new_passcode text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clean text := btrim(coalesce(p_new_passcode, ''));
begin
  if length(v_clean) < 6 then
    raise exception 'Super Admin passcode must be at least 6 characters.';
  end if;

  insert into private.super_admin_credentials (id, passcode_hash, updated_at)
  values (true, extensions.crypt(v_clean, extensions.gen_salt('bf', 10)), now())
  on conflict (id) do update
    set passcode_hash = excluded.passcode_hash,
        updated_at = now();
end;
$$;

revoke all on function public.set_super_admin_passcode(text) from public, anon, authenticated;
grant execute on function public.set_super_admin_passcode(text) to service_role;

create or replace function public.verify_super_admin_passcode(p_passcode text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_valid_super_admin(p_passcode) then
    raise exception 'Invalid Super Admin passcode' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'authorized', true,
    'role', 'super_admin'
  );
end;
$$;

grant execute on function public.verify_super_admin_passcode(text) to anon, authenticated, service_role;

-- 2. Lock down site_settings mutations behind Super Admin verification
revoke all on function public.save_super_admin_text(text, text) from public, anon, authenticated;

create or replace function public.save_super_admin_text(
  p_path text,
  p_content text,
  p_passcode text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_key text := regexp_replace(coalesce(p_path, ''), '^src/super-admin/', '');
begin
  if not private.is_valid_super_admin(p_passcode) then
    raise exception 'Unauthorized Super Admin session' using errcode = '42501';
  end if;

  clean_key := ltrim(trim(clean_key), '/');
  if clean_key = '' then
    raise exception 'SETTING_KEY_REQUIRED';
  end if;

  insert into public.site_settings (key, value, updated_at)
  values (clean_key, coalesce(p_content, ''), now())
  on conflict (key) do update
    set value = excluded.value,
        updated_at = now();
end;
$$;

create or replace function public.save_super_admin_settings_batch(
  p_entries jsonb,
  p_passcode text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  clean_key text;
begin
  if not private.is_valid_super_admin(p_passcode) then
    raise exception 'Unauthorized Super Admin session' using errcode = '42501';
  end if;

  if p_entries is null or jsonb_typeof(p_entries) <> 'array' then
    raise exception 'Invalid settings payload';
  end if;

  for v_item in select * from jsonb_array_elements(p_entries) loop
    clean_key := regexp_replace(coalesce(v_item->>'path', ''), '^src/super-admin/', '');
    clean_key := ltrim(trim(clean_key), '/');
    if clean_key = '' then
      raise exception 'SETTING_KEY_REQUIRED';
    end if;

    insert into public.site_settings (key, value, updated_at)
    values (clean_key, coalesce(v_item->>'content', ''), now())
    on conflict (key) do update
      set value = excluded.value,
          updated_at = now();
  end loop;
end;
$$;

grant execute on function public.save_super_admin_text(text, text, text) to anon, authenticated, service_role;
grant execute on function public.save_super_admin_settings_batch(jsonb, text) to anon, authenticated, service_role;

-- 3. Cross-device Gallery table & Super Admin RPCs
create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  caption text,
  image_url text not null,
  storage_path text not null,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  mime_type text not null default '',
  file_size bigint not null default 0,
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gallery_items
  add column if not exists media_type text not null default 'image',
  add column if not exists mime_type text not null default '',
  add column if not exists file_size bigint not null default 0;

alter table public.gallery_items enable row level security;
revoke all on table public.gallery_items from anon, authenticated;
grant select on table public.gallery_items to anon, authenticated;
grant select, insert, update, delete on table public.gallery_items to service_role;

drop policy if exists "Published gallery items are public" on public.gallery_items;
create policy "Published gallery items are public"
  on public.gallery_items
  for select
  to anon, authenticated
  using (is_published = true);

create or replace function public.super_admin_list_gallery(p_passcode text)
returns setof public.gallery_items
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_valid_super_admin(p_passcode) then
    raise exception 'Unauthorized Super Admin gallery access' using errcode = '42501';
  end if;

  return query
    select *
      from public.gallery_items
     order by sort_order asc, created_at asc;
end;
$$;

create or replace function public.super_admin_save_gallery_item(
  p_passcode text,
  p_id uuid,
  p_title text,
  p_caption text,
  p_image_url text,
  p_storage_path text,
  p_media_type text default 'image',
  p_mime_type text default '',
  p_file_size bigint default 0,
  p_is_published boolean default true,
  p_sort_order integer default null
)
returns public.gallery_items
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.gallery_items;
  v_type text := case when lower(coalesce(p_media_type, 'image')) = 'video' then 'video' else 'image' end;
  v_order integer;
begin
  if not private.is_valid_super_admin(p_passcode) then
    raise exception 'Unauthorized Super Admin gallery mutation' using errcode = '42501';
  end if;

  if nullif(btrim(coalesce(p_title, '')), '') is null or nullif(btrim(coalesce(p_image_url, '')), '') is null then
    raise exception 'Title and media URL are required';
  end if;

  if p_id is null then
    select coalesce(max(sort_order), 0) + 1 into v_order from public.gallery_items;
    insert into public.gallery_items (
      title, caption, image_url, storage_path, media_type, mime_type, file_size, is_published, sort_order
    )
    values (
      btrim(p_title),
      nullif(btrim(coalesce(p_caption, '')), ''),
      btrim(p_image_url),
      coalesce(p_storage_path, ''),
      v_type,
      coalesce(p_mime_type, ''),
      greatest(0, coalesce(p_file_size, 0)),
      coalesce(p_is_published, true),
      coalesce(p_sort_order, v_order)
    )
    returning * into v_row;
  else
    update public.gallery_items
       set title = btrim(p_title),
           caption = nullif(btrim(coalesce(p_caption, '')), ''),
           image_url = btrim(p_image_url),
           storage_path = coalesce(nullif(p_storage_path, ''), storage_path),
           media_type = v_type,
           mime_type = coalesce(nullif(p_mime_type, ''), mime_type),
           file_size = case when coalesce(p_file_size, 0) > 0 then p_file_size else file_size end,
           is_published = coalesce(p_is_published, is_published),
           sort_order = coalesce(p_sort_order, sort_order),
           updated_at = now()
     where id = p_id
     returning * into v_row;

    if not found then
      raise exception 'Gallery item not found';
    end if;
  end if;

  return v_row;
end;
$$;

create or replace function public.super_admin_reorder_gallery(
  p_passcode text,
  p_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_idx integer := 1;
  v_id uuid;
begin
  if not private.is_valid_super_admin(p_passcode) then
    raise exception 'Unauthorized Super Admin gallery reorder' using errcode = '42501';
  end if;

  if p_ids is null then
    return;
  end if;

  foreach v_id in array p_ids loop
    update public.gallery_items
       set sort_order = v_idx,
           updated_at = now()
     where id = v_id;
    v_idx := v_idx + 1;
  end loop;
end;
$$;

create or replace function public.super_admin_delete_gallery_item(
  p_passcode text,
  p_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_storage_path text;
begin
  if not private.is_valid_super_admin(p_passcode) then
    raise exception 'Unauthorized Super Admin gallery delete' using errcode = '42501';
  end if;

  delete from public.gallery_items
   where id = p_id
   returning storage_path into v_storage_path;

  return coalesce(v_storage_path, '');
end;
$$;

grant execute on function public.super_admin_list_gallery(text) to anon, authenticated, service_role;
grant execute on function public.super_admin_save_gallery_item(text, uuid, text, text, text, text, text, text, bigint, boolean, integer) to anon, authenticated, service_role;
grant execute on function public.super_admin_reorder_gallery(text, uuid[]) to anon, authenticated, service_role;
grant execute on function public.super_admin_delete_gallery_item(text, uuid) to anon, authenticated, service_role;
