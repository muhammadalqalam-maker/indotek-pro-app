DROP POLICY IF EXISTS "Equipment assets created by site managers"
  ON public.equipment_assets;

CREATE POLICY "Equipment assets created by site managers"
  ON public.equipment_assets FOR INSERT
  WITH CHECK (public.has_role(
    organization_id,
    ARRAY['site_manager'::public.user_role_type]
  ));
