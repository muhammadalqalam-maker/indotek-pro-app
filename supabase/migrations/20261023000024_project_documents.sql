DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM storage.buckets
    WHERE id = 'project-documents'
      AND (
        name <> 'project-documents'
        OR public
        OR file_size_limit IS DISTINCT FROM 52428800
        OR allowed_mime_types IS DISTINCT FROM ARRAY[
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/webp'
        ]::text[]
      )
  ) THEN
    RAISE EXCEPTION 'The project-documents bucket exists with an incompatible configuration';
  END IF;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'project-documents',
    'project-documents',
    false,
    52428800,
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[]
  )
  ON CONFLICT (id) DO NOTHING;
END;
$$;

CREATE TABLE IF NOT EXISTS public.project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  document_number TEXT NOT NULL CHECK (length(trim(document_number)) BETWEEN 1 AND 80),
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 2 AND 180),
  category TEXT NOT NULL CHECK (category IN (
    'Kontrak & SPK',
    'Gambar Kerja (DED)',
    'Shop Drawing',
    'As-Built Drawing',
    'RFI (Klarifikasi)',
    'Berita Acara (BAST)',
    'Laporan K3 & Lingkungan'
  )),
  access_roles public.user_role_type[] NOT NULL DEFAULT ARRAY[
    'owner'::public.user_role_type,
    'admin'::public.user_role_type,
    'project_manager'::public.user_role_type,
    'site_manager'::public.user_role_type,
    'estimator'::public.user_role_type,
    'procurement'::public.user_role_type,
    'finance'::public.user_role_type,
    'warehouse'::public.user_role_type,
    'safety_officer'::public.user_role_type
  ],
  expires_on DATE,
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, project_id, document_number),
  FOREIGN KEY (organization_id, project_id)
    REFERENCES public.projects (organization_id, id) ON DELETE RESTRICT,
  CHECK (cardinality(access_roles) > 0)
);

CREATE TABLE IF NOT EXISTS public.project_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  document_id UUID NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 0 CHECK (version_number >= 0),
  file_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL CHECK (length(trim(file_name)) BETWEEN 1 AND 255),
  content_type TEXT NOT NULL CHECK (content_type IN (
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  )),
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes BETWEEN 1 AND 52428800),
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  UNIQUE (organization_id, document_id, version_number),
  FOREIGN KEY (organization_id, project_id)
    REFERENCES public.projects (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, document_id)
    REFERENCES public.project_documents (organization_id, id) ON DELETE RESTRICT,
  CHECK (
    file_path LIKE organization_id::text || '/' || project_id::text
      || '/' || document_id::text || '/%'
  )
);

