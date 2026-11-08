-- Additive Rag Day gallery storage and passcode-gated management.
create table if not exists public.gallery_items (
 id uuid primary key default gen_random_uuid(),
 title text not null,
 caption text,
 image_url text not null,
 storage_path text not null,
 is_published boolean not null default true,
 sort_order integer not null default 0,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.gallery_items enable row level security;
revoke all on public.gallery_items from anon, authenticated;
grant select on public.gallery_items to anon, authenticated;
drop policy if exists "Published gallery items are public" on public.gallery_items;
create policy "Published gallery items are public" on public.gallery_items for select to anon,authenticated using (is_published=true);

create or replace function public.admin_list_gallery()
returns setof public.gallery_items language plpgsql security definer set search_path=public as $$
declare p text := coalesce(current_setting('request.headers',true)::json->>'x-rd27-passcode','');
begin
 if coalesce(p,'') not in ('nic27.boy','nicboy.27') then raise exception 'Unauthorized gallery access' using errcode='42501'; end if;
 return query select * from public.gallery_items order by sort_order,created_at desc;
end; $$;

create or replace function public.admin_save_gallery_item(p_id uuid,p_title text,p_caption text,p_image_url text,p_storage_path text)
returns public.gallery_items language plpgsql security definer set search_path=public as $$
declare p text := coalesce(current_setting('request.headers',true)::json->>'x-rd27-passcode',''); r public.gallery_items;
begin
 if coalesce(p,'') not in ('nic27.boy','nicboy.27') then raise exception 'Unauthorized gallery operation' using errcode='42501'; end if;
 if nullif(trim(p_title),'') is null or nullif(trim(p_image_url),'') is null then raise exception 'Title and image are required'; end if;
 if p_id is null then insert into public.gallery_items(title,caption,image_url,storage_path) values(trim(p_title),nullif(trim(p_caption),''),p_image_url,p_storage_path) returning * into r;
 else update public.gallery_items set title=trim(p_title),caption=nullif(trim(p_caption),''),image_url=p_image_url,storage_path=p_storage_path,updated_at=now() where id=p_id returning * into r; end if;
 return r;
end; $$;

create or replace function public.admin_update_gallery_item(p_id uuid,p_title text,p_caption text)
returns public.gallery_items language plpgsql security definer set search_path=public as $$
declare p text := coalesce(current_setting('request.headers',true)::json->>'x-rd27-passcode',''); r public.gallery_items;
begin
 if coalesce(p,'') not in ('nic27.boy','nicboy.27') then raise exception 'Unauthorized gallery operation' using errcode='42501'; end if;
 update public.gallery_items set title=trim(p_title),caption=nullif(trim(p_caption),''),updated_at=now() where id=p_id returning * into r; return r;
end; $$;

create or replace function public.admin_delete_gallery_item(p_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare p text := current_setting('request.headers',true)::json->>'x-rd27-passcode';
begin
 if coalesce(p,'') not in ('nic27.boy','nicboy.27') then raise exception 'Unauthorized gallery operation' using errcode='42501'; end if;
 delete from public.gallery_items where id=p_id;
end; $$;
grant execute on function public.admin_list_gallery() to anon,authenticated;
grant execute on function public.admin_save_gallery_item(uuid,text,text,text,text) to anon,authenticated;
grant execute on function public.admin_update_gallery_item(uuid,text,text) to anon,authenticated;
grant execute on function public.admin_delete_gallery_item(uuid) to anon,authenticated;
