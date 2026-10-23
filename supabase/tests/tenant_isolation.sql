BEGIN;

INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data
)
VALUES
  (
    'f5c3d1aa-7a11-4b0a-8f01-000000000001',
    'authenticated',
    'authenticated',
    't59-tenant-a@example.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"T59 Tenant A"}'::jsonb
  ),
  (
    'f5c3d1aa-7a11-4b0a-8f01-000000000002',
    'authenticated',
    'authenticated',
    't59-tenant-b@example.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"T59 Tenant B"}'::jsonb
  );

INSERT INTO public.organizations (id, name, slug)
VALUES
  ('f5c3d1aa-7a11-4b0a-8f02-000000000001', 'T59 Tenant A', 't59-tenant-a'),
  ('f5c3d1aa-7a11-4b0a-8f02-000000000002', 'T59 Tenant B', 't59-tenant-b');

INSERT INTO public.organization_members (organization_id, user_id, role)
VALUES
  (
    'f5c3d1aa-7a11-4b0a-8f02-000000000001',
    'f5c3d1aa-7a11-4b0a-8f01-000000000001',
    'owner'
  ),
  (
    'f5c3d1aa-7a11-4b0a-8f02-000000000002',
    'f5c3d1aa-7a11-4b0a-8f01-000000000002',
    'owner'
  );

INSERT INTO public.projects (
  id,
  organization_id,
  code,
  name,
  client_name,
  location_address,
  location_city,
  location_province,
  start_date,
  end_date
)
VALUES
  (
    'f5c3d1aa-7a11-4b0a-8f03-000000000001',
    'f5c3d1aa-7a11-4b0a-8f02-000000000001',
    'T59-A-BASE',
    'Proyek Tenant A',
    'Klien Uji A',
    'Alamat Uji',
    'Jakarta',
    'DKI Jakarta',
    DATE '2026-10-01',
    DATE '2027-10-01'
  ),
  (
    'f5c3d1aa-7a11-4b0a-8f03-000000000002',
    'f5c3d1aa-7a11-4b0a-8f02-000000000002',
    'T59-B-BASE',
    'Proyek Tenant B',
    'Klien Uji B',
    'Alamat Uji',
    'Bandung',
    'Jawa Barat',
    DATE '2026-10-01',
    DATE '2027-10-01'
  );

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'f5c3d1aa-7a11-4b0a-8f01-000000000001', true);

DO $$
DECLARE
  visible_count INT;
  affected_count INT;
BEGIN
  SELECT count(*) INTO visible_count FROM public.projects;
  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'Tenant A expected one visible project, got %', visible_count;
  END IF;

  UPDATE public.projects
  SET name = 'Cross-tenant update must be blocked'
  WHERE id = 'f5c3d1aa-7a11-4b0a-8f03-000000000002';
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  IF affected_count <> 0 THEN
    RAISE EXCEPTION 'Tenant A updated a Tenant B project';
  END IF;

  INSERT INTO public.projects (
    organization_id,
    code,
    name,
    client_name,
    location_address,
    location_city,
    location_province,
    start_date,
    end_date
  )
  VALUES (
    'f5c3d1aa-7a11-4b0a-8f02-000000000001',
    'T59-A-OWN',
    'Proyek baru Tenant A',
    'Klien Uji A',
    'Alamat Uji',
    'Jakarta',
    'DKI Jakarta',
    DATE '2026-10-01',
    DATE '2027-10-01'
  );

  BEGIN
    INSERT INTO public.projects (
      organization_id,
      code,
      name,
      client_name,
      location_address,
      location_city,
      location_province,
      start_date,
      end_date
    )
    VALUES (
      'f5c3d1aa-7a11-4b0a-8f02-000000000002',
      'T59-A-CROSS',
      'Cross-tenant insert must be blocked',
      'Klien Uji B',
      'Alamat Uji',
      'Bandung',
      'Jawa Barat',
      DATE '2026-10-01',
      DATE '2027-10-01'
    );
    RAISE EXCEPTION 'Tenant A inserted a Tenant B project';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END $$;

RESET ROLE;
SELECT set_config('request.jwt.claim.sub', 'f5c3d1aa-7a11-4b0a-8f01-000000000002', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  visible_count INT;
  affected_count INT;
BEGIN
  SELECT count(*) INTO visible_count FROM public.projects;
  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'Tenant B expected one visible project, got %', visible_count;
  END IF;

  UPDATE public.projects
  SET name = 'Cross-tenant update must be blocked'
  WHERE id = 'f5c3d1aa-7a11-4b0a-8f03-000000000001';
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  IF affected_count <> 0 THEN
    RAISE EXCEPTION 'Tenant B updated a Tenant A project';
  END IF;

  INSERT INTO public.projects (
    organization_id,
    code,
    name,
    client_name,
    location_address,
    location_city,
    location_province,
    start_date,
    end_date
  )
  VALUES (
    'f5c3d1aa-7a11-4b0a-8f02-000000000002',
    'T59-B-OWN',
    'Proyek baru Tenant B',
    'Klien Uji B',
    'Alamat Uji',
    'Bandung',
    'Jawa Barat',
    DATE '2026-10-01',
    DATE '2027-10-01'
  );

  BEGIN
    INSERT INTO public.projects (
      organization_id,
      code,
      name,
      client_name,
      location_address,
      location_city,
      location_province,
      start_date,
      end_date
    )
    VALUES (
      'f5c3d1aa-7a11-4b0a-8f02-000000000001',
      'T59-B-CROSS',
      'Cross-tenant insert must be blocked',
      'Klien Uji A',
      'Alamat Uji',
      'Jakarta',
      'DKI Jakarta',
      DATE '2026-10-01',
      DATE '2027-10-01'
    );
    RAISE EXCEPTION 'Tenant B inserted a Tenant A project';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END $$;

RESET ROLE;
ROLLBACK;
