CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.queue_approval_email_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  project_url TEXT;
  webhook_secret TEXT;
BEGIN
  SELECT decrypted_secret INTO project_url
  FROM vault.decrypted_secrets
  WHERE name = 'approval_email_project_url'
  LIMIT 1;

  SELECT decrypted_secret INTO webhook_secret
  FROM vault.decrypted_secrets
  WHERE name = 'approval_email_webhook_secret'
  LIMIT 1;

  IF project_url IS NULL OR webhook_secret IS NULL
    OR length(trim(webhook_secret)) < 32
  THEN
    RAISE WARNING 'Approval email secrets are missing from Supabase Vault; email was not queued';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/approval-email-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-approval-email-secret', webhook_secret
    ),
    body := jsonb_build_object('notification_id', NEW.id),
    timeout_milliseconds := 5000
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.queue_approval_email_notification()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_queue_approval_email_notification
  ON public.notifications;
CREATE TRIGGER trg_queue_approval_email_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  WHEN (
    NEW.link = 'approvals'
    AND NEW.title IN (
      'Persetujuan diperlukan',
      'Pengajuan disetujui',
      'Pengajuan ditolak'
    )
  )
  EXECUTE FUNCTION public.queue_approval_email_notification();