CREATE INDEX IF NOT EXISTS idx_project_documents_org_project_created
  ON public.project_documents (organization_id, project_id, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_project_documents_expiry
  ON public.project_documents (organization_id, expires_on)
  WHERE deleted_at IS NULL AND expires_on IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_project_document_versions_document
  ON public.project_document_versions (organization_id, document_id, version_number DESC);

CREATE OR REPLACE FUNCTION public.set_project_document_version_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  PERFORM 1
  FROM public.project_documents AS document
  WHERE document.id = NEW.document_id
    AND document.organization_id = NEW.organization_id
    AND document.project_id = NEW.project_id
    AND document.deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dokumen proyek tidak tersedia untuk penambahan versi.';
  END IF;

  SELECT COALESCE(MAX(version.version_number) + 1, 0)
  INTO NEW.version_number
  FROM public.project_document_versions AS version
  WHERE version.organization_id = NEW.organization_id
    AND version.document_id = NEW.document_id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_project_document_archive()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
    RAISE EXCEPTION 'Dokumen yang diarsipkan tidak dapat dipulihkan.';
  END IF;

  IF OLD.deleted_at IS DISTINCT FROM NEW.deleted_at
    AND NEW.deleted_at IS NOT NULL
    AND NOT public.has_role(
      NEW.organization_id,
      ARRAY[
        'owner'::public.user_role_type,
        'admin'::public.user_role_type,
        'project_manager'::public.user_role_type
      ]
    )
  THEN
    RAISE EXCEPTION 'Hanya Owner, Admin, atau Project Manager yang dapat mengarsipkan dokumen.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_project_document_with_version(
  p_document_id UUID,
  p_organization_id UUID,
  p_project_id UUID,
  p_document_number TEXT,
  p_title TEXT,
  p_category TEXT,
  p_access_roles public.user_role_type[],
  p_expires_on DATE,
  p_version_id UUID,
  p_file_path TEXT,
  p_file_name TEXT,
  p_content_type TEXT,
  p_file_size_bytes BIGINT
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.project_documents (
    id,
    organization_id,
    project_id,
    document_number,
    title,
    category,
    access_roles,
    expires_on
  )
  VALUES (
    p_document_id,
    p_organization_id,
    p_project_id,
    p_document_number,
    p_title,
    p_category,
    p_access_roles,
    p_expires_on
  );

  INSERT INTO public.project_document_versions (
    id,
    organization_id,
    project_id,
    document_id,
    file_path,
    file_name,
    content_type,
    file_size_bytes
  )
  VALUES (
    p_version_id,
    p_organization_id,
    p_project_id,
    p_document_id,
    p_file_path,
    p_file_name,
    p_content_type,
    p_file_size_bytes
  );

  RETURN p_document_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_delete_unlinked_project_document_upload(
  target_file_path TEXT,
  target_owner_id TEXT
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL
    AND target_owner_id = auth.uid()::text
    AND EXISTS (
      SELECT 1
      FROM storage.objects AS object
      WHERE object.bucket_id = 'project-documents'
        AND object.name = target_file_path
        AND object.owner_id::text = target_owner_id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.project_document_versions AS version
      WHERE version.file_path = target_file_path
    );
$$;

DROP TRIGGER IF EXISTS project_documents_set_updated_at ON public.project_documents;
CREATE TRIGGER project_documents_set_updated_at
  BEFORE UPDATE ON public.project_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS project_documents_guard_archive ON public.project_documents;
CREATE TRIGGER project_documents_guard_archive
  BEFORE UPDATE ON public.project_documents
  FOR EACH ROW EXECUTE FUNCTION public.guard_project_document_archive();
DROP TRIGGER IF EXISTS project_document_versions_assign_number ON public.project_document_versions;
CREATE TRIGGER project_document_versions_assign_number
  BEFORE INSERT ON public.project_document_versions
  FOR EACH ROW EXECUTE FUNCTION public.set_project_document_version_number();
DROP TRIGGER IF EXISTS project_documents_audit ON public.project_documents;
CREATE TRIGGER project_documents_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.project_documents
  FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();
DROP TRIGGER IF EXISTS project_document_versions_audit ON public.project_document_versions;
CREATE TRIGGER project_document_versions_audit
  AFTER INSERT ON public.project_document_versions
  FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();

ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_document_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_documents_read_by_role ON public.project_documents;
CREATE POLICY project_documents_read_by_role
  ON public.project_documents FOR SELECT
  USING (
    deleted_at IS NULL
    AND public.is_org_member(organization_id)
    AND (
      public.current_user_role(organization_id) = ANY(access_roles)
      OR public.has_role(
        organization_id,
        ARRAY[
          'owner'::public.user_role_type,
          'admin'::public.user_role_type,
          'project_manager'::public.user_role_type,
          'site_manager'::public.user_role_type
        ]
      )
    )
  );
DROP POLICY IF EXISTS project_documents_insert_field_roles ON public.project_documents;
CREATE POLICY project_documents_insert_field_roles
  ON public.project_documents FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND public.has_role(
      organization_id,
      ARRAY[
        'owner'::public.user_role_type,
        'admin'::public.user_role_type,
        'project_manager'::public.user_role_type,
        'site_manager'::public.user_role_type
      ]
    )
  );
DROP POLICY IF EXISTS project_documents_update_field_roles ON public.project_documents;
CREATE POLICY project_documents_update_field_roles
  ON public.project_documents FOR UPDATE
  USING (
    deleted_at IS NULL
    AND public.has_role(
      organization_id,
      ARRAY[
        'owner'::public.user_role_type,
        'admin'::public.user_role_type,
        'project_manager'::public.user_role_type,
        'site_manager'::public.user_role_type
      ]
    )
  )
  WITH CHECK (public.has_role(
    organization_id,
    ARRAY[
      'owner'::public.user_role_type,
      'admin'::public.user_role_type,
      'project_manager'::public.user_role_type,
      'site_manager'::public.user_role_type
    ]
  ));

DROP POLICY IF EXISTS project_document_versions_read_by_document_role ON public.project_document_versions;
CREATE POLICY project_document_versions_read_by_document_role
  ON public.project_document_versions FOR SELECT
  USING (EXISTS (
    SELECT 1
    FROM public.project_documents AS document
    WHERE document.id = project_document_versions.document_id
      AND document.organization_id = project_document_versions.organization_id
      AND document.project_id = project_document_versions.project_id
  ));
DROP POLICY IF EXISTS project_document_versions_insert_field_roles ON public.project_document_versions;
CREATE POLICY project_document_versions_insert_field_roles
  ON public.project_document_versions FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND public.has_role(
      organization_id,
      ARRAY[
        'owner'::public.user_role_type,
        'admin'::public.user_role_type,
        'project_manager'::public.user_role_type,
        'site_manager'::public.user_role_type
      ]
    )
    AND EXISTS (
      SELECT 1
      FROM public.project_documents AS document
      WHERE document.id = project_document_versions.document_id
        AND document.organization_id = project_document_versions.organization_id
        AND document.project_id = project_document_versions.project_id
        AND document.deleted_at IS NULL
    )
  );

