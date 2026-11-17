-- Include Roll, Student ID, Academic Group, and Academic Section in pending public lookup responses
create or replace function public.lookup_invitation_card(
  p_registration_no text,
  p_student_name text default null
)
returns json
language plpgsql
security definer
as $$
declare
  clean_reg text := upper(trim(coalesce(p_registration_no, '')));
  r record;
begin
  select * into r from public.registrations
  where upper(registration_no) = clean_reg
  limit 1;

  if not found or r.hidden_from_web = true then
    return json_build_object('found', false, 'status', 'hidden_or_not_found', 'can_download', false);
  end if;

  if r.status = 'pending' then
    if p_student_name is not null and lower(trim(p_student_name)) <> lower(trim(r.full_name)) then
      return json_build_object('found', false, 'status', 'name_mismatch', 'can_download', false);
    end if;
    return json_build_object(
      'found', true,
      'status', 'pending',
      'can_download', false,
      'registration_no', r.registration_no,
      'full_name', r.full_name,
      'class_roll', r.class_roll,
      'student_id', r.student_id,
      'academic_group', r.academic_group,
      'academic_section', r.academic_section
    );
  elsif r.status = 'rejected' then
    if p_student_name is null or lower(trim(coalesce(p_student_name, ''))) <> lower(trim(r.full_name)) then
      return json_build_object('found', false, 'status', 'name_mismatch', 'can_download', false);
    end if;
    return json_build_object(
      'found', true,
      'status', 'rejected',
      'can_download', false,
      'registration_no', r.registration_no,
      'full_name', r.full_name,
      'reject_reason', r.reject_reason,
      'rejected_at', r.rejected_at
    );
  else
    return json_build_object(
      'found', true,
      'status', 'approved',
      'can_download', true,
      'id', r.id,
      'sl_no', r.sl_no,
      'registration_no', r.registration_no,
      'full_name', r.full_name,
      'class_roll', r.class_roll,
      'student_id', r.student_id,
      'contact_mobile_number', r.contact_mobile_number,
      'academic_group', r.academic_group,
      'academic_section', r.academic_section,
      'student_photo', r.student_photo,
      'send_method', r.send_method,
      'sender_mobile_no', r.sender_mobile_no,
      'payment_time', r.payment_time,
      'transaction_id', r.transaction_id,
      'jersey_back_name', r.jersey_back_name,
      'jersey_number', r.jersey_number,
      'jersey_size', r.jersey_size,
      'gender', r.gender,
      'approved_at', r.approved_at,
      'created_at', r.created_at,
      'updated_at', r.updated_at
    );
  end if;
end;
$$;
