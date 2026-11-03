CREATE OR REPLACE FUNCTION public.soft_delete_project(
  p_project_id UUID,
  p_organization_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(
    p_organization_id,
    ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type]
  ) THEN
    RAISE EXCEPTION 'You are not authorized to delete projects in this organization.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.projects
  SET deleted_at = timezone('utc'::text, now())
  WHERE id = p_project_id
    AND organization_id = p_organization_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project was not found or has already been deleted.'
      USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_project(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_project(UUID, UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
