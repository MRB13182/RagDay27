# RagDay27 Super Admin — Protected Configuration

IMPORTANT

READ FIRST. ANALYZE FIRST. UNDERSTAND FIRST.

The project contains a protected configuration area:

`src/super-admin/`

## Protected Super Admin Structure

```
src/super-admin/

01. website-identity/
├─ Pic/
│  ├─ logo.png
│  └─ favicon.png
└─ Text/
   ├─ web name.txt
   ├─ web header
   └─ web footer

02. event-settings/
├─ Pic/
│  └─ jersey
└─ Text/
   ├─ Event name.txt
   ├─ Event card
   ├─ Event date
   └─ Venue

03. reg-settings/
├─ Pic/
│  └─ back jersey preview.png
└─ Text/
   ├─ Section settings.txt
   ├─ Payment number
   │  ├─ Male Bkash
   │  ├─ Male Nagad
   │  └─ Female
   ├─ Last registration date countdown
   └─ Enable / Disable

04. countdown-settings/
└─ Text/
   ├─ Countdown of Event
   └─ Enable / Disable

05. important-notice/
└─ Text/
   ├─ Notice Board
   ├─ Popup Notice
   └─ Enable / Disable
```

## Security Rules

1. `src/super-admin/` is SUPER ADMIN ONLY.

2. By default, `src/super-admin/` is READ-ONLY for all normal development and admin work.

3. Normal admin requests MUST NOT:
   - modify files inside `src/super-admin/`
   - delete files inside `src/super-admin/`
   - rename files inside `src/super-admin/`
   - move files inside `src/super-admin/`
   - restructure directories inside `src/super-admin/`
   - refactor code/configuration inside `src/super-admin/`
   - replace existing Super Admin assets/configuration
   - recreate missing Super Admin files automatically

4. Allowed normal admin roles remain:
   - `male_admin`
   - `female_admin`

5. DO NOT create, rename, or introduce any additional admin role. In particular, DO NOT create a new `super_admin` authentication role unless explicitly requested by the user. The existing protected directory is a configuration boundary, not authorization to redesign the role model.

6. Only an explicit instruction such as:
   - "Modify Super Admin"
   - "Change src/super-admin"
   - "Update Super Admin settings"
   - "Rebuild the Super Admin module"

   authorizes changes inside `src/super-admin/`.

7. If the current task does NOT explicitly authorize Super Admin changes:
   - preserve all existing Super Admin files
   - preserve all existing Super Admin directories
   - preserve all existing Super Admin assets
   - preserve all existing Super Admin configuration
   - do not optimize or clean up this area

8. When implementing a normal task:
   - start the requested work immediately
   - inspect the existing code first
   - preserve existing functionality
   - add only missing non-protected pieces
   - remove only unnecessary non-protected pieces required by the task
   - keep the existing architecture coherent
   - do not create duplicate or parallel implementations

9. If a requested normal-admin change appears to require touching `src/super-admin/`, stop that portion of the change and implement the solution outside the protected directory instead.

10. Validation may CHECK the Super Admin structure, but validation MUST NOT recreate missing files automatically. Missing required protected files must be reported as an error.

## Source-of-Truth Rule

Supabase remains the source of truth for real registration data.

`src/super-admin/` contains protected configuration and assets consumed by the application. Do not move real registration records into this directory.

## Execution Requirement

Perform all approved work directly on the existing codebase.

DO NOT:
- create a new branch
- create a pull request (PR)
- fork the project
- duplicate the application
- introduce parallel implementations
- create architecture fragmentation

Apply changes directly within the current project structure while preserving existing functionality.

All work must be completed without merge conflicts, branch conflicts, code duplication, or unnecessary architecture fragmentation.

Use the existing codebase as the single source of truth.

## Current Repository Reality

The repository already contains an existing protected `src/super-admin/` structure. Do not replace that existing structure with a simplified or newly invented one unless the user explicitly authorizes a Super Admin restructure.

If a normal task can be completed without touching the protected directory, it MUST be completed that way.

Unauthorized modification of `src/super-admin/` is considered a security violation.
