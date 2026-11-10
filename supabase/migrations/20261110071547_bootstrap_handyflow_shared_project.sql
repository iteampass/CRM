-- Bootstrap ONLY an empty handyflow schema in the shared destination.
-- Do not replay this alongside the original public-schema migration history.
BEGIN;
SET LOCAL lock_timeout='10s';
CREATE SCHEMA IF NOT EXISTS handyflow;
REVOKE ALL ON SCHEMA handyflow FROM PUBLIC;
GRANT USAGE ON SCHEMA handyflow TO anon,authenticated,service_role;
REVOKE CREATE ON SCHEMA handyflow FROM anon,authenticated;
--
-- PostgreSQL database dump
--



-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.2

SET LOCAL statement_timeout = '120s';

SET LOCAL idle_in_transaction_session_timeout = 0;
SET LOCAL transaction_timeout = 0;
SET LOCAL client_encoding = 'UTF8';
SET LOCAL standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', true);
SET LOCAL check_function_bodies = false;
SET LOCAL xmloption = content;
SET LOCAL client_min_messages = warning;
SET LOCAL row_security = off;

--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE handyflow.app_role AS ENUM (
    'client',
    'handyman',
    'admin'
);


--
-- Name: offer_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE handyflow.offer_status AS ENUM (
    'pending',
    'accepted',
    'declined',
    'withdrawn'
);


--
-- Name: task_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE handyflow.task_status AS ENUM (
    'pending',
    'negotiating',
    'agreed',
    'in_progress',
    'completed',
    'cancelled'
);


