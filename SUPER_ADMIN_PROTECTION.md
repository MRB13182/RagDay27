# RagDay27 Super Admin Directory Protection

## Protected path

`src/super-admin/` is a protected configuration/content directory.

Mandatory top-level directories:

1. `src/super-admin/01. website-identity`
2. `src/super-admin/02. event-settings`
3. `src/super-admin/03. registration-settings`
4. `src/super-admin/04. countdown-settings`
5. `src/super-admin/05. important-notice`
6. `src/super-admin/06. logo-related`

Do not delete, rename, flatten, migrate, regenerate, or replace files under `src/super-admin/` during unrelated application work.

Any automated or AI-assisted change touching this directory requires explicit instruction.

Registration section configuration:

`src/super-admin/03. registration-settings/text/sections/sections.json`

Hierarchy:

Gender -> Group -> Sections.

Default mappings:

- male + science -> SCB
- male + business_studies -> BSB
- male + humanities -> HUB
- female + science -> SCG
- female + business_studies -> BSG
- female + humanities -> HUG

Section arrays have no fixed maximum. Add/remove/reorder/enable/disable/relabel sections by editing the configuration without changing registration form logic.

Validation should detect missing required paths and fail; it must never recreate missing files automatically.
