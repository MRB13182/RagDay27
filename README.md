# RagDay27

Official Rag Day 27 portal for the NIC 27 batch.

## IMPORTANT PROJECT MODIFICATION RULES

These rules are mandatory for all developers and AI coding agents working in this repository.

### Protected areas — explicit owner permission required

1. **Super Admin is protected.** Do not redesign, refactor, rename, move, delete, add to, or otherwise modify the Super Admin system unless the project owner explicitly authorizes a Super Admin change.
2. **Database and Supabase are protected.** Do not change database tables, columns, records, SQL migrations, functions/RPCs, policies/RLS, relationships, storage buckets, Supabase configuration, or database credentials unless the project owner explicitly authorizes database/Supabase work.
3. Permission to make frontend changes does not grant permission to change the Super Admin or Database/Supabase.
4. Never infer permission from earlier conversations, older tasks, previous commits, or implied requirements. Permission must be explicit in the current instruction.
5. If a requested feature cannot be completed without changing either protected area, stop before making that change. Explain the exact required modification and ask the project owner for approval.

### Allowed work

6. Normal public-facing frontend UI changes are allowed when requested.
7. New public pages and frontend-only components may be added outside protected areas, provided they do not require changes to protected systems.
8. Preserve existing functionality, routes, project conventions, authentication behavior, and architecture unless the owner explicitly authorizes the relevant change.
9. Do not add fake content, dummy buttons, or pretend a backend-dependent feature works when the existing approved interfaces cannot support it.

### Before every task

- Inspect the relevant existing code and identify whether the requested work touches a protected area.
- Keep changes narrowly scoped to the files and behavior explicitly requested.
- If the work requires a protected change, do not bypass this rule with a workaround that still modifies the protected system.
- Report which files were changed and what validation was run.

**Priority:** These project protection rules take precedence over broad implementation requests. Ask before modifying Super Admin or Database/Supabase.