--
-- Name: get_request_client_contact(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION handyflow.get_request_client_contact(_task_id uuid) RETURNS TABLE(name text, email text, phones text[], address text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  actor uuid := auth.uid();
BEGIN
  IF actor IS NULL OR NOT handyflow.has_role(actor, 'handyman') THEN
    RAISE EXCEPTION 'Only signed-in handymen can view client contact details' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT p.name, p.email, p.phones, p.address
    FROM handyflow.task_requests t
    JOIN handyflow.profiles p ON p.id = t.client_id
    JOIN handyflow.profiles me ON me.id = actor
    WHERE t.id = _task_id
      AND nullif(upper(trim(me.country_code)), '') = nullif(upper(trim(p.country_code)), '')
      AND (t.handyman_id = actor OR
        (t.handyman_id IS NULL AND t.status IN ('pending', 'negotiating')));
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client contact details are not available for this request' USING ERRCODE = '42501';
  END IF;
END;
$$;


--
-- Name: get_request_participant_contact(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION handyflow.get_request_participant_contact(_task_id uuid) RETURNS TABLE(name text, email text, phones text[], address text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE actor uuid := auth.uid();
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Sign in to view contact details' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT p.name, p.email, p.phones, p.address
    FROM handyflow.task_requests t
    JOIN handyflow.profiles p ON p.id = CASE
      WHEN t.client_id = actor THEN t.handyman_id
      ELSE t.client_id END
    WHERE t.id = _task_id AND t.handyman_id IS NOT NULL
      AND (t.client_id = actor OR t.handyman_id = actor);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contact details are available only to the client and assigned handyman of a taken request' USING ERRCODE = '42501';
  END IF;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION handyflow.enroll() RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  NEW auth.users%ROWTYPE;
  _role handyflow.app_role;
  _first text;
  _last text;
  _name text;
BEGIN
  SELECT * INTO NEW FROM auth.users WHERE id = auth.uid();
  IF NEW.id IS NULL OR NEW.email_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'A verified email account is required' USING ERRCODE = '42501';
  END IF;
  -- Serialize enrollment so concurrent auth callbacks cannot add a second role.
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.id::text, 0));
  IF EXISTS (SELECT 1 FROM handyflow.user_roles WHERE user_id=NEW.id) THEN
    IF NOT EXISTS (SELECT 1 FROM handyflow.profiles WHERE id=NEW.id) THEN
      RAISE EXCEPTION 'Account profile requires restoration';
    END IF;
    RETURN NEW.id;
  END IF;
  -- Only signup through HandyFlow supplies its optional onboarding fields.
  IF NEW.raw_user_meta_data->>'app' IS DISTINCT FROM 'handyflow' THEN
    NEW.raw_user_meta_data := jsonb_build_object('name', NEW.raw_user_meta_data->>'full_name');
  END IF;
  _first := NULLIF(trim(NEW.raw_user_meta_data->>'first_name'), '');
  _last  := NULLIF(trim(NEW.raw_user_meta_data->>'last_name'), '');
  _name := NULLIF(trim(concat_ws(' ', _first, _last)), '');
  _name := COALESCE(
    _name,
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO handyflow.profiles (id, name, first_name, last_name, email, avatar, address, phones, is_public, nickname,
    street, street_number, floor, zip_code, city, country, country_code,
    latitude, longitude, formatted_address)
  VALUES (
    NEW.id,
    _name,
    _first,
    _last,
    NEW.email,
    upper(left(_name, 2)),
    NULLIF(NEW.raw_user_meta_data->>'address',''),
    CASE WHEN COALESCE(NEW.raw_user_meta_data->>'phone','') = '' THEN '{}'::text[]
         ELSE ARRAY[NEW.raw_user_meta_data->>'phone'] END,
    COALESCE((NEW.raw_user_meta_data->>'is_public')::boolean, true),
    NULLIF(NEW.raw_user_meta_data->>'nickname',''),
    NULLIF(NEW.raw_user_meta_data->>'street',''),
    NULLIF(NEW.raw_user_meta_data->>'street_number',''),
    NULLIF(NEW.raw_user_meta_data->>'floor',''),
    NULLIF(NEW.raw_user_meta_data->>'zip_code',''),
    NULLIF(NEW.raw_user_meta_data->>'city',''),
    NULLIF(NEW.raw_user_meta_data->>'country',''),
    NULLIF(NEW.raw_user_meta_data->>'country_code',''),
    NULLIF(NEW.raw_user_meta_data->>'latitude','')::double precision,
    NULLIF(NEW.raw_user_meta_data->>'longitude','')::double precision,
    NULLIF(NEW.raw_user_meta_data->>'formatted_address','')
  )
  ON CONFLICT (id) DO NOTHING;

  _role := CASE WHEN NEW.raw_user_meta_data->>'role' = 'handyman' THEN 'handyman'::handyflow.app_role ELSE 'client'::handyflow.app_role END;
  IF _role = 'admin' THEN _role := 'client'; END IF;
  INSERT INTO handyflow.user_roles (user_id, role) VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW.id;
END; $$;


--
-- Name: has_role(uuid, handyflow.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION handyflow.has_role(_user_id uuid, _role handyflow.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'handyflow', 'pg_temp'
    AS $$
  SELECT EXISTS (SELECT 1 FROM handyflow.user_roles WHERE user_id = _user_id AND role = _role)
$$;


--
-- Name: refresh_handyman_rating(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION handyflow.refresh_handyman_rating() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'handyflow', 'pg_temp'
    AS $$
DECLARE _h uuid;
BEGIN
  _h := COALESCE(NEW.handyman_id, OLD.handyman_id);
  UPDATE handyflow.profiles p SET
    rating = COALESCE((SELECT round(avg(r.rating)::numeric, 1) FROM handyflow.reviews r WHERE r.handyman_id = _h AND r.direction = 'client_to_handyman'), 0),
    reviews_count = (SELECT count(*) FROM handyflow.reviews r WHERE r.handyman_id = _h AND r.direction = 'client_to_handyman')
  WHERE p.id = _h;
  RETURN NULL;
END; $$;


--
-- Name: resolve_offer(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION handyflow.resolve_offer(_offer_id uuid, _action text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  _actor uuid := auth.uid();
  _task_id uuid;
  _task handyflow.task_requests%ROWTYPE;
  _offer handyflow.offers%ROWTYPE;
BEGIN
  IF _actor IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF _action IS NULL OR _action NOT IN ('accept', 'decline', 'another', 'withdraw') THEN
    RAISE EXCEPTION 'Invalid offer action';
  END IF;
  SELECT task_id INTO _task_id FROM handyflow.offers WHERE id = _offer_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offer not found'; END IF;
  SELECT * INTO _task FROM handyflow.task_requests WHERE id = _task_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  SELECT * INTO _offer FROM handyflow.offers WHERE id = _offer_id FOR UPDATE;
  IF NOT FOUND OR _offer.task_id IS DISTINCT FROM _task_id THEN
    RAISE EXCEPTION 'Offer changed; refresh and try again';
  END IF;
  IF _action = 'withdraw' THEN
    IF _offer.handyman_id <> _actor THEN RAISE EXCEPTION 'Only the offering handyman can withdraw'; END IF;
  ELSIF _task.client_id <> _actor THEN
    RAISE EXCEPTION 'Only the client can accept or reject an offer';
  END IF;
  IF _offer.status <> 'pending' THEN RAISE EXCEPTION 'This offer is no longer pending'; END IF;
  IF _task.status NOT IN ('pending', 'negotiating') THEN
    RAISE EXCEPTION 'This request is no longer accepting offer changes';
  END IF;
  IF _task.handyman_id IS DISTINCT FROM _offer.handyman_id THEN
    RAISE EXCEPTION 'This offer is no longer assigned to the request';
  END IF;

  IF _action = 'accept' THEN
    UPDATE handyflow.task_requests SET status = 'agreed', agreed_price = _offer.price
    WHERE id = _task_id;
    UPDATE handyflow.offers SET status = CASE WHEN id = _offer_id
      THEN 'accepted'::handyflow.offer_status ELSE 'declined'::handyflow.offer_status END
    WHERE task_id = _task_id AND status = 'pending';
    INSERT INTO handyflow.task_events (task_id, actor_id, actor_role, type, message, price)
    VALUES (_task_id, _actor, 'client', 'offer_accepted',
      'Client accepted the offer — price agreed', _offer.price);
    RETURN;
  END IF;

  UPDATE handyflow.offers SET status = CASE WHEN _action = 'withdraw'
    THEN 'withdrawn'::handyflow.offer_status ELSE 'declined'::handyflow.offer_status END
  WHERE id = _offer_id;
  UPDATE handyflow.task_requests SET status = 'pending', agreed_price = NULL,
    handyman_id = CASE WHEN _action = 'another' THEN handyman_id ELSE NULL END
  WHERE id = _task_id;
  INSERT INTO handyflow.task_events (task_id, actor_id, actor_role, type, message)
  VALUES (_task_id, _actor,
    CASE WHEN _action = 'withdraw' THEN 'handyman' ELSE 'client' END,
    CASE _action WHEN 'withdraw' THEN 'offer_withdrawn'
      WHEN 'another' THEN 'another_offer_requested' ELSE 'offer_declined' END,
    CASE _action WHEN 'withdraw' THEN 'Handyman withdrew the offer — request is open again'
      WHEN 'another' THEN 'Client asked for another offer'
      ELSE 'Client declined the offer — request is open again' END);
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION handyflow.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'handyflow', 'pg_temp'
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;


--
-- Name: validate_profile_phones(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION handyflow.validate_profile_phones() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'handyflow', 'pg_temp'
    AS $$
BEGIN
  IF array_length(NEW.phones, 1) > 3 THEN
    RAISE EXCEPTION 'At most 3 phone numbers are allowed';
  END IF;
  RETURN NEW;
END; $$;


SET LOCAL default_tablespace = '';

SET LOCAL default_table_access_method = heap;

--
-- Name: handyman_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE handyflow.handyman_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inviter_id uuid NOT NULL,
    email text NOT NULL,
    name text DEFAULT ''::text NOT NULL,
    message text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE handyflow.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE handyflow.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    task_id uuid,
    title text NOT NULL,
    body text DEFAULT ''::text NOT NULL,
    read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY handyflow.notifications REPLICA IDENTITY FULL;


--
-- Name: offers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE handyflow.offers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    handyman_id uuid NOT NULL,
    price numeric(10,2) NOT NULL,
    message text DEFAULT ''::text NOT NULL,
    status handyflow.offer_status DEFAULT 'pending'::handyflow.offer_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE handyflow.profiles (
    id uuid NOT NULL,
    name text DEFAULT ''::text NOT NULL,
    email text,
    avatar text,
    location text,
    bio text,
    specialties text[] DEFAULT '{}'::text[] NOT NULL,
    rating numeric(2,1) DEFAULT 0 NOT NULL,
    reviews_count integer DEFAULT 0 NOT NULL,
    daily_rate numeric(10,2),
    available boolean DEFAULT true NOT NULL,
    jobs_done integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    headline text,
    is_demo boolean DEFAULT false NOT NULL,
    address text,
    phones text[] DEFAULT '{}'::text[] NOT NULL,
    avatar_url text,
    is_public boolean DEFAULT true NOT NULL,
    nickname text,
    street text,
    street_number text,
    floor text,
    zip_code text,
    city text,
    country text,
    country_code text,
    latitude double precision,
    longitude double precision,
    formatted_address text,
    first_name text,
    last_name text
);


--
-- Name: task_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE handyflow.task_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    handyman_id uuid,
    category_id uuid,
    title text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    location text DEFAULT ''::text NOT NULL,
    preferred_date date,
    status handyflow.task_status DEFAULT 'pending'::handyflow.task_status NOT NULL,
    budget numeric(10,2),
    agreed_price numeric(10,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    priority text DEFAULT 'Medium'::text NOT NULL,
    progress integer DEFAULT 0 NOT NULL,
    budget_max numeric,
    start_time time without time zone,
    end_time time without time zone,
    is_demo boolean DEFAULT false NOT NULL,
    cancel_requested_by uuid,
    postponed_to date,
    postpone_requested_by uuid,
    postpone_requested_date date,
    postpone_reason text,
    postpone_requested_time time without time zone
);


--
-- Name: profile_directory; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW handyflow.profile_directory WITH (security_barrier='true') AS
 SELECT id,
    name,
    avatar,
    headline,
    rating,
    reviews_count,
    jobs_done,
    daily_rate,
    available,
    country_code,
    bio,
    location,
    specialties,
    city,
    country,
    is_public
   FROM handyflow.profiles p
  WHERE ((auth.uid() IS NOT NULL) AND (handyflow.has_role(auth.uid(), 'client') OR handyflow.has_role(auth.uid(), 'handyman') OR handyflow.has_role(auth.uid(), 'admin')) AND (is_public OR (id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM handyflow.task_requests t
          WHERE (((p.id = t.client_id) OR (p.id = t.handyman_id)) AND ((auth.uid() = t.client_id) OR (auth.uid() = t.handyman_id) OR ((t.handyman_id IS NULL) AND handyflow.has_role(auth.uid(), 'handyman'::handyflow.app_role))))))));


--
-- Name: repair_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE handyflow.repair_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    icon text DEFAULT 'Wrench'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE handyflow.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    client_id uuid NOT NULL,
    handyman_id uuid NOT NULL,
    rating integer NOT NULL,
    comment text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewer_id uuid NOT NULL,
    direction text DEFAULT 'client_to_handyman'::text NOT NULL,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: site_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE handyflow.site_settings (
    key text NOT NULL,
    value jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: task_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE handyflow.task_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    actor_id uuid,
    actor_role text DEFAULT 'system'::text NOT NULL,
    type text NOT NULL,
    message text DEFAULT ''::text NOT NULL,
    price numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: testimonials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE handyflow.testimonials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    author_id uuid NOT NULL,
    author_name text DEFAULT ''::text NOT NULL,
    author_role text DEFAULT ''::text NOT NULL,
    quote text NOT NULL,
    rating integer DEFAULT 5 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    featured boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT testimonials_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT testimonials_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE handyflow.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role handyflow.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: FUNCTION get_request_client_contact(_task_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION handyflow.get_request_client_contact(_task_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION handyflow.get_request_client_contact(_task_id uuid) TO authenticated;
GRANT ALL ON FUNCTION handyflow.get_request_client_contact(_task_id uuid) TO service_role;


--
-- Name: FUNCTION get_request_participant_contact(_task_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION handyflow.get_request_participant_contact(_task_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION handyflow.get_request_participant_contact(_task_id uuid) TO authenticated;
GRANT ALL ON FUNCTION handyflow.get_request_participant_contact(_task_id uuid) TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION handyflow.enroll() FROM PUBLIC;
GRANT ALL ON FUNCTION handyflow.enroll() TO service_role;


--
-- Name: FUNCTION has_role(_user_id uuid, _role handyflow.app_role); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION handyflow.has_role(_user_id uuid, _role handyflow.app_role) FROM PUBLIC;
GRANT ALL ON FUNCTION handyflow.has_role(_user_id uuid, _role handyflow.app_role) TO authenticated;
GRANT ALL ON FUNCTION handyflow.has_role(_user_id uuid, _role handyflow.app_role) TO service_role;


--
-- Name: FUNCTION refresh_handyman_rating(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION handyflow.refresh_handyman_rating() FROM PUBLIC;
GRANT ALL ON FUNCTION handyflow.refresh_handyman_rating() TO service_role;


--
-- Name: FUNCTION resolve_offer(_offer_id uuid, _action text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION handyflow.resolve_offer(_offer_id uuid, _action text) FROM PUBLIC;
GRANT ALL ON FUNCTION handyflow.resolve_offer(_offer_id uuid, _action text) TO authenticated;
GRANT ALL ON FUNCTION handyflow.resolve_offer(_offer_id uuid, _action text) TO service_role;


--
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION handyflow.update_updated_at_column() FROM PUBLIC;
GRANT ALL ON FUNCTION handyflow.update_updated_at_column() TO service_role;


--
-- Name: FUNCTION validate_profile_phones(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION handyflow.validate_profile_phones() FROM PUBLIC;
GRANT ALL ON FUNCTION handyflow.validate_profile_phones() TO authenticated;
GRANT ALL ON FUNCTION handyflow.validate_profile_phones() TO service_role;


--
-- Name: TABLE handyman_invites; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE handyflow.handyman_invites TO authenticated;
GRANT ALL ON TABLE handyflow.handyman_invites TO service_role;


--
-- Name: TABLE messages; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT ON TABLE handyflow.messages TO authenticated;
GRANT ALL ON TABLE handyflow.messages TO service_role;


--
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,DELETE,UPDATE ON TABLE handyflow.notifications TO authenticated;
GRANT ALL ON TABLE handyflow.notifications TO service_role;


--
-- Name: TABLE offers; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE handyflow.offers TO authenticated;
GRANT ALL ON TABLE handyflow.offers TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE handyflow.profiles TO authenticated;
GRANT ALL ON TABLE handyflow.profiles TO service_role;


--
-- Name: TABLE task_requests; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE handyflow.task_requests TO authenticated;
GRANT ALL ON TABLE handyflow.task_requests TO service_role;


--
-- Name: TABLE profile_directory; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE handyflow.profile_directory TO authenticated;


--
-- Name: TABLE repair_categories; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE handyflow.repair_categories TO anon;
GRANT SELECT ON TABLE handyflow.repair_categories TO authenticated;
GRANT ALL ON TABLE handyflow.repair_categories TO service_role;


--
-- Name: TABLE reviews; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE handyflow.reviews TO anon;
GRANT SELECT,INSERT,UPDATE ON TABLE handyflow.reviews TO authenticated;
GRANT ALL ON TABLE handyflow.reviews TO service_role;


--
-- Name: TABLE site_settings; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE handyflow.site_settings TO anon;
GRANT SELECT,INSERT,UPDATE ON TABLE handyflow.site_settings TO authenticated;
GRANT ALL ON TABLE handyflow.site_settings TO service_role;


--
-- Name: TABLE task_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE handyflow.task_events TO service_role;
GRANT SELECT,INSERT ON TABLE handyflow.task_events TO authenticated;


--
-- Name: TABLE testimonials; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE handyflow.testimonials TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE handyflow.testimonials TO authenticated;
GRANT ALL ON TABLE handyflow.testimonials TO service_role;


--
-- Name: TABLE user_roles; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT ON TABLE handyflow.user_roles TO authenticated;
GRANT ALL ON TABLE handyflow.user_roles TO service_role;


--
-- PostgreSQL database dump complete
--



--
-- PostgreSQL database dump
--



-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.2

SET LOCAL statement_timeout = '120s';

SET LOCAL idle_in_transaction_session_timeout = 0;
SET LOCAL transaction_timeout = 0;
SET LOCAL client_encoding = 'UTF8';
SET LOCAL standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', true);
SET LOCAL check_function_bodies = false;
SET LOCAL xmloption = content;
SET LOCAL client_min_messages = warning;
SET LOCAL row_security = off;

SET LOCAL default_tablespace = '';

--
-- Name: handyman_invites handyman_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY handyflow.handyman_invites
    ADD CONSTRAINT handyman_invites_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY handyflow.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY handyflow.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: offers offers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY handyflow.offers
    ADD CONSTRAINT offers_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY handyflow.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: repair_categories repair_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY handyflow.repair_categories
    ADD CONSTRAINT repair_categories_pkey PRIMARY KEY (id);


--
-- Name: repair_categories repair_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY handyflow.repair_categories
    ADD CONSTRAINT repair_categories_slug_key UNIQUE (slug);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY handyflow.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: site_settings site_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY handyflow.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (key);


--
-- Name: task_events task_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY handyflow.task_events
    ADD CONSTRAINT task_events_pkey PRIMARY KEY (id);


--
-- Name: task_requests task_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY handyflow.task_requests
    ADD CONSTRAINT task_requests_pkey PRIMARY KEY (id);


--
-- Name: testimonials testimonials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY handyflow.testimonials
    ADD CONSTRAINT testimonials_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY handyflow.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY handyflow.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: handyman_invites_inviter_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX handyman_invites_inviter_idx ON handyflow.handyman_invites USING btree (inviter_id);


--
-- Name: idx_messages_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_task ON handyflow.messages USING btree (task_id, created_at);


--
-- Name: idx_offers_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_offers_task ON handyflow.offers USING btree (task_id);


--
-- Name: idx_reviews_handyman; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_handyman ON handyflow.reviews USING btree (handyman_id);


--
-- Name: idx_task_events_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_events_task ON handyflow.task_events USING btree (task_id);


--
-- Name: idx_task_requests_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_requests_client ON handyflow.task_requests USING btree (client_id);


--
-- Name: idx_task_requests_handyman; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_requests_handyman ON handyflow.task_requests USING btree (handyman_id);


--
-- Name: idx_task_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_requests_status ON handyflow.task_requests USING btree (status);


--
-- Name: notifications_user_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_user_created_idx ON handyflow.notifications USING btree (user_id, created_at DESC);


--
-- Name: reviews_task_reviewer_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX reviews_task_reviewer_key ON handyflow.reviews USING btree (task_id, reviewer_id);


--
-- Name: testimonials_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX testimonials_status_idx ON handyflow.testimonials USING btree (status, created_at DESC);


--
-- Name: profiles profiles_validate_phones; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER profiles_validate_phones BEFORE INSERT OR UPDATE ON handyflow.profiles FOR EACH ROW EXECUTE FUNCTION handyflow.validate_profile_phones();


--
-- Name: reviews reviews_refresh_rating; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER reviews_refresh_rating AFTER INSERT OR DELETE OR UPDATE ON handyflow.reviews FOR EACH ROW EXECUTE FUNCTION handyflow.refresh_handyman_rating();


--
-- Name: offers update_offers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON handyflow.offers FOR EACH ROW EXECUTE FUNCTION handyflow.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON handyflow.profiles FOR EACH ROW EXECUTE FUNCTION handyflow.update_updated_at_column();


--
-- Name: repair_categories update_repair_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_repair_categories_updated_at BEFORE UPDATE ON handyflow.repair_categories FOR EACH ROW EXECUTE FUNCTION handyflow.update_updated_at_column();


--
-- Name: reviews update_reviews_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON handyflow.reviews FOR EACH ROW EXECUTE FUNCTION handyflow.update_updated_at_column();


--
-- Name: site_settings update_site_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON handyflow.site_settings FOR EACH ROW EXECUTE FUNCTION handyflow.update_updated_at_column();


--
-- Name: task_requests update_task_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_task_requests_updated_at BEFORE UPDATE ON handyflow.task_requests FOR EACH ROW EXECUTE FUNCTION handyflow.update_updated_at_column();


--
-- Name: testimonials update_testimonials_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_testimonials_updated_at BEFORE UPDATE ON handyflow.testimonials FOR EACH ROW EXECUTE FUNCTION handyflow.update_updated_at_column();


--
-- Name: handyman_invites handyman_invites_inviter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY handyflow.handyman_invites
    ADD CONSTRAINT handyman_invites_inviter_id_fkey FOREIGN KEY (inviter_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY handyflow.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES handyflow.profiles(id) ON DELETE CASCADE;


--
-- Name: messages messages_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY handyflow.messages
    ADD CONSTRAINT messages_task_id_fkey FOREIGN KEY (task_id) REFERENCES handyflow.task_requests(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY handyflow.notifications
    ADD CONSTRAINT notifications_task_id_fkey FOREIGN KEY (task_id) REFERENCES handyflow.task_requests(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY handyflow.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES handyflow.profiles(id) ON DELETE CASCADE;


--
-- Name: offers offers_handyman_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY handyflow.offers
    ADD CONSTRAINT offers_handyman_id_fkey FOREIGN KEY (handyman_id) REFERENCES handyflow.profiles(id) ON DELETE CASCADE;


--
-- Name: offers offers_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY handyflow.offers
    ADD CONSTRAINT offers_task_id_fkey FOREIGN KEY (task_id) REFERENCES handyflow.task_requests(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY handyflow.reviews
    ADD CONSTRAINT reviews_client_id_fkey FOREIGN KEY (client_id) REFERENCES handyflow.profiles(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_handyman_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY handyflow.reviews
    ADD CONSTRAINT reviews_handyman_id_fkey FOREIGN KEY (handyman_id) REFERENCES handyflow.profiles(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY handyflow.reviews
    ADD CONSTRAINT reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES handyflow.profiles(id);


--
-- Name: reviews reviews_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY handyflow.reviews
    ADD CONSTRAINT reviews_task_id_fkey FOREIGN KEY (task_id) REFERENCES handyflow.task_requests(id) ON DELETE CASCADE;


--
-- Name: task_events task_events_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY handyflow.task_events
    ADD CONSTRAINT task_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES handyflow.profiles(id);


--
-- Name: task_events task_events_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY handyflow.task_events
    ADD CONSTRAINT task_events_task_id_fkey FOREIGN KEY (task_id) REFERENCES handyflow.task_requests(id) ON DELETE CASCADE;


--
-- Name: task_requests task_requests_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY handyflow.task_requests
    ADD CONSTRAINT task_requests_category_id_fkey FOREIGN KEY (category_id) REFERENCES handyflow.repair_categories(id) ON DELETE SET NULL;


--
-- Name: task_requests task_requests_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY handyflow.task_requests
    ADD CONSTRAINT task_requests_client_id_fkey FOREIGN KEY (client_id) REFERENCES handyflow.profiles(id) ON DELETE CASCADE;


--
-- Name: task_requests task_requests_handyman_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY handyflow.task_requests
    ADD CONSTRAINT task_requests_handyman_id_fkey FOREIGN KEY (handyman_id) REFERENCES handyflow.profiles(id) ON DELETE SET NULL;


--
-- Name: task_requests task_requests_postpone_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY handyflow.task_requests
    ADD CONSTRAINT task_requests_postpone_requested_by_fkey FOREIGN KEY (postpone_requested_by) REFERENCES handyflow.profiles(id);


--
-- Name: testimonials testimonials_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY handyflow.testimonials
    ADD CONSTRAINT testimonials_author_id_fkey FOREIGN KEY (author_id) REFERENCES handyflow.profiles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY handyflow.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: testimonials Admins delete testimonials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins delete testimonials" ON handyflow.testimonials FOR DELETE TO authenticated USING (handyflow.has_role(auth.uid(), 'admin'::handyflow.app_role));


--
-- Name: testimonials Admins manage testimonials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage testimonials" ON handyflow.testimonials FOR UPDATE TO authenticated USING (handyflow.has_role(auth.uid(), 'admin'::handyflow.app_role)) WITH CHECK (handyflow.has_role(auth.uid(), 'admin'::handyflow.app_role));


--
-- Name: testimonials Admins read all testimonials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read all testimonials" ON handyflow.testimonials FOR SELECT TO authenticated USING (handyflow.has_role(auth.uid(), 'admin'::handyflow.app_role));


--
-- Name: site_settings Admins write site settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins write site settings" ON handyflow.site_settings TO authenticated USING (handyflow.has_role(auth.uid(), 'admin'::handyflow.app_role)) WITH CHECK (handyflow.has_role(auth.uid(), 'admin'::handyflow.app_role));


--
-- Name: testimonials Approved testimonials are public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Approved testimonials are public" ON handyflow.testimonials FOR SELECT USING ((status = 'approved'::text));


--
-- Name: repair_categories Categories are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Categories are publicly readable" ON handyflow.repair_categories FOR SELECT USING (true);


--
-- Name: task_requests Client or assigned handyman update task; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Client or assigned handyman update task" ON handyflow.task_requests FOR UPDATE TO authenticated USING (((auth.uid() = client_id) OR (auth.uid() = handyman_id))) WITH CHECK (((auth.uid() = client_id) OR (auth.uid() = handyman_id)));


--
-- Name: task_requests Clients create own tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients create own tasks" ON handyflow.task_requests FOR INSERT TO authenticated WITH CHECK ((auth.uid() = client_id));


--
-- Name: task_requests Clients delete own tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients delete own tasks" ON handyflow.task_requests FOR DELETE TO authenticated USING ((auth.uid() = client_id));


--
-- Name: task_requests Demo tasks readable by signed-in users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Demo tasks readable by signed-in users" ON handyflow.task_requests FOR SELECT TO authenticated USING ((is_demo = true));


--
-- Name: offers Handyman deletes own offer; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Handyman deletes own offer" ON handyflow.offers FOR DELETE TO authenticated USING ((auth.uid() = handyman_id));


--
-- Name: offers Handyman updates own offer; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Handyman updates own offer" ON handyflow.offers FOR UPDATE TO authenticated USING ((auth.uid() = handyman_id)) WITH CHECK ((auth.uid() = handyman_id));


--
-- Name: task_requests Handymen can claim unassigned tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Handymen can claim unassigned tasks" ON handyflow.task_requests FOR UPDATE TO authenticated USING (((handyman_id IS NULL) AND (status = 'pending'::handyflow.task_status) AND handyflow.has_role(auth.uid(), 'handyman'::handyflow.app_role))) WITH CHECK ((handyman_id = auth.uid()));


--
-- Name: offers Handymen create own offers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Handymen create own offers" ON handyflow.offers FOR INSERT TO authenticated WITH CHECK (((auth.uid() = handyman_id) AND handyflow.has_role(auth.uid(), 'handyman'::handyflow.app_role) AND (EXISTS ( SELECT 1
   FROM handyflow.task_requests t
  WHERE ((t.id = offers.task_id) AND ((t.handyman_id = auth.uid()) OR (t.handyman_id IS NULL)))))));


--
-- Name: task_requests Own or assigned tasks readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Own or assigned tasks readable" ON handyflow.task_requests FOR SELECT TO authenticated USING (((auth.uid() = client_id) OR (auth.uid() = handyman_id) OR (handyman_id IS NULL)));


--
-- Name: reviews Participants review completed tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Participants review completed tasks" ON handyflow.reviews FOR INSERT TO authenticated WITH CHECK (((auth.uid() = reviewer_id) AND (EXISTS ( SELECT 1
   FROM handyflow.task_requests t
  WHERE ((t.id = reviews.task_id) AND (t.status = 'completed'::handyflow.task_status) AND (t.client_id = reviews.client_id) AND (t.handyman_id = reviews.handyman_id) AND (((reviews.direction = 'client_to_handyman'::text) AND (t.client_id = auth.uid())) OR ((reviews.direction = 'handyman_to_client'::text) AND (t.handyman_id = auth.uid()))))))));


--
-- Name: reviews Reviewers update own reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Reviewers update own reviews" ON handyflow.reviews FOR UPDATE TO authenticated USING ((auth.uid() = reviewer_id)) WITH CHECK ((auth.uid() = reviewer_id));


--
-- Name: reviews Reviews are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Reviews are publicly readable" ON handyflow.reviews FOR SELECT USING (true);


--
-- Name: site_settings Site settings are public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Site settings are public" ON handyflow.site_settings FOR SELECT USING (true);


--
-- Name: offers Task owner or offering handyman read offers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Task owner or offering handyman read offers" ON handyflow.offers FOR SELECT TO authenticated USING (((auth.uid() = handyman_id) OR (EXISTS ( SELECT 1
   FROM handyflow.task_requests t
  WHERE ((t.id = offers.task_id) AND (t.client_id = auth.uid()))))));


--
-- Name: offers Task owner updates offer status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Task owner updates offer status" ON handyflow.offers FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM handyflow.task_requests t
  WHERE ((t.id = offers.task_id) AND (t.client_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM handyflow.task_requests t
  WHERE ((t.id = offers.task_id) AND (t.client_id = auth.uid())))));


--
-- Name: task_events Task participants add events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Task participants add events" ON handyflow.task_events FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM handyflow.task_requests t
  WHERE ((t.id = task_events.task_id) AND ((t.client_id = auth.uid()) OR (t.handyman_id = auth.uid()))))));


--
-- Name: task_events Task participants read events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Task participants read events" ON handyflow.task_events FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM handyflow.task_requests t
  WHERE ((t.id = task_events.task_id) AND ((t.client_id = auth.uid()) OR (t.handyman_id = auth.uid()))))));


--
-- Name: messages Task participants read messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Task participants read messages" ON handyflow.messages FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM handyflow.task_requests t
  WHERE ((t.id = messages.task_id) AND ((t.client_id = auth.uid()) OR (t.handyman_id = auth.uid()))))));


