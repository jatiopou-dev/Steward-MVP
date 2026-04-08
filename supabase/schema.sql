-- Core schemas for Steward SaaS

-- 1. Organizations (Churches, Networks)
CREATE TABLE public.organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    denomination TEXT NOT NULL, -- 'baptist', 'anglican', etc.
    tier TEXT DEFAULT 'church' NOT NULL, -- 'seed', 'church', 'network'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Denomination Config 
-- The "Crown Jewel" engine that adapts terminology
CREATE TABLE public.denomination_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    giving_term TEXT DEFAULT 'Planned giving',
    body_term TEXT DEFAULT 'Church Board',
    minister_term TEXT DEFAULT 'Pastor',
    tier_term TEXT DEFAULT 'Conference',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(org_id)
);

-- 3. Users (Profiles linked to Supabase Auth)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    full_name TEXT,
    role TEXT DEFAULT 'treasurer', -- 'treasurer', 'pastor', 'admin'
    is_gift_aid_eligible BOOLEAN DEFAULT FALSE,
    address_line_1 TEXT,
    postcode TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Transactions table (Tracks income, expenditure, and Gift Aid claims)
CREATE TABLE public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    amount_pence INTEGER NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_gift_aid_claimed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
