DO $$
DECLARE
  policy_record record;
  policy_roles text;
  policy_command text;
  policy_using text;
  policy_check text;
  policy_statement text;
BEGIN
  FOR policy_record IN
    SELECT
      policy.polname,
      policy.polcmd,
      policy.polpermissive,
      policy.polroles,
      namespace.nspname,
      relation.relname,
      pg_get_expr(policy.polqual, policy.polrelid) AS using_expression,
      pg_get_expr(policy.polwithcheck, policy.polrelid) AS check_expression
    FROM pg_policy AS policy
    JOIN pg_class AS relation ON relation.oid = policy.polrelid
    JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname IN ('public', 'storage')
      AND (
        coalesce(pg_get_expr(policy.polqual, policy.polrelid), '') ||
        coalesce(pg_get_expr(policy.polwithcheck, policy.polrelid), '')
      ) ~* 'auth\.(uid|jwt|role)\s*\('
    ORDER BY namespace.nspname, relation.relname, policy.polname
  LOOP
    SELECT string_agg(
      CASE
        WHEN role_id = 0 THEN 'PUBLIC'
        ELSE quote_ident(pg_get_userbyid(role_id))
      END,
      ', ' ORDER BY role_id
    )
    INTO policy_roles
    FROM unnest(policy_record.polroles) AS roles(role_id);

    policy_command := CASE policy_record.polcmd
      WHEN 'r' THEN 'SELECT'
      WHEN 'a' THEN 'INSERT'
      WHEN 'w' THEN 'UPDATE'
      WHEN 'd' THEN 'DELETE'
      WHEN '*' THEN 'ALL'
    END;

    policy_using := policy_record.using_expression;
    policy_check := policy_record.check_expression;

    policy_using := regexp_replace(policy_using, 'auth\.uid\s*\(\s*\)', '(SELECT auth.uid())', 'gi');
    policy_using := regexp_replace(policy_using, 'auth\.jwt\s*\(\s*\)', '(SELECT auth.jwt())', 'gi');
    policy_using := regexp_replace(policy_using, 'auth\.role\s*\(\s*\)', '(SELECT auth.role())', 'gi');
    policy_check := regexp_replace(policy_check, 'auth\.uid\s*\(\s*\)', '(SELECT auth.uid())', 'gi');
    policy_check := regexp_replace(policy_check, 'auth\.jwt\s*\(\s*\)', '(SELECT auth.jwt())', 'gi');
    policy_check := regexp_replace(policy_check, 'auth\.role\s*\(\s*\)', '(SELECT auth.role())', 'gi');

    EXECUTE format(
      'DROP POLICY %I ON %I.%I',
      policy_record.polname,
      policy_record.nspname,
      policy_record.relname
    );

    policy_statement := format(
      'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
      policy_record.polname,
      policy_record.nspname,
      policy_record.relname,
      CASE WHEN policy_record.polpermissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
      policy_command,
      policy_roles
    );

    IF policy_using IS NOT NULL THEN
      policy_statement := policy_statement || format(' USING (%s)', policy_using);
    END IF;

    IF policy_check IS NOT NULL THEN
      policy_statement := policy_statement || format(' WITH CHECK (%s)', policy_check);
    END IF;

    EXECUTE policy_statement;
  END LOOP;
END;
$$;