--
-- Name: messages Task participants send messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Task participants send messages" ON handyflow.messages FOR INSERT TO authenticated WITH CHECK (((auth.uid() = sender_id) AND (EXISTS ( SELECT 1
   FROM handyflow.task_requests t
  WHERE ((t.id = messages.task_id) AND ((t.client_id = auth.uid()) OR (t.handyman_id = auth.uid())))))));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON handyflow.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- Name: user_roles Users can read own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own roles" ON handyflow.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON handyflow.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: testimonials Users create own testimonials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users create own testimonials" ON handyflow.testimonials FOR INSERT TO authenticated WITH CHECK ((auth.uid() = author_id));


--
-- Name: notifications Users delete own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users delete own notifications" ON handyflow.notifications FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: testimonials Users delete own testimonials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users delete own testimonials" ON handyflow.testimonials FOR DELETE TO authenticated USING ((auth.uid() = author_id));


--
-- Name: handyman_invites Users manage own invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users manage own invites" ON handyflow.handyman_invites TO authenticated USING ((inviter_id = auth.uid())) WITH CHECK ((inviter_id = auth.uid()));


--
-- Name: profiles Users read own full profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users read own full profile" ON handyflow.profiles FOR SELECT TO authenticated USING ((id = ( SELECT auth.uid() AS uid)));


