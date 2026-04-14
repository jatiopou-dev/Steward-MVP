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

-- ==========================================
-- Phase 2: Auth Triggers for User Sync
-- ==========================================

-- Function to handle new user registration from Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    'treasurer' -- default role
  );
  RETURN NEW;
END;
$$;

-- Trigger the function on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- Phase 3: Row Level Security (RLS)
-- ==========================================

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.denomination_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read/edit their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- Organizations: users can view their own organization
CREATE POLICY "Users can view their organization" 
ON public.organizations FOR SELECT 
USING (id IN (
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
));

-- Denomination Config: users can view their organization's config
CREATE POLICY "Users can view their org's denomination config" 
ON public.denomination_config FOR SELECT 
USING (org_id IN (
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
));

-- Transactions: users can view/insert/update transactions in their org
CREATE POLICY "Users can view their org's transactions" 
ON public.transactions FOR SELECT 
USING (org_id IN (
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can insert their org's transactions" 
ON public.transactions FOR INSERT 
WITH CHECK (org_id IN (
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can update their org's transactions" 
ON public.transactions FOR UPDATE 
USING (org_id IN (
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
))
WITH CHECK (org_id IN (
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
));
