-- T-3.7: field material requests with project-manager approval.

ALTER TABLE public.approval_flows
  DROP CONSTRAINT IF EXISTS approval_flows_resource_type_check;
ALTER TABLE public.approval_flows
  ADD CONSTRAINT approval_flows_resource_type_check
  CHECK (resource_type IN (
    'boq_revision', 'project_addendum', 'daily_report', 'purchase_request', 'purchase_order', 'material_request'
  ));

ALTER TABLE public.approval_requests
  DROP CONSTRAINT IF EXISTS approval_requests_resource_type_check;
ALTER TABLE public.approval_requests
  ADD CONSTRAINT approval_requests_resource_type_check
  CHECK (resource_type IN (
    'boq_revision', 'project_addendum', 'daily_report', 'purchase_request', 'purchase_order', 'material_request'
  ));

CREATE TABLE IF NOT EXISTS public.material_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  request_number TEXT NOT NULL,
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  required_date DATE NOT NULL CHECK (required_date >= request_date),
  requester_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  location_name TEXT NOT NULL CHECK (length(trim(location_name)) BETWEEN 2 AND 180),
  purpose TEXT NOT NULL CHECK (length(trim(purpose)) BETWEEN 2 AND 1000),
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'approved', 'rejected', 'fulfilled', 'cancelled')),
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  FOREIGN KEY (organization_id, project_id)
    REFERENCES public.projects (organization_id, id) ON DELETE CASCADE,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, request_number)
);

CREATE TABLE IF NOT EXISTS public.material_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  material_request_id UUID NOT NULL,
  inventory_item_id UUID NOT NULL,
  quantity NUMERIC(18, 3) NOT NULL CHECK (quantity > 0),
  notes TEXT NOT NULL DEFAULT '' CHECK (length(notes) <= 500),
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at TIMESTAMPTZ,
  FOREIGN KEY (organization_id, material_request_id)
    REFERENCES public.material_requests (organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, inventory_item_id)
    REFERENCES public.inventory_items (organization_id, id),
  UNIQUE (organization_id, material_request_id, inventory_item_id)
);

CREATE INDEX IF NOT EXISTS material_requests_project_status_idx
  ON public.material_requests (organization_id, project_id, status, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS material_request_items_request_idx
  ON public.material_request_items (organization_id, material_request_id)
  WHERE deleted_at IS NULL;

ALTER TABLE public.material_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_request_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Material requests readable by organization members"
  ON public.material_requests FOR SELECT
  USING (public.is_org_member(organization_id));
CREATE POLICY "Material request items readable by organization members"
  ON public.material_request_items FOR SELECT
  USING (public.is_org_member(organization_id));

REVOKE ALL ON public.material_requests, public.material_request_items FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.material_requests, public.material_request_items TO authenticated;

CREATE TRIGGER trg_material_requests_updated_at
  BEFORE UPDATE ON public.material_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_material_request_items_updated_at
  BEFORE UPDATE ON public.material_request_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_material_requests_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.material_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();
CREATE TRIGGER trg_material_request_items_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.material_request_items
  FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();

CREATE OR REPLACE FUNCTION public.create_default_approval_flows(target_organization_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.approval_flows (organization_id, resource_type, name, created_by)
  VALUES
    (target_organization_id, 'boq_revision', 'Persetujuan revisi BOQ', auth.uid()),
    (target_organization_id, 'project_addendum', 'Persetujuan addendum proyek', auth.uid()),
    (target_organization_id, 'daily_report', 'Persetujuan laporan harian', auth.uid()),
    (target_organization_id, 'purchase_request', 'Persetujuan purchase request', auth.uid()),
    (target_organization_id, 'purchase_order', 'Persetujuan purchase order', auth.uid()),
    (target_organization_id, 'material_request', 'Persetujuan permintaan material', auth.uid())
  ON CONFLICT (organization_id, resource_type) DO NOTHING;

  INSERT INTO public.approval_flow_steps (organization_id, approval_flow_id, step_number, approver_roles, created_by)
  SELECT target_organization_id, flow.id, steps.step_number, steps.approver_roles, auth.uid()
  FROM public.approval_flows AS flow
  JOIN (VALUES
    ('boq_revision', 1, ARRAY['project_manager'::public.user_role_type]),
    ('boq_revision', 2, ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type]),
    ('project_addendum', 1, ARRAY['project_manager'::public.user_role_type]),
    ('project_addendum', 2, ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type]),
    ('daily_report', 1, ARRAY['project_manager'::public.user_role_type]),
    ('daily_report', 2, ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type]),
    ('purchase_request', 1, ARRAY['project_manager'::public.user_role_type]),
    ('purchase_order', 1, ARRAY['project_manager'::public.user_role_type]),
    ('purchase_order', 2, ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type]),
    ('material_request', 1, ARRAY['project_manager'::public.user_role_type])
  ) AS steps(resource_type, step_number, approver_roles) ON true
  WHERE flow.organization_id = target_organization_id
    AND flow.deleted_at IS NULL
    AND flow.resource_type = steps.resource_type
    AND NOT EXISTS (
      SELECT 1 FROM public.approval_flow_steps AS existing
      WHERE existing.organization_id = target_organization_id
        AND existing.approval_flow_id = flow.id
        AND existing.step_number = steps.step_number
        AND existing.deleted_at IS NULL
    );
