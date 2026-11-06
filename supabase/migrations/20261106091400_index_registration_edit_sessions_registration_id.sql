-- Cover the registration_id foreign key in private edit sessions.
create index if not exists registration_edit_sessions_registration_id_idx
  on private.registration_edit_sessions(registration_id);
