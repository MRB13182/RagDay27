# RagDay27 Super Admin — Protected Configuration & Console

This directory is the protected Super Admin configuration and management layer for **NIC 27 / RagDay27**.
The Super Admin console manages exactly **6 sections**, with zero duplicate settings files.

## Final Folder Structure & Sections

```text
src/super-admin/
├── 01. website-identity/
│   ├── Pic/
│   │   ├── logo.png
│   │   └── favicon.png
│   └── Text/
│       ├── web name.txt
│       ├── web header.txt
│       └── web footer.txt
├── 02. event-settings/
│   ├── Pic/
│   │   └── jersey-design.png
│   └── Text/
│       ├── Event name.txt
│       ├── Event date.txt
│       ├── Countedown enable disable.txt
│       ├── Fees.txt
│       ├── Venue.txt
│       ├── Jersey design.txt
│       └── Event card.txt
├── 03. reg-settings/
│   ├── Pic/
│   │   └── back jersey preview.png
│   └── Text/                  # Sole canonical location for all Registration Settings text files
│       ├── Countdown enable disable.txt
│       ├── Last Registration date.txt
│       ├── Section settings.txt
│       ├── Payment number SC.txt
│       ├── Payment number BS.txt
│       └── Payment number HU.txt
├── 04. important-notice/
│   └── Text/
│       ├── Notice Board.txt   # Header Notice ticker (independent)
│       ├── Popup Notice.txt   # Popup Notice slideshow modal (independent)
│       └── Enable Disable.txt
├── 06. logo-related/
│   ├── Pic/
│   │   ├── logo.png
│   │   └── favicon.png
│   └── Text/
│       └── logo-settings.txt
├── components/
│   └── SuperAdminUI.tsx
├── gallery/
│   ├── GalleryManagement.tsx
│   ├── types.ts
│   └── file_00000000b180820783d44c1a5d04d553.png
├── sections/
│   ├── WebsiteIdentitySection.tsx
│   ├── EventSettingsSection.tsx
│   ├── RegistrationSettingsSection.tsx
│   ├── ImportantNoticeSection.tsx
│   ├── LogoRelatedSection.tsx
│   └── GallerySection.tsx
├── .structure.json
├── README.md
├── SuperAdminDashboard.tsx
└── types.ts
```

## Section Overview

### 1. `01. website-identity`
Manages site branding text (`web name.txt`, `web header.txt`, `web footer.txt`) and stores the default website logo and favicon assets (`Pic/logo.png`, `Pic/favicon.png`).

### 2. `02. event-settings` (Includes Event Countdown)
Manages event title, date, venue, configurable event fee (`Fees.txt`), jersey showcase copy, and Event Information Cards.
**Event Countdown** is independently enabled or disabled through `Countedown enable disable.txt` and uses the event date in `Event date.txt`.

### 3. `03. reg-settings`
All registration configuration files live exclusively inside `03. reg-settings/Text/`: the countdown toggle (`Countdown enable disable.txt`), last registration deadline (`Last Registration date.txt`), registration availability toggle (`Enable Disable.txt`), male-only categories & sections (`Section settings.txt`), and group-wise bKash/Nagad numbers (`SC`, `BS`, `HU`).

### 4. `04. important-notice`
Independently manages **Header Notice** (`Notice Board.txt`) and **Popup Notice** (`Popup Notice.txt`) with separate visibility toggles, ordering, multiple items, and Supabase database persistence.

### 5. `06. logo-related`
Provides live preview and replacement upload for the official Website Logo and Favicon via Supabase Storage and `site_settings`.

### 6. `gallery`
Manages cross-device image and video gallery uploads, captions, ordering, publish toggles, and deletion backed by Supabase Storage and `public.gallery_items`.

## Security & Execution Rules

1. `src/super-admin/**` is SUPER ADMIN ONLY and requires explicit authorization before modification.
2. Normal admin access uses server-verified `male_admin` authentication.
3. No passcodes or secrets may be hardcoded in frontend source files or SQL migrations.
4. Supabase remains the single source of truth for registrations, site settings, and gallery media.
5. Apply approved work directly on `main`; do not create branches, PRs, or forks.
