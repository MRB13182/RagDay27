# Rag Day 27 — Supabase Backend Setup

The live Supabase project is provisioned with the production schema, RLS, atomic registration numbering, role-aware RPCs, Storage buckets, and audit logging.

## Admin setup

Create three administrator users in Supabase Authentication (email/password). Then insert one public.admin_profiles row per Auth user in the SQL editor:

```sql
insert into public.admin_profiles (auth_user_id, name, username, role)
values
  ('AUTH-USER-UUID', 'Super Admin', 'superadmin', 'super_admin'),
  ('AUTH-USER-UUID', 'Male Admin', 'maleadmin', 'male_admin'),
  ('AUTH-USER-UUID', 'Female Admin', 'femaleadmin', 'female_admin');
```

Replace each placeholder with the matching Auth user UUID. Passwords are managed only by Supabase Auth and must not be stored in admin_profiles.

## Client environment

```env
VITE_SUPABASE_URL=https://rqjlrbteaqjpgwkeomro.supabase.co
VITE_SUPABASE_ANON_KEY=<Supabase publishable key>
```

Never put a service-role or secret key in the browser.

## Registration numbering

`registrations.registration_no` is generated only by PostgreSQL sequence `public.registration_no_seq`. The browser never chooses the next number. Deleted registration numbers are not reused. The sequence reset RPC rejects resets while registrations still exist.

The UI serial number is a display position and is not stored in PostgreSQL.

## Roles

- `super_admin`: all registration genders plus settings/admin/audit management.
- `male_admin`: male registrations only.
- `female_admin`: female registrations only.

Authorization is enforced in the database/RLS layer; hiding controls in React is not the security boundary.

## Storage

Buckets:

- `student-photos` — private
- `branding` — public
- `jerseys` — public
- `pdf-assets` — private
- `invitation-cards` — private
- `exports` — private

## Main backend RPCs

`create_registration`
`approve_registration`
`reject_registration`
`delete_registration`
`admin_update_registration`
`reset_registration_sequence`
`search_public_student`
`get_public_invitation`
`create_invitation`
`generate_invitation`
`get_admin_export_data`

## Deployment note

The frontend is being moved away from client-side registration-number generation and hardcoded admin passcodes. Review and merge the `backend-integration` branch before deploying the UI changes.
