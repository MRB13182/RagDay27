# RagDay27 Super Admin — Protected Configuration

IMPORTANT

READ FIRST. ANALYZE FIRST. UNDERSTAND FIRST.

This directory is the protected Super Admin configuration layer for RagDay27.

## Required Editable Configuration

The following configuration files are intended to be editable from the protected Super Admin context:

### 01. Website Identity
- `01. website-identity/Text/web name.txt`
- `01. website-identity/Text/web header.txt`
- `01. website-identity/Text/web footer.txt`
- `01. website-identity/Pic/logo.png`
- `01. website-identity/Pic/favicon.png`

### 02. Event Settings
- `02. event-settings/Pic/jersey.png`
- `02. event-settings/Text/Event name.txt`
- `02. event-settings/Text/Event card.txt`
- `02. event-settings/Text/Event date.txt`
- `02. event-settings/Text/Venue.txt`

### 03. Registration Settings
- `03. reg-settings/Pic/back jersey preview.png`
- `03. reg-settings/Text/Section settings.txt`
- `03. reg-settings/Text/Payment number.txt`
- `03. reg-settings/Text/Last registration date countdown.txt`
- `03. reg-settings/Text/Enable Disable.txt`

### 04. Countdown Settings
- `04. countdown-settings/Text/Countdown of Event.txt`
- `04. countdown-settings/Text/Enable Disable.txt`

### 05. Important Notice
- `05. important-notice/Text/Notice Board.txt`
- `05. important-notice/Text/Popup Notice.txt`
- `05. important-notice/Text/Enable Disable.txt`

Text files are UTF-8 plain text and must remain editable without introducing database-backed registration data.

Image entries are image assets and must remain image assets. The application must use them as images, provide preview/upload/replacement behavior in the protected Super Admin context, and never reinterpret them as text.

## Security Rules

1. `src/super-admin/**` is SUPER ADMIN ONLY.
2. By default this directory is READ-ONLY for normal development and normal admin roles.
3. Normal admin roles remain only:
   - `male_admin`
   - `female_admin`
4. Never create a new `super_admin` authentication role or any other admin role unless the user explicitly requests a role-model change.
5. Normal admin code must not modify, delete, rename, move, refactor, replace, regenerate, or restructure protected files.
6. Only an explicit Super Admin instruction authorizes changes inside this directory.
7. Validation may verify the protected structure, but must never recreate missing protected files automatically.
8. Supabase remains the source of truth for real registration records.

## Execution Rules

Apply approved changes directly to the existing codebase.

Do NOT:
- create a new branch
- create a PR
- fork the project
- duplicate the application
- create parallel implementations
- fragment the architecture

Preserve existing functionality and reuse existing code paths whenever possible.