--
-- Name: notifications Users read own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users read own notifications" ON handyflow.notifications FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: testimonials Users read own testimonials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users read own testimonials" ON handyflow.testimonials FOR SELECT TO authenticated USING ((auth.uid() = author_id));


--
-- Name: notifications Users update own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users update own notifications" ON handyflow.notifications FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: testimonials Users update own pending testimonials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users update own pending testimonials" ON handyflow.testimonials FOR UPDATE TO authenticated USING (((auth.uid() = author_id) AND (status = 'pending'::text))) WITH CHECK (((auth.uid() = author_id) AND (status = 'pending'::text)));


--
-- Name: handyman_invites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE handyflow.handyman_invites ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE handyflow.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE handyflow.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: offers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE handyflow.offers ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE handyflow.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: repair_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE handyflow.repair_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE handyflow.reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: site_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE handyflow.site_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: task_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE handyflow.task_events ENABLE ROW LEVEL SECURITY;

--
-- Name: task_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE handyflow.task_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: testimonials; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE handyflow.testimonials ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE handyflow.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime notifications; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY handyflow.notifications;


--
-- Name: supabase_realtime task_requests; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY handyflow.task_requests;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--







--
-- PostgreSQL database dump complete
--



REVOKE ALL ON ALL TABLES IN SCHEMA handyflow FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA handyflow FROM PUBLIC,anon,authenticated,service_role;
GRANT ALL ON FUNCTION handyflow.get_request_client_contact(_task_id uuid) TO authenticated;
GRANT ALL ON FUNCTION handyflow.get_request_client_contact(_task_id uuid) TO service_role;
GRANT ALL ON FUNCTION handyflow.get_request_participant_contact(_task_id uuid) TO authenticated;
GRANT ALL ON FUNCTION handyflow.get_request_participant_contact(_task_id uuid) TO service_role;
GRANT ALL ON FUNCTION handyflow.enroll() TO service_role;
GRANT ALL ON FUNCTION handyflow.has_role(_user_id uuid, _role handyflow.app_role) TO authenticated;
GRANT ALL ON FUNCTION handyflow.has_role(_user_id uuid, _role handyflow.app_role) TO service_role;
GRANT ALL ON FUNCTION handyflow.refresh_handyman_rating() TO service_role;
GRANT ALL ON FUNCTION handyflow.resolve_offer(_offer_id uuid, _action text) TO authenticated;
GRANT ALL ON FUNCTION handyflow.resolve_offer(_offer_id uuid, _action text) TO service_role;
GRANT ALL ON FUNCTION handyflow.update_updated_at_column() TO service_role;
GRANT ALL ON FUNCTION handyflow.validate_profile_phones() TO authenticated;
GRANT ALL ON FUNCTION handyflow.validate_profile_phones() TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE handyflow.handyman_invites TO authenticated;
GRANT ALL ON TABLE handyflow.handyman_invites TO service_role;
GRANT SELECT,INSERT ON TABLE handyflow.messages TO authenticated;
GRANT ALL ON TABLE handyflow.messages TO service_role;
GRANT SELECT,DELETE,UPDATE ON TABLE handyflow.notifications TO authenticated;
GRANT ALL ON TABLE handyflow.notifications TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE handyflow.offers TO authenticated;
GRANT ALL ON TABLE handyflow.offers TO service_role;
GRANT SELECT,INSERT,UPDATE ON TABLE handyflow.profiles TO authenticated;
GRANT ALL ON TABLE handyflow.profiles TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE handyflow.task_requests TO authenticated;
GRANT ALL ON TABLE handyflow.task_requests TO service_role;
GRANT SELECT ON TABLE handyflow.profile_directory TO authenticated;
GRANT SELECT ON TABLE handyflow.repair_categories TO anon;
GRANT SELECT ON TABLE handyflow.repair_categories TO authenticated;
GRANT ALL ON TABLE handyflow.repair_categories TO service_role;
GRANT SELECT ON TABLE handyflow.reviews TO anon;
GRANT SELECT,INSERT,UPDATE ON TABLE handyflow.reviews TO authenticated;
GRANT ALL ON TABLE handyflow.reviews TO service_role;
GRANT SELECT ON TABLE handyflow.site_settings TO anon;
GRANT SELECT,INSERT,UPDATE ON TABLE handyflow.site_settings TO authenticated;
GRANT ALL ON TABLE handyflow.site_settings TO service_role;
GRANT ALL ON TABLE handyflow.task_events TO service_role;
GRANT SELECT,INSERT ON TABLE handyflow.task_events TO authenticated;
GRANT SELECT ON TABLE handyflow.testimonials TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE handyflow.testimonials TO authenticated;
GRANT ALL ON TABLE handyflow.testimonials TO service_role;
GRANT SELECT ON TABLE handyflow.user_roles TO authenticated;
GRANT ALL ON TABLE handyflow.user_roles TO service_role;

