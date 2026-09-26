-- ============================================================================
-- RAG DAY REGISTRATION SYSTEM - SUPABASE SCHEMA & RLS POLICIES
-- Project URL: https://rqjlrbteaqjpgwkeomro.supabase.co
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. REGISTRATIONS TABLE
-- Stores all student registrations permanently
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_no BIGSERIAL NOT NULL,
    registration_no TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    roll TEXT NOT NULL,
    student_id TEXT NOT NULL,
    group_name TEXT NOT NULL,
    section TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
    photo_url TEXT,
    contact_number TEXT,
    jersey_name TEXT NOT NULL,
    jersey_number TEXT NOT NULL DEFAULT '27',
    jersey_size TEXT NOT NULL DEFAULT 'L',
    payment_method TEXT NOT NULL DEFAULT 'bkash',
    amount NUMERIC NOT NULL DEFAULT 500,
    sender_number TEXT NOT NULL,
    payment_time TEXT NOT NULL,
    transaction_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    seat_zone TEXT DEFAULT 'Zone A - Amphitheatre Front Row',
    gate TEXT DEFAULT 'Gate 02 (North Pavilion)',
    issued_at TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_registrations_reg_no ON public.registrations (registration_no);
CREATE INDEX IF NOT EXISTS idx_registrations_gender ON public.registrations (gender);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON public.registrations (status);
CREATE INDEX IF NOT EXISTS idx_registrations_student_id ON public.registrations (student_id);
CREATE INDEX IF NOT EXISTS idx_registrations_roll ON public.registrations (roll);

