-- Registration Edit feature: additive-only schema and RPCs.
-- Does not change existing registration RPCs, statuses, data, or tables.
alter table public.registrations
  add column if not exists edit_count integer not null default 0,
  add column if not exists edit_locked boolean not null default false,
  add column if not exists last_edited_at timestamptz,
  add column if not exists last_edit_source text;

create table if not exists public.registration_edit_settings (
  singleton boolean primary key default true check (singleton),
  edit_deadline timestamptz not null,
  rejected_editable_fields text[] not null default array[]::text[],
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admins(id)
);
insert into public.registration_edit_settings(singleton, edit_deadline)
values (true, '2026-12-01 23:59:59+06')
on conflict (singleton) do nothing;

alter table public.registration_edit_settings enable row level security;
revoke all on public.registration_edit_settings from anon, authenticated;
grant select, insert, update on public.registration_edit_settings to service_role;

create table if not exists private.registration_edit_sessions (
  token_hash text primary key,
  registration_id uuid not null references public.registrations(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table private.registration_edit_sessions enable row level security;
revoke all on private.registration_edit_sessions from public, anon, authenticated;
grant all on private.registration_edit_sessions to service_role;

create or replace function public.get_registration_edit_policy()
returns jsonb language sql security definer set search_path = ''
as $$
  select jsonb_build_object(
    'deadline', s.edit_deadline,
    'can_edit', clock_timestamp() <= s.edit_deadline
  ) from public.registration_edit_settings s where s.singleton = true;
$$;
revoke all on function public.get_registration_edit_policy() from public;
grant execute on function public.get_registration_edit_policy() to anon, authenticated, service_role;

create or replace function public.verify_registration_edit(
  p_registration_no text,
  p_student_name text
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  r public.registrations;
  v_token text;
  v_deadline timestamptz;
  v_fields text[];
begin
  select edit_deadline, rejected_editable_fields into v_deadline, v_fields
  from public.registration_edit_settings where singleton = true;
  if clock_timestamp() > v_deadline then
    return jsonb_build_object('success',false,'message','The registration editing deadline has passed.');
  end if;
  select * into r from public.registrations
  where upper(registration_no)=upper(trim(p_registration_no))
    and lower(trim(full_name))=lower(trim(p_student_name))
    and hidden_from_web=false
  for update;
  if not found then
    return jsonb_build_object('success',false,'message','Registration Number and Student Name did not match.');
  end if;
  if r.status='rejected' then
    return jsonb_build_object('success',false,'message','Rejected registrations must use the existing correction process.');
  end if;
  if r.edit_locked then
    return jsonb_build_object('success',false,'message','Editing is individually locked for this registration.');
  end if;
  if r.edit_count >= 5 then
    return jsonb_build_object('success',false,'message','The maximum of 5 successful edits has been reached.');
  end if;
  v_token := encode(extensions.gen_random_bytes(32),'hex');
  insert into private.registration_edit_sessions(token_hash,registration_id,expires_at)
  values (encode(extensions.digest(v_token,'sha256'),'hex'),r.id,clock_timestamp()+interval '15 minutes');
  return jsonb_build_object(
    'success',true,
    'token',v_token,
    'registration_no',r.registration_no,
    'edit_count',r.edit_count,
    'edit_locked',r.edit_locked,
    'edit_deadline',v_deadline,
    'rejected_editable_fields',v_fields,
    'record',to_jsonb(r)
  );
end;
$$;
revoke all on function public.verify_registration_edit(text,text) from public;
grant execute on function public.verify_registration_edit(text,text) to anon, authenticated, service_role;

create or replace function public.save_registration_edit(
  p_token text,
  p_full_name text,
  p_class_roll text,
  p_student_id text,
  p_contact_mobile_number text,
  p_academic_group text,
  p_academic_section text,
  p_student_photo text,
  p_send_method text,
  p_sender_mobile_no text,
  p_payment_time text,
  p_transaction_id text,
  p_jersey_back_name text,
  p_jersey_number text,
  p_jersey_size text
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  r public.registrations;
  s private.registration_edit_sessions;
  v_deadline timestamptz;
begin
  select * into s from private.registration_edit_sessions
  where token_hash=encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex')
    and expires_at > clock_timestamp()
  for update;
  if not found then return jsonb_build_object('success',false,'message','Edit session expired. Verify your registration again.'); end if;
  select edit_deadline into v_deadline from public.registration_edit_settings where singleton=true;
  if clock_timestamp() > v_deadline then
    delete from private.registration_edit_sessions where token_hash=s.token_hash;
    return jsonb_build_object('success',false,'message','The editing deadline has passed.');
  end if;
  select * into r from public.registrations where id=s.registration_id for update;
  if not found or r.hidden_from_web then return jsonb_build_object('success',false,'message','Registration not found.'); end if;
  if r.edit_locked then return jsonb_build_object('success',false,'message','Editing is individually locked.'); end if;
  if r.status='rejected' then return jsonb_build_object('success',false,'message','Rejected registrations must use the correction process.'); end if;
  if r.edit_count >= 5 then return jsonb_build_object('success',false,'message','The maximum of 5 successful edits has been reached.'); end if;
  if coalesce(trim(p_full_name),'')='' or length(trim(p_full_name)) > 120
    or coalesce(trim(p_class_roll),'')='' or length(trim(p_class_roll)) > 30
    or coalesce(trim(p_student_id),'')='' or length(trim(p_student_id)) > 40
    or coalesce(trim(p_contact_mobile_number),'') !~ '^[0-9]{11}$'
    or coalesce(trim(p_sender_mobile_no),'') !~ '^[0-9]{11}$'
    or coalesce(trim(p_academic_group),'')='' or coalesce(trim(p_academic_section),'')=''
    or coalesce(trim(p_jersey_back_name),'')='' or length(trim(p_jersey_back_name)) > 14
    or coalesce(trim(p_jersey_number),'') !~ '^[0-9]{1,3}$'
    or coalesce(p_jersey_size,'') not in ('S','M','L','XL','2XL','3XL','4XL')
    or lower(coalesce(p_send_method,'')) not in ('bkash','nagad') then
    return jsonb_build_object('success',false,'message','One or more submitted fields are invalid.');
  end if;
  update public.registrations set
    full_name=trim(p_full_name),
    class_roll=trim(p_class_roll),
    student_id=trim(p_student_id),
    contact_mobile_number=trim(p_contact_mobile_number),
    academic_group=trim(p_academic_group),
    academic_section=trim(p_academic_section),
    student_photo=coalesce(p_student_photo,r.student_photo),
    send_method=lower(trim(p_send_method)),
    sender_mobile_no=trim(p_sender_mobile_no),
    payment_time=trim(p_payment_time),
    transaction_id=nullif(trim(coalesce(p_transaction_id,'')),''),
    jersey_back_name=trim(p_jersey_back_name),
    jersey_number=trim(p_jersey_number),
    jersey_size=p_jersey_size,
    edit_count=edit_count+1,
    last_edited_at=clock_timestamp(),
    last_edit_source='student',
    updated_at=clock_timestamp()
  where id=r.id returning * into r;
  delete from private.registration_edit_sessions where token_hash=s.token_hash;
  return jsonb_build_object('success',true,'record',to_jsonb(r));
end;
$$;
revoke all on function public.save_registration_edit(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text) from public;
grant execute on function public.save_registration_edit(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text) to anon, authenticated, service_role;

-- Admin authorization uses the existing passcode verification RPC.
create or replace function public.set_registration_edit_deadline(p_passcode text,p_deadline timestamptz)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_role text;
begin
  select role into v_role from public.verify_admin_passcode(p_passcode);
  if v_role is distinct from 'male_admin' then
    return jsonb_build_object('success',false,'message','Authorized Super Admin access required.');
  end if;
  update public.registration_edit_settings
  set edit_deadline=p_deadline,updated_at=now()
  where singleton=true;
  return jsonb_build_object('success',true,'deadline',p_deadline);
end;
$$;
revoke all on function public.set_registration_edit_deadline(text,timestamptz) from public;
grant execute on function public.set_registration_edit_deadline(text,timestamptz) to anon, authenticated, service_role;

create or replace function public.set_registration_edit_lock(p_passcode text,p_registration_no text,p_locked boolean)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_role text; v_id uuid;
begin
  select role into v_role from public.verify_admin_passcode(p_passcode);
  if v_role is distinct from 'male_admin' then
    return jsonb_build_object('success',false,'message','Authorized Admin access required.');
  end if;
  update public.registrations set edit_locked=p_locked
  where upper(registration_no)=upper(trim(p_registration_no)) and hidden_from_web=false
  returning id into v_id;
  if v_id is null then return jsonb_build_object('success',false,'message','Registration not found.'); end if;
  return jsonb_build_object('success',true,'registration_id',v_id,'edit_locked',p_locked);
end;
$$;
revoke all on function public.set_registration_edit_lock(text,text,boolean) from public;
grant execute on function public.set_registration_edit_lock(text,text,boolean) to anon, authenticated, service_role;

create or replace function public.get_registration_edit_metadata(p_passcode text)
returns table(registration_no text,edit_count integer,edit_locked boolean,last_edited_at timestamptz,last_edit_source text)
language plpgsql security definer set search_path=''
as $$
declare v_role text;
begin
  select role into v_role from public.verify_admin_passcode(p_passcode);
  if v_role is distinct from 'male_admin' then raise exception 'ADMIN_ACCESS_REQUIRED'; end if;
  return query select r.registration_no,r.edit_count,r.edit_locked,r.last_edited_at,r.last_edit_source
  from public.registrations r where r.hidden_from_web=false
  order by r.last_edited_at desc nulls last;
end;
$$;
revoke all on function public.get_registration_edit_metadata(text) from public;
grant execute on function public.get_registration_edit_metadata(text) to anon, authenticated, service_role;
