# Repository Safety Rules

## Protected Super Admin configuration

The `src/super-admin/**` directory is a protected Super Admin configuration/content area.

It is READ-ONLY BY DEFAULT for normal work.

Never delete, rename, move, restructure, flatten, regenerate, replace, refactor, optimize, or otherwise modify anything under `src/super-admin/**` unless the user explicitly authorizes a Super Admin change.

Explicit authorization includes instructions such as:
- "Modify Super Admin"
- "Change src/super-admin"
- "Update Super Admin settings"
- "Rebuild the Super Admin module"

Normal admin roles are only:
- `male_admin`
- `female_admin`

Do not create, rename, or introduce additional admin roles unless explicitly requested. The protected Super Admin directory is a configuration boundary and must not be interpreted as permission to redesign the authentication/role model.

If a normal task appears to require touching `src/super-admin/**`, implement the solution outside that protected area instead whenever technically possible. Do not automatically recreate missing Super Admin files; validation must report missing protected paths as errors.

The existing six required top-level Super Admin directories must remain present:
- `01. website-identity`
- `02. event-settings`
- `03. registration-settings`
- `04. countdown-settings`
- `05. important-notice`
- `06. logo-related`

Do not move real registration data into this directory. Supabase remains the source of truth for registrations.

## Execution rules

Perform approved work directly on the existing codebase.

Do NOT:
- create a new branch
- create a pull request
- fork the project
- duplicate the application
- introduce parallel implementations
- create unnecessary architecture fragmentation

Start implementing the requested task after inspecting the existing codebase. Add missing non-protected pieces and remove/replace unnecessary non-protected pieces only when required by the task. Preserve existing functionality and avoid duplicate implementations.

Unauthorized modification of `src/super-admin/**` is a repository safety violation.
