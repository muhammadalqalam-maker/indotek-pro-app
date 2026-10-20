CREATE UNIQUE INDEX IF NOT EXISTS idx_project_addendums_project_number
  ON public.project_addendums (organization_id, project_id, lower(addendum_number));

DROP TRIGGER IF EXISTS trg_project_addendums_audit ON public.project_addendums;

CREATE TRIGGER trg_project_addendums_audit
AFTER INSERT OR UPDATE OF
  addendum_number,
  title,
  description,
  amount,
  time_extension_days,
  approved_by,
  approved_at
OR DELETE
ON public.project_addendums
FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit();