REVOKE ALL ON public.project_documents, public.project_document_versions
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.project_documents TO authenticated;
GRANT INSERT (
  id,
  organization_id,
  project_id,
  document_number,
  title,
  category,
  access_roles,
  expires_on
) ON public.project_documents TO authenticated;
GRANT UPDATE (
  document_number,
  title,
  category,
  access_roles,
  expires_on,
  deleted_at
) ON public.project_documents TO authenticated;
GRANT SELECT ON public.project_document_versions TO authenticated;
GRANT INSERT (
  id,
  organization_id,
  project_id,
  document_id,
  file_path,
  file_name,
  content_type,
  file_size_bytes
) ON public.project_document_versions TO authenticated;
REVOKE ALL ON FUNCTION public.create_project_document_with_version(
  UUID, UUID, UUID, TEXT, TEXT, TEXT, public.user_role_type[], DATE, UUID, TEXT, TEXT, TEXT, BIGINT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_project_document_with_version(
  UUID, UUID, UUID, TEXT, TEXT, TEXT, public.user_role_type[], DATE, UUID, TEXT, TEXT, TEXT, BIGINT
) TO authenticated;

DROP POLICY IF EXISTS "Project documents read follows document roles" ON storage.objects;
CREATE POLICY "Project documents read follows document roles"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-documents'
    AND cardinality(storage.foldername(storage.objects.name)) = 3
    AND EXISTS (
      SELECT 1
      FROM public.project_document_versions AS version
      JOIN public.project_documents AS document
        ON document.organization_id = version.organization_id
        AND document.project_id = version.project_id
        AND document.id = version.document_id
      WHERE document.organization_id::text = (storage.foldername(storage.objects.name))[1]
        AND document.project_id::text = (storage.foldername(storage.objects.name))[2]
        AND document.id::text = (storage.foldername(storage.objects.name))[3]
        AND version.file_path = storage.objects.name
        AND document.deleted_at IS NULL
    )
  );
DROP POLICY IF EXISTS "Project documents upload by field roles" ON storage.objects;
CREATE POLICY "Project documents upload by field roles"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-documents'
    AND cardinality(storage.foldername(storage.objects.name)) = 3
    AND EXISTS (
      SELECT 1
      FROM public.projects AS project
      WHERE project.organization_id::text = (storage.foldername(storage.objects.name))[1]
        AND project.id::text = (storage.foldername(storage.objects.name))[2]
        AND public.has_role(
          project.organization_id,
          ARRAY[
            'owner'::public.user_role_type,
            'admin'::public.user_role_type,
            'project_manager'::public.user_role_type,
            'site_manager'::public.user_role_type
          ]
        )
    )
  );
DROP POLICY IF EXISTS "Project document upload cleanup by uploader" ON storage.objects;
CREATE POLICY "Project document upload cleanup by uploader"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-documents'
    AND public.can_delete_unlinked_project_document_upload(
      storage.objects.name,
      storage.objects.owner_id::text
    )
  );

REVOKE ALL ON FUNCTION public.can_delete_unlinked_project_document_upload(TEXT, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_delete_unlinked_project_document_upload(TEXT, TEXT)
  TO authenticated;
