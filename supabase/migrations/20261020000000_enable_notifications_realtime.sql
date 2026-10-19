DO $$
DECLARE
  publication_has_all_tables BOOLEAN;
BEGIN
  SELECT puball
  INTO publication_has_all_tables
  FROM pg_publication
  WHERE pubname = 'supabase_realtime';

  IF publication_has_all_tables IS NULL THEN
    RAISE EXCEPTION 'Supabase Realtime publication is not available';
  END IF;

  IF NOT publication_has_all_tables
     AND NOT EXISTS (
       SELECT 1
       FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'notifications'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END;
$$;