-- Restrictive policies prevent unrelated app logins accessing private HandyFlow data.
DO $membership$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['profiles','user_roles','task_requests','offers','messages','notifications','task_events','handyman_invites'] LOOP
  EXECUTE format('CREATE POLICY handyflow_members_only ON handyflow.%I AS RESTRICTIVE TO authenticated USING (handyflow.has_role(auth.uid(), ''client'') OR handyflow.has_role(auth.uid(), ''handyman'') OR handyflow.has_role(auth.uid(), ''admin'')) WITH CHECK (handyflow.has_role(auth.uid(), ''client'') OR handyflow.has_role(auth.uid(), ''handyman'') OR handyflow.has_role(auth.uid(), ''admin''))',t);
 END LOOP;
END $membership$;


-- Enrollment is an explicit call from HandyFlow, never a project-wide Auth trigger.
GRANT EXECUTE ON FUNCTION handyflow.enroll() TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA handyflow REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Reference data only: never seed users, demo jobs or testimonials in production.
INSERT INTO handyflow.repair_categories (slug, name, description, icon) VALUES
('plumbing','Plumbing','Leaks, taps, pipes & boilers','Droplets'),
('electrical','Electrical','Sockets, lighting & wiring','Zap'),
('painting','Painting','Walls, ceilings & touch-ups','PaintRoller'),
('furniture-assembly','Furniture Assembly','Flat-pack builds & fitting','Sofa'),
('carpentry','Carpentry','Doors, shelving & woodwork','Hammer'),
('tiling','Tiling','Bathroom & kitchen tiling','Grid2x2'),
('drywall','Drywall','Patching, boarding & plaster','LayoutPanelTop'),
('general-repairs','General Repairs','Odd jobs around the home','Wrench'),
('minor-renovations','Minor Renovations','Small remodels & upgrades','Ruler');
INSERT INTO handyflow.site_settings(key,value) VALUES ('testimonials', '{"enabled":false}'::jsonb);

