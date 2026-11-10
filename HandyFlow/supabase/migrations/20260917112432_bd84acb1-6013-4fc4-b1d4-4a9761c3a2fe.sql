CREATE TABLE public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT '',
  author_role text NOT NULL DEFAULT '',
  quote text NOT NULL,
  rating integer NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.testimonials TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.testimonials TO authenticated;
GRANT ALL ON public.testimonials TO service_role;

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved testimonials are public" ON public.testimonials
  FOR SELECT USING (status = 'approved');
CREATE POLICY "Users read own testimonials" ON public.testimonials
  FOR SELECT TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "Admins read all testimonials" ON public.testimonials
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own testimonials" ON public.testimonials
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users update own pending testimonials" ON public.testimonials
  FOR UPDATE TO authenticated USING (auth.uid() = author_id AND status = 'pending')
  WITH CHECK (auth.uid() = author_id AND status = 'pending');
CREATE POLICY "Users delete own testimonials" ON public.testimonials
  FOR DELETE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "Admins manage testimonials" ON public.testimonials
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete testimonials" ON public.testimonials
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_testimonials_updated_at BEFORE UPDATE ON public.testimonials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX testimonials_status_idx ON public.testimonials (status, created_at DESC);

CREATE TABLE public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site settings are public" ON public.site_settings
  FOR SELECT USING (true);
CREATE POLICY "Admins write site settings" ON public.site_settings
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.site_settings (key, value) VALUES ('testimonials', '{"enabled": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;