-- ============================================================================
-- 2. EVENT SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.event_settings (
    id TEXT PRIMARY KEY DEFAULT 'current',
    event_name TEXT NOT NULL DEFAULT 'RAG DAY 27',
    event_description TEXT DEFAULT 'Official Batch 2027 Portal',
    event_date TEXT DEFAULT 'November 27, 2027',
    event_time TEXT DEFAULT '09:00 AM',
    event_day INTEGER DEFAULT 27,
    event_month TEXT DEFAULT 'November',
    event_year INTEGER DEFAULT 2027,
    venue TEXT DEFAULT 'Main Campus Auditorium & Amphitheatre Grounds',
    registration_fee TEXT DEFAULT '500 BDT',
    last_reg_date TEXT DEFAULT 'October 30, 2027',
    footer_text TEXT DEFAULT 'The Official Registration Platform for Rag Day 27. Celebrating unity, memories, and excellence.',
    copyright_text TEXT DEFAULT '© 2027 Batch 27 Committee. All rights reserved.',
    banner_text TEXT DEFAULT 'Early Bird Registration is LIVE! Complete verification to lock your customized kit.',
    banner_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 3. BRANDING SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.branding_settings (
    id TEXT PRIMARY KEY DEFAULT 'current',
    website_logo TEXT DEFAULT '',
    favicon TEXT DEFAULT '',
    hero_banner TEXT DEFAULT '',
    hero_background TEXT DEFAULT '',
    jersey_front_image TEXT DEFAULT '',
    jersey_back_image TEXT DEFAULT '',
    invitation_card_background TEXT DEFAULT '',
    footer_logo TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 4. PAYMENT SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payment_settings (
    id TEXT PRIMARY KEY DEFAULT 'current',
    registration_fee NUMERIC NOT NULL DEFAULT 500,
    currency TEXT NOT NULL DEFAULT 'BDT',
    bkash_enabled BOOLEAN NOT NULL DEFAULT true,
    nagad_enabled BOOLEAN NOT NULL DEFAULT true,
    male_bkash_number TEXT DEFAULT '01712-345678',
    male_nagad_number TEXT DEFAULT '01912-345678',
    female_bkash_number TEXT DEFAULT '01812-345678',
    female_nagad_number TEXT DEFAULT '01612-345678',
    instructions TEXT DEFAULT 'Please send the exact amount as Personal / Send Money. Keep TrxID for verification.',
    payment_instructions TEXT DEFAULT 'Please send the exact amount as Personal / Send Money. Keep TrxID for verification.',
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 5. PDF SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pdf_settings (
    id TEXT PRIMARY KEY DEFAULT 'current',
    pdf_logo TEXT DEFAULT '',
    pdf_header TEXT DEFAULT 'RAG DAY 27 (RD27)',
    pdf_sub_header TEXT DEFAULT 'Official Registration Ledger',
    watermark_logo TEXT DEFAULT 'RD27 OFFICIAL',
    watermark_opacity NUMERIC DEFAULT 0.08,
    footer_text TEXT DEFAULT 'RD27 Rag Day 2027 Official Record · Unauthorized duplication prohibited.',
    signature_area TEXT DEFAULT 'Executive Convener',
    signature_title TEXT DEFAULT 'Authorized Rag Day 2027 Committee',
    approval_text TEXT DEFAULT 'APPROVED & VERIFIED',
    invitation_card_title TEXT DEFAULT 'RAG DAY 2027 - OFFICIAL INVITATION PASS',
    custom_notes TEXT DEFAULT 'Please present your printed pass or digital PDF at entry checkpoint for barcode scanning.',
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 6. EVENT CARDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.event_cards (
    id TEXT PRIMARY KEY,
    icon TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    sub_detail TEXT,
    custom_color TEXT DEFAULT 'indigo',
    display_order INTEGER DEFAULT 1,
    visible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 7. JERSEY SHOWCASE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.jersey_showcase (
    id TEXT PRIMARY KEY DEFAULT 'current',
    enabled BOOLEAN NOT NULL DEFAULT true,
    section_order TEXT NOT NULL DEFAULT 'showcase_first',
    jerseys JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 8. ADMIN FILES & ASSETS TABLE
-- Stores uploaded certificates, resumes, invitation cards, logos, banners, skills & projects
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admin_files (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL, -- 'logo', 'banner', 'jersey', 'certificate', 'resume', 'invitation', 'project', 'skill'
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_name TEXT,
    file_size TEXT,
    file_type TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_files_category ON public.admin_files (category);

-- ============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jersey_showcase ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_files ENABLE ROW LEVEL SECURITY;

-- Registrations RLS Policies:
-- 1. Anyone can insert their registration
DROP POLICY IF EXISTS "Public can submit registration" ON public.registrations;
CREATE POLICY "Public can submit registration" ON public.registrations
    FOR INSERT TO public WITH CHECK (true);

-- 2. Anyone can read registrations (to check their status or view invitation pass)
DROP POLICY IF EXISTS "Public can view registrations" ON public.registrations;
CREATE POLICY "Public can view registrations" ON public.registrations
    FOR SELECT TO public USING (true);

-- 3. Admins can update registrations (approvals, rejections, edits)
DROP POLICY IF EXISTS "Admins can update registrations" ON public.registrations;
CREATE POLICY "Admins can update registrations" ON public.registrations
    FOR UPDATE TO public USING (true) WITH CHECK (true);

-- 4. Admins can delete registrations
DROP POLICY IF EXISTS "Admins can delete registrations" ON public.registrations;
CREATE POLICY "Admins can delete registrations" ON public.registrations
    FOR DELETE TO public USING (true);

-- Settings RLS Policies:
-- Allow public select & admin update on all configuration tables
DROP POLICY IF EXISTS "Public can view event_settings" ON public.event_settings;
CREATE POLICY "Public can view event_settings" ON public.event_settings FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view branding_settings" ON public.branding_settings;
CREATE POLICY "Public can view branding_settings" ON public.branding_settings FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view payment_settings" ON public.payment_settings;
CREATE POLICY "Public can view payment_settings" ON public.payment_settings FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view pdf_settings" ON public.pdf_settings;
CREATE POLICY "Public can view pdf_settings" ON public.pdf_settings FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view event_cards" ON public.event_cards;
CREATE POLICY "Public can view event_cards" ON public.event_cards FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view jersey_showcase" ON public.jersey_showcase;
CREATE POLICY "Public can view jersey_showcase" ON public.jersey_showcase FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can manage admin_files" ON public.admin_files;
CREATE POLICY "Public can manage admin_files" ON public.admin_files FOR ALL TO public USING (true) WITH CHECK (true);

-- ============================================================================
-- 10. SUPABASE STORAGE BUCKET: uploads
-- Create the public bucket for logos, banners, jerseys, certificates, resumes, and photos
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS Policies: Allow public read and upload
DROP POLICY IF EXISTS "Public can view uploaded files" ON storage.objects;
CREATE POLICY "Public can view uploaded files" ON storage.objects
    FOR SELECT TO public USING (bucket_id = 'uploads');

DROP POLICY IF EXISTS "Public can upload files" ON storage.objects;
CREATE POLICY "Public can upload files" ON storage.objects
    FOR INSERT TO public WITH CHECK (bucket_id = 'uploads');

DROP POLICY IF EXISTS "Public can update uploaded files" ON storage.objects;
CREATE POLICY "Public can update uploaded files" ON storage.objects
    FOR UPDATE TO public USING (bucket_id = 'uploads') WITH CHECK (bucket_id = 'uploads');

DROP POLICY IF EXISTS "Public can delete uploaded files" ON storage.objects;
CREATE POLICY "Public can delete uploaded files" ON storage.objects
    FOR DELETE TO public USING (bucket_id = 'uploads');