-- Files are isolated from the CRM avatars bucket and private by default.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('handyflow-avatars','handyflow-avatars',false,5242880,
        ARRAY['image/jpeg','image/png','image/webp','image/avif']);
CREATE POLICY handyflow_avatar_owner ON storage.objects FOR ALL TO authenticated
USING (bucket_id='handyflow-avatars' AND (storage.foldername(name))[1]=auth.uid()::text
 AND (handyflow.has_role(auth.uid(),'client') OR handyflow.has_role(auth.uid(),'handyman') OR handyflow.has_role(auth.uid(),'admin')))
WITH CHECK (bucket_id='handyflow-avatars' AND (storage.foldername(name))[1]=auth.uid()::text
 AND (handyflow.has_role(auth.uid(),'client') OR handyflow.has_role(auth.uid(),'handyman') OR handyflow.has_role(auth.uid(),'admin')));
-- Offer decisions use the atomic, authorization-checked RPC only.
REVOKE UPDATE ON handyflow.offers FROM authenticated;
ALTER POLICY "Handymen create own offers" ON handyflow.offers
WITH CHECK (auth.uid()=handyman_id AND status='pending' AND price>0
 AND handyflow.has_role(auth.uid(),'handyman')
 AND EXISTS (SELECT 1 FROM handyflow.task_requests t WHERE t.id=offers.task_id
   AND (t.handyman_id=auth.uid() OR t.handyman_id IS NULL) AND t.status IN ('pending','negotiating')));
ALTER POLICY "Users create own testimonials" ON handyflow.testimonials
WITH CHECK (auth.uid()=author_id AND status='pending' AND NOT featured
 AND (handyflow.has_role(auth.uid(),'client') OR handyflow.has_role(auth.uid(),'handyman') OR handyflow.has_role(auth.uid(),'admin')));
NOTIFY pgrst,'reload schema';
COMMIT;
