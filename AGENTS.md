# Repository Safety Rules

## Protected configuration
`src/super-admin/**` is protected. Never delete, rename, or restructure this directory during cleanup, refactoring, optimization, bug fixing, or code generation unless the user explicitly requests that change.

The six required top-level directories must remain present:
- `01. website-identity`
- `02. event-settings`
- `03. registration-settings`
- `04. countdown-settings`
- `05. important-notice`
- `06. logo-related`

Do not move real registration data into this directory. Supabase remains the source of truth for registrations.
