-- Enums
CREATE TYPE public.app_role AS ENUM ('client','handyman','admin');
CREATE TYPE public.task_status AS ENUM ('pending','negotiating','agreed','in_progress','completed','cancelled');
CREATE TYPE public.offer_status AS ENUM ('pending','accepted','declined','withdrawn');

-- Shared updated_at trigger fn
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  email text,
  avatar text,
  location text,
  bio text,
  specialties text[] NOT NULL DEFAULT '{}',
  rating numeric(2,1) NOT NULL DEFAULT 0,
  reviews_count integer NOT NULL DEFAULT 0,
  daily_rate numeric(10,2),
  available boolean NOT NULL DEFAULT true,
  jobs_done integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are publicly readable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- USER ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- New user handler
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.email,
    upper(left(COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), 2))
  )
  ON CONFLICT (id) DO NOTHING;

  _role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role',''), 'client')::public.app_role;
  IF _role = 'admin' THEN _role := 'client'; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CATEGORIES
CREATE TABLE public.repair_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'Wrench',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.repair_categories TO anon, authenticated;
GRANT ALL ON public.repair_categories TO service_role;
ALTER TABLE public.repair_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are publicly readable" ON public.repair_categories FOR SELECT USING (true);
CREATE POLICY "Admins manage categories" ON public.repair_categories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER update_repair_categories_updated_at BEFORE UPDATE ON public.repair_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.repair_categories (slug, name, description, icon) VALUES
('plumbing','Plumbing','Leaks, taps, pipes & boilers','Droplets'),
('electrical','Electrical','Sockets, lighting & wiring','Zap'),
('painting','Painting','Walls, ceilings & touch-ups','PaintRoller'),
('furniture-assembly','Furniture Assembly','Flat-pack builds & fitting','Sofa'),
('carpentry','Carpentry','Doors, shelving & woodwork','Hammer'),
('tiling','Tiling','Bathroom & kitchen tiling','Grid2x2'),
('drywall','Drywall','Patching, boarding & plaster','LayoutPanelTop'),
('general-repairs','General Repairs','Odd jobs around the home','Wrench'),
('minor-renovations','Minor Renovations','Small remodels & upgrades','Ruler');

-- TASK REQUESTS
CREATE TABLE public.task_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  handyman_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.repair_categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  preferred_date date,
  status public.task_status NOT NULL DEFAULT 'pending',
  budget numeric(10,2),
  agreed_price numeric(10,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_task_requests_client ON public.task_requests(client_id);
CREATE INDEX idx_task_requests_handyman ON public.task_requests(handyman_id);
CREATE INDEX idx_task_requests_status ON public.task_requests(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_requests TO authenticated;
GRANT ALL ON public.task_requests TO service_role;
ALTER TABLE public.task_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or assigned tasks readable" ON public.task_requests FOR SELECT TO authenticated
  USING (auth.uid() = client_id OR auth.uid() = handyman_id OR handyman_id IS NULL);
CREATE POLICY "Clients create own tasks" ON public.task_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Client or assigned handyman update task" ON public.task_requests FOR UPDATE TO authenticated
  USING (auth.uid() = client_id OR auth.uid() = handyman_id)
  WITH CHECK (auth.uid() = client_id OR auth.uid() = handyman_id);
CREATE POLICY "Clients delete own tasks" ON public.task_requests FOR DELETE TO authenticated USING (auth.uid() = client_id);
CREATE TRIGGER update_task_requests_updated_at BEFORE UPDATE ON public.task_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- OFFERS
CREATE TABLE public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.task_requests(id) ON DELETE CASCADE,
  handyman_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  price numeric(10,2) NOT NULL,
  message text NOT NULL DEFAULT '',
  status public.offer_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, handyman_id)
);
CREATE INDEX idx_offers_task ON public.offers(task_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Task owner or offering handyman read offers" ON public.offers FOR SELECT TO authenticated
  USING (auth.uid() = handyman_id OR EXISTS (SELECT 1 FROM public.task_requests t WHERE t.id = task_id AND t.client_id = auth.uid()));
CREATE POLICY "Handymen create own offers" ON public.offers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = handyman_id AND public.has_role(auth.uid(),'handyman'));
CREATE POLICY "Handyman updates own offer" ON public.offers FOR UPDATE TO authenticated
  USING (auth.uid() = handyman_id) WITH CHECK (auth.uid() = handyman_id);
CREATE POLICY "Task owner updates offer status" ON public.offers FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.task_requests t WHERE t.id = task_id AND t.client_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.task_requests t WHERE t.id = task_id AND t.client_id = auth.uid()));
CREATE POLICY "Handyman deletes own offer" ON public.offers FOR DELETE TO authenticated USING (auth.uid() = handyman_id);
CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- MESSAGES
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.task_requests(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_task ON public.messages(task_id, created_at);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Task participants read messages" ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.task_requests t WHERE t.id = task_id AND (t.client_id = auth.uid() OR t.handyman_id = auth.uid())));
CREATE POLICY "Task participants send messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.task_requests t WHERE t.id = task_id AND (t.client_id = auth.uid() OR t.handyman_id = auth.uid())));

-- REVIEWS
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL UNIQUE REFERENCES public.task_requests(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  handyman_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_reviews_handyman ON public.reviews(handyman_id);
GRANT SELECT, INSERT, UPDATE ON public.reviews TO authenticated;
GRANT SELECT ON public.reviews TO anon;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews are publicly readable" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Clients review own completed tasks" ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = client_id AND EXISTS (SELECT 1 FROM public.task_requests t WHERE t.id = task_id AND t.client_id = auth.uid() AND t.handyman_id = reviews.handyman_id AND t.status = 'completed'));
CREATE POLICY "Clients update own reviews" ON public.reviews FOR UPDATE TO authenticated
  USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Rating aggregation
CREATE OR REPLACE FUNCTION public.refresh_handyman_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _h uuid;
BEGIN
  _h := COALESCE(NEW.handyman_id, OLD.handyman_id);
  UPDATE public.profiles p SET
    rating = COALESCE((SELECT round(avg(r.rating)::numeric, 1) FROM public.reviews r WHERE r.handyman_id = _h), 0),
    reviews_count = (SELECT count(*) FROM public.reviews r WHERE r.handyman_id = _h)
  WHERE p.id = _h;
  RETURN NULL;
END; $$;

CREATE TRIGGER reviews_refresh_rating AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.refresh_handyman_rating();