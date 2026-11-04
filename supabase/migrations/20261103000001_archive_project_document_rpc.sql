CREATE OR REPLACE FUNCTION public.archive_project_document(
  p_organization_id UUID,
  p_document_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(
    p_organization_id,
    ARRAY[
      'owner'::public.user_role_type,
      'admin'::public.user_role_type,
      'project_manager'::public.user_role_type
    ]
  ) THEN
    RAISE EXCEPTION 'Anda tidak berwenang mengarsipkan dokumen.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.project_documents
  SET deleted_at = timezone('utc'::text, now())
  WHERE organization_id = p_organization_id
    AND id = p_document_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dokumen tidak ditemukan atau sudah diarsipkan.'
      USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.archive_project_document(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_project_document(UUID, UUID)
  TO authenticated;

NOTIFY pgrst, 'reload schema';
