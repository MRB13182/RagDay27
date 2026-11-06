-- Atomically consume one student edit session and apply the last-write-wins update.
-- Only the server-side Edge Function's service_role may execute this function.
create or replace function public.save_registration_edit_atomic(
  p_token_hash text,
  p_registration jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session private.registration_edit_sessions;
  v_record public.registrations;
  v_deadline timestamptz;
  v_key text;
  v_allowed text[] := array[
    'full_name','class_roll','student_id','contact_mobile_number',
    'academic_group','academic_section','student_photo','send_method',
    'sender_mobile_no','payment_time','transaction_id',
    'jersey_back_name','jersey_number','jersey_size'
  ]::text[];
  v_name text;
  v_roll text;
  v_student_id text;
  v_contact text;
  v_group text;
  v_section text;
  v_send_method text;
  v_sender text;
  v_payment_time text;
  v_jersey_name text;
  v_jersey_number text;
  v_jersey_size text;
begin
  if p_registration is null or jsonb_typeof(p_registration) <> 'object' then
    return jsonb_build_object('success',false,'message','Invalid registration payload.');
  end if;

  for v_key in select jsonb_object_keys(p_registration) loop
    if not (v_key = any(v_allowed)) then
      return jsonb_build_object('success',false,'message','Unsupported registration field.');
    end if;
  end loop;

  select *
    into v_session
    from private.registration_edit_sessions
   where token_hash = p_token_hash
     and expires_at > clock_timestamp()
   for update;

  if not found then
    return jsonb_build_object('success',false,'message','Edit session expired. Verify your registration again.');
  end if;

  select edit_deadline
    into v_deadline
    from public.registration_edit_settings
   where singleton = true
   for share;

  if v_deadline is null or clock_timestamp() > v_deadline then
    delete from private.registration_edit_sessions where token_hash = p_token_hash;
    return jsonb_build_object('success',false,'message','The registration editing deadline has passed.');
  end if;

  select *
    into v_record
    from public.registrations
   where id = v_session.registration_id
   for update;

  if not found or v_record.hidden_from_web then
    delete from private.registration_edit_sessions where token_hash = p_token_hash;
    return jsonb_build_object('success',false,'message','Registration not found.');
  end if;

  if v_record.status = 'rejected' then
    return jsonb_build_object('success',false,'message','Rejected registrations must use the existing correction process.');
  end if;
  if v_record.edit_locked then
    return jsonb_build_object('success',false,'message','Editing is individually locked.');
  end if;
  if v_record.edit_count >= 5 then
    return jsonb_build_object('success',false,'message','The maximum of 5 successful edits has been reached.');
  end if;

  v_name := nullif(btrim(p_registration->>'full_name'),'');
  v_roll := nullif(btrim(p_registration->>'class_roll'),'');
  v_student_id := nullif(btrim(p_registration->>'student_id'),'');
  v_contact := p_registration->>'contact_mobile_number';
  v_group := nullif(btrim(p_registration->>'academic_group'),'');
  v_section := nullif(btrim(p_registration->>'academic_section'),'');
  v_send_method := lower(coalesce(p_registration->>'send_method',''));
  v_sender := p_registration->>'sender_mobile_no';
  v_payment_time := nullif(btrim(p_registration->>'payment_time'),'');
  v_jersey_name := upper(nullif(btrim(p_registration->>'jersey_back_name'),''));
  v_jersey_number := p_registration->>'jersey_number';
  v_jersey_size := p_registration->>'jersey_size';

  if v_name is null or length(v_name) > 120
     or v_roll is null or length(v_roll) > 30
     or v_student_id is null or length(v_student_id) > 40
     or coalesce(v_contact,'') !~ '^[0-9]{11}$'
     or v_group is null or v_section is null
     or v_send_method not in ('bkash','nagad')
     or coalesce(v_sender,'') !~ '^[0-9]{11}$'
     or v_payment_time is null
     or v_jersey_name is null or length(v_jersey_name) > 14
     or coalesce(v_jersey_number,'') !~ '^[0-9]{1,3}$'
     or coalesce(v_jersey_size,'') not in ('S','M','L','XL','2XL','3XL','4XL') then
    return jsonb_build_object('success',false,'message','One or more submitted fields are invalid.');
  end if;

  update public.registrations
     set full_name = v_name,
         class_roll = v_roll,
         student_id = v_student_id,
         contact_mobile_number = v_contact,
         academic_group = v_group,
         academic_section = v_section,
         student_photo = case
           when p_registration ? 'student_photo' then p_registration->>'student_photo'
           else v_record.student_photo
         end,
         send_method = v_send_method,
         sender_mobile_no = v_sender,
         payment_time = v_payment_time,
         transaction_id = nullif(btrim(coalesce(p_registration->>'transaction_id','')),''),
         jersey_back_name = v_jersey_name,
         jersey_number = v_jersey_number,
         jersey_size = v_jersey_size,
         edit_count = v_record.edit_count + 1,
         last_edited_at = clock_timestamp(),
         last_edit_source = 'student',
         updated_at = clock_timestamp()
   where id = v_record.id
   returning * into v_record;

  delete from private.registration_edit_sessions where token_hash = p_token_hash;

  return jsonb_build_object(
    'success',true,
    'edit_count',v_record.edit_count,
    'record',to_jsonb(v_record)
  );
end;
$$;

revoke all on function public.save_registration_edit_atomic(text,jsonb) from public,anon,authenticated;
grant execute on function public.save_registration_edit_atomic(text,jsonb) to service_role;