END;
$$;

DO $$
DECLARE organization_record RECORD;
BEGIN
  FOR organization_record IN SELECT id FROM public.organizations WHERE deleted_at IS NULL LOOP
    PERFORM public.create_default_approval_flows(organization_record.id);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_material_request(
  p_organization_id UUID,
  p_project_id UUID,
  p_required_date DATE,
  p_location_name TEXT,
  p_purpose TEXT,
  p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  request_id UUID;
  request_number TEXT;
  item_record JSONB;
  inventory_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(
    p_organization_id,
    ARRAY['owner'::public.user_role_type, 'admin'::public.user_role_type,
      'project_manager'::public.user_role_type, 'site_manager'::public.user_role_type]
  ) THEN
    RAISE EXCEPTION 'Anda tidak berwenang membuat permintaan material.' USING ERRCODE = '42501';
  END IF;
  IF p_required_date < CURRENT_DATE
    OR length(trim(coalesce(p_location_name, ''))) NOT BETWEEN 2 AND 180
    OR length(trim(coalesce(p_purpose, ''))) NOT BETWEEN 2 AND 1000
    OR p_items IS NULL OR jsonb_typeof(p_items) IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 100
    OR NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id AND organization_id = p_organization_id AND deleted_at IS NULL)
  THEN
    RAISE EXCEPTION 'Data permintaan material tidak valid.' USING ERRCODE = 'check_violation';
  END IF;

  FOR item_record IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    BEGIN inventory_id := (item_record->>'inventory_item_id')::UUID; EXCEPTION WHEN invalid_text_representation THEN inventory_id := NULL; END;
    IF inventory_id IS NULL
      OR coalesce(item_record->>'quantity', '') !~ '^[0-9]+([.][0-9]{1,3})?$'
      OR (item_record->>'quantity')::NUMERIC <= 0
      OR length(coalesce(item_record->>'notes', '')) > 500
      OR NOT EXISTS (
        SELECT 1 FROM public.inventory_items
        WHERE id = inventory_id AND organization_id = p_organization_id AND project_id = p_project_id AND deleted_at IS NULL
      )
    THEN
      RAISE EXCEPTION 'Item permintaan material tidak valid.' USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;

  request_number := public.generate_document_number('material_request', p_organization_id, 'MR');
  INSERT INTO public.material_requests (organization_id, project_id, request_number, required_date, location_name, purpose)
  VALUES (p_organization_id, p_project_id, request_number, p_required_date, trim(p_location_name), trim(p_purpose))
  RETURNING id INTO request_id;

  FOR item_record IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO public.material_request_items (organization_id, material_request_id, inventory_item_id, quantity, notes)
    VALUES (p_organization_id, request_id, (item_record->>'inventory_item_id')::UUID, (item_record->>'quantity')::NUMERIC, trim(coalesce(item_record->>'notes', '')));
  END LOOP;

  PERFORM public.create_procurement_approval_request(
    p_organization_id, p_project_id, 'material_request', request_id,
    'Permintaan material ' || request_number, request_number, 0
  );
  RETURN request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_procurement_approval_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NEW.status = OLD.status OR NEW.status NOT IN ('approved', 'rejected') THEN RETURN NEW; END IF;
  IF NEW.resource_type = 'purchase_request' THEN
    UPDATE public.purchase_requests SET status = NEW.status
    WHERE id = NEW.resource_id AND organization_id = NEW.organization_id AND status = 'submitted' AND deleted_at IS NULL;
  ELSIF NEW.resource_type = 'purchase_order' THEN
    UPDATE public.purchase_orders SET status = NEW.status, approved_by = CASE WHEN NEW.status = 'approved' THEN auth.uid() ELSE NULL END, approved_at = CASE WHEN NEW.status = 'approved' THEN now() ELSE NULL END
    WHERE id = NEW.resource_id AND organization_id = NEW.organization_id AND status = 'pending_approval' AND deleted_at IS NULL;
    IF NEW.status = 'rejected' THEN
      UPDATE public.purchase_requests SET status = 'approved'
      WHERE id = (SELECT purchase_request_id FROM public.purchase_orders WHERE id = NEW.resource_id AND organization_id = NEW.organization_id)
        AND organization_id = NEW.organization_id AND status = 'converted_to_po';
    END IF;
  ELSIF NEW.resource_type = 'material_request' THEN
    UPDATE public.material_requests SET status = NEW.status
    WHERE id = NEW.resource_id AND organization_id = NEW.organization_id AND status = 'submitted' AND deleted_at IS NULL;
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Dokumen tidak lagi menunggu persetujuan.' USING ERRCODE = 'object_not_in_prerequisite_state'; END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.create_material_request(UUID, UUID, DATE, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_material_request(UUID, UUID, DATE, TEXT, TEXT, JSONB) TO authenticated;
