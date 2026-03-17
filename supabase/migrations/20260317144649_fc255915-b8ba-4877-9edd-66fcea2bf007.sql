
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Create contributions table
CREATE TABLE public.contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  week_number INT NOT NULL,
  year INT NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by UUID NOT NULL REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leaders can view all contributions" ON public.contributions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'leader'));

CREATE POLICY "Leaders can insert contributions" ON public.contributions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'leader'));

CREATE POLICY "Leaders can update contributions" ON public.contributions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'leader'));

CREATE POLICY "Leaders can delete contributions" ON public.contributions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'leader'));

CREATE POLICY "Members can view own contributions" ON public.contributions FOR SELECT TO authenticated
  USING (member_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Create reminders table
CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_number INT NOT NULL,
  year INT NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leaders can view all reminders" ON public.reminders FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'leader'));

CREATE POLICY "Leaders can insert reminders" ON public.reminders FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'leader'));

CREATE POLICY "Leaders can delete reminders" ON public.reminders FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'leader'));

CREATE POLICY "Members can view own reminders" ON public.reminders FOR SELECT TO authenticated
  USING (member_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Members can update own reminders read status" ON public.reminders FOR UPDATE TO authenticated
  USING (member_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Create payment deadlines table
CREATE TABLE public.payment_deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number INT NOT NULL,
  year INT NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  deadline_date DATE NOT NULL,
  amount_due NUMERIC(10,2) NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_deadlines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view deadlines" ON public.payment_deadlines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leaders can insert deadlines" ON public.payment_deadlines FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'leader'));
CREATE POLICY "Leaders can update deadlines" ON public.payment_deadlines FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'leader'));
CREATE POLICY "Leaders can delete deadlines" ON public.payment_deadlines FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'leader'));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.phone);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
