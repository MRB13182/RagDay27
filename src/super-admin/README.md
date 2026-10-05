# RagDay27 Super Admin — Protected Configuration

This directory is the protected Super Admin configuration layer for RagDay27.

## Canonical responsibilities

1. Website Identity
- Logo
- Favicon
- Website name
- Website header
- Website footer

2. Event Settings
- Jersey/event visual assets
- Event name
- Event card content
- Event date
- Venue

3. Registration Settings
- Jersey preview/back-preview assets
- Section settings
- Payment numbers (Male Bkash/Nagad and Female Bkash/Nagad)
- Last registration date
- Registration enable/disable

4. Countdown Setting
- Event countdown
- Home visibility
- Enable/disable

5. Important Notice
- Animated notice board content
- Popup notice content
- Notice enable/disable
- Popup enable/disable

## Security / change policy

`src/super-admin/` is a protected, read-only-by-default area.

Normal admin requests must NOT modify, delete, rename, refactor, migrate, replace, or redesign this area.

Only an instruction that explicitly says to change/update/modify/rebuild the Super Admin is authorization to modify this directory.

All normal registration, approval, rejection, invitation, admin, database, UI, payment, and jersey fixes must leave this protected configuration untouched unless Super Admin change is explicitly requested.

Do not introduce a new Super Admin role if one does not already exist in the application's authentication/authorization design. This folder is a protected configuration module, not a request to redesign the application's role model.

Real registration records remain in Supabase. This directory contains configuration and assets consumed by the application.
