CREATE OR REPLACE FUNCTION public.generate_document_number(
  p_entity_type TEXT,
  p_organization_id UUID,
  p_prefix TEXT DEFAULT ''
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  current_year INT := EXTRACT(YEAR FROM now())::INT;
  row_record RECORD;
  next_value INT;
BEGIN
  IF p_organization_id IS NULL OR auth.uid() IS NULL OR NOT public.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'Organization membership is required to generate document numbers'
      USING ERRCODE = '42501';
  END IF;

  IF p_entity_type IS NULL OR length(trim(p_entity_type)) = 0 THEN
    RAISE EXCEPTION 'Document entity type is required';
  END IF;

  IF length(trim(COALESCE(p_prefix, ''))) > 20
     OR COALESCE(trim(p_prefix), '') !~* '^[A-Z0-9/-]*$' THEN
    RAISE EXCEPTION 'Document prefix contains unsupported characters';
  END IF;

  INSERT INTO public.doc_number_sequences (organization_id, entity_type, year, prefix, last_value)
  VALUES (p_organization_id, lower(trim(p_entity_type)), current_year, upper(trim(COALESCE(p_prefix, ''))), 0)
  ON CONFLICT (organization_id, entity_type, year)
  DO NOTHING;

  SELECT * INTO row_record
  FROM public.doc_number_sequences
  WHERE organization_id = p_organization_id
    AND entity_type = lower(trim(p_entity_type))
    AND year = current_year
  FOR UPDATE;

  IF row_record IS NULL THEN
    RAISE EXCEPTION 'Unable to initialize document sequence for %', p_entity_type;
  END IF;

  next_value := row_record.last_value + 1;
  UPDATE public.doc_number_sequences
  SET last_value = next_value,
      updated_at = timezone('utc'::text, now())
  WHERE id = row_record.id;

  RETURN format(
    '%s%s-%s-%s',
    CASE WHEN trim(row_record.prefix) = '' THEN '' ELSE upper(trim(row_record.prefix)) || '-' END,
    current_year,
    lower(trim(p_entity_type)),
    lpad(next_value::TEXT, 5, '0')
  );
END;
$$;
