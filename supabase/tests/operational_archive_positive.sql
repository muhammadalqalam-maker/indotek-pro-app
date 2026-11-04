BEGIN;
SET LOCAL request.jwt.claim.role = 'authenticated';

DO $$
DECLARE
  uid UUID := '00000000-0000-0000-0000-000000000101';
  org UUID := '00000000-0000-0000-0000-000000000201';
  project UUID := '00000000-0000-0000-0000-000000000301';
  worker UUID := '00000000-0000-0000-0000-000000000401';
  attendance_default UUID := '00000000-0000-0000-0000-000000000501';
  attendance_override UUID := '00000000-0000-0000-0000-000000000502';
  attendance_denied UUID := '00000000-0000-0000-0000-000000000503';
  document_archive UUID := '00000000-0000-0000-0000-000000000504';
  cash_pending UUID := '00000000-0000-0000-0000-000000000601';
  cash_verified UUID := '00000000-0000-0000-0000-000000000602';
  reversal UUID;
  advance UUID := '00000000-0000-0000-0000-000000000701';
  vendor UUID := '00000000-0000-0000-0000-000000000801';
  request_archive UUID := '00000000-0000-0000-0000-000000000901';
  request_quote UUID := '00000000-0000-0000-0000-000000000902';
  request_po UUID := '00000000-0000-0000-0000-000000000903';
  quote_archive UUID := '00000000-0000-0000-0000-000000001002';
  quote_po UUID := '00000000-0000-0000-0000-000000001003';
  po UUID := '00000000-0000-0000-0000-000000001103';
BEGIN
  PERFORM set_config('request.jwt.claim.sub', uid::text, true);

  INSERT INTO auth.users (id, aud, role, email, raw_user_meta_data)
  VALUES (uid, 'authenticated', 'authenticated', 'archive-positive-test@example.invalid', '{"full_name":"Archive Test"}'::jsonb);
  INSERT INTO public.organizations (id, name, slug)
  VALUES (org, 'Archive Test', 'archive-positive-test');
  INSERT INTO public.organization_members (organization_id, user_id, role, is_active)
  VALUES (org, uid, 'owner', true);
  INSERT INTO public.projects (
    id, organization_id, code, name, client_name, location_address,
    location_city, location_province, start_date, end_date
  )
  VALUES (
    project, org, 'ARCHIVE-TEST', 'Archive Test', 'Client Test',
    'Site Test', 'Jakarta', 'DKI Jakarta', CURRENT_DATE, CURRENT_DATE + 10
  );
  INSERT INTO public.field_workers (id, organization_id, project_id, nik, full_name, role_trade)
  VALUES (worker, org, project, 'ARCHIVE-TEST-1', 'Worker Test', 'Operator');

  INSERT INTO public.daily_attendance (
    id, organization_id, project_id, worker_id, attendance_date, status, work_hours, created_by
  )
  VALUES (attendance_default, org, project, worker, CURRENT_DATE, 'hadir', 8, uid);
  PERFORM public.archive_daily_attendance(org, project, attendance_default);
  IF (SELECT deleted_at IS NULL FROM public.daily_attendance WHERE id = attendance_default) THEN
    RAISE EXCEPTION 'Default owner attendance archive did not soft-delete';
  END IF;
  BEGIN
    UPDATE public.daily_attendance SET work_hours = 7 WHERE id = attendance_default;
    RAISE EXCEPTION 'Archived attendance update unexpectedly succeeded';
  EXCEPTION WHEN object_not_in_prerequisite_state THEN
    NULL;
  END;

  INSERT INTO public.daily_attendance (
    id, organization_id, project_id, worker_id, attendance_date, status, work_hours, created_by
  )
  VALUES (attendance_denied, org, project, worker, CURRENT_DATE + 1, 'hadir', 8, uid);
  INSERT INTO public.roles_permissions (organization_id, role, module, action, allowed)
  VALUES (org, 'owner', 'users', 'delete', false);
  BEGIN
    PERFORM public.archive_daily_attendance(org, project, attendance_denied);
    RAISE EXCEPTION 'Explicit deny override unexpectedly allowed archive';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
  UPDATE public.roles_permissions
  SET allowed = true
  WHERE organization_id = org AND role = 'owner' AND module = 'users' AND action = 'delete';
  INSERT INTO public.daily_attendance (
    id, organization_id, project_id, worker_id, attendance_date, status, work_hours, created_by
  )
  VALUES (attendance_override, org, project, worker, CURRENT_DATE + 2, 'hadir', 8, uid);
  PERFORM public.archive_daily_attendance(org, project, attendance_override);
  IF (SELECT deleted_at IS NULL FROM public.daily_attendance WHERE id = attendance_override) THEN
    RAISE EXCEPTION 'Explicit allow override did not permit attendance archive';
  END IF;

  INSERT INTO public.project_documents (
    id, organization_id, project_id, document_number, title, category
  )
  VALUES (
    document_archive, org, project, 'ARCHIVE-DOC-1', 'Dokumen arsip uji', 'Kontrak & SPK'
  );
  PERFORM public.archive_project_document(org, document_archive);
  IF (SELECT deleted_at IS NULL FROM public.project_documents WHERE id = document_archive) THEN
    RAISE EXCEPTION 'Owner document archive RPC did not soft-delete';
  END IF;

  INSERT INTO public.project_cash_transactions (
    id, organization_id, project_id, transaction_number, type, category, amount,
    recipient_or_payer, description, payment_method, created_by
  )
  VALUES (
    cash_pending, org, project, 'ARCHIVE-CASH-PENDING', 'outflow', 'Material', 1000,
    'Supplier Test', 'Pending test', 'Kas Tunai', uid
  );
  PERFORM public.archive_project_cash_transaction(org, cash_pending);
  IF (SELECT deleted_at IS NULL FROM public.project_cash_transactions WHERE id = cash_pending) THEN
    RAISE EXCEPTION 'Pending cash archive did not soft-delete';
  END IF;

  INSERT INTO public.project_cash_transactions (
    id, organization_id, project_id, transaction_number, type, category, amount,
    recipient_or_payer, description, payment_method, status, created_by, verified_by, verified_at
  )
  VALUES (
    cash_verified, org, project, 'ARCHIVE-CASH-VERIFIED', 'outflow', 'Material', 1250,
    'Supplier Test', 'Verified test', 'Kas Tunai', 'verified', uid, uid, now()
  );
  BEGIN
    PERFORM public.reverse_project_cash_transaction(org, cash_verified, 'no');
    RAISE EXCEPTION 'Short correction reason unexpectedly accepted';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
  reversal := public.reverse_project_cash_transaction(org, cash_verified, 'Koreksi uji transaksi');
  IF NOT EXISTS (
    SELECT 1 FROM public.project_cash_transactions
    WHERE id = cash_verified AND status = 'reversed' AND correction_reason = 'Koreksi uji transaksi'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.project_cash_transactions
    WHERE id = reversal AND status = 'verified' AND reversal_of_id = cash_verified
      AND type = 'inflow' AND amount = 1250
  ) THEN
    RAISE EXCEPTION 'Verified cash correction pair did not preserve original and create reversal';
  END IF;
  PERFORM public.archive_project_cash_transaction(org, cash_verified);
  IF (
    SELECT count(*) FROM public.project_cash_transactions
    WHERE id IN (cash_verified, reversal) AND deleted_at IS NOT NULL
  ) <> 2 THEN
    RAISE EXCEPTION 'Corrected cash pair was not archived atomically';
  END IF;

  INSERT INTO public.cash_advance_requests (
    id, organization_id, project_id, ticket_number, request_type,
    employee_name, amount, purpose, created_by
  )
  VALUES (advance, org, project, 'ARCHIVE-ADVANCE', 'kasbon', 'Worker Test', 500, 'Advance test', uid);
  PERFORM public.archive_cash_advance_request(org, advance);
  IF (SELECT deleted_at IS NULL FROM public.cash_advance_requests WHERE id = advance) THEN
    RAISE EXCEPTION 'Pending cash advance archive did not soft-delete';
  END IF;

  INSERT INTO public.roles_permissions (organization_id, role, module, action, allowed)
  VALUES (org, 'owner', 'procurement', 'delete', true);
  INSERT INTO public.vendors (id, organization_id, code, name, category, contact_person, phone, created_by)
  VALUES (vendor, org, 'ARCHIVE-VENDOR', 'Archive Vendor', 'Umum', 'Contact Test', '0800000000', uid);

  INSERT INTO public.purchase_requests (
    id, organization_id, project_id, pr_number, required_date, requester_id,
    department, urgency, status, created_by
  )
  VALUES (request_archive, org, project, 'ARCHIVE-PR-1', CURRENT_DATE + 3, uid, 'Site', 'normal', 'draft', uid);
  PERFORM public.archive_purchase_request(org, request_archive);
  IF (SELECT deleted_at IS NULL FROM public.purchase_requests WHERE id = request_archive) THEN
    RAISE EXCEPTION 'Draft purchase request archive did not soft-delete';
  END IF;

  INSERT INTO public.purchase_requests (
    id, organization_id, project_id, pr_number, required_date, requester_id,
    department, urgency, status, created_by
  )
  VALUES (request_quote, org, project, 'ARCHIVE-PR-2', CURRENT_DATE + 3, uid, 'Site', 'normal', 'approved', uid);
  INSERT INTO public.vendor_quotes (
    id, organization_id, project_id, purchase_request_id, vendor_id, quote_number,
    quote_date, subtotal, ppn_amount, grand_total, created_by
  )
  VALUES (quote_archive, org, project, request_quote, vendor, 'ARCHIVE-QUOTE-1', CURRENT_DATE, 1000, 0, 1000, uid);
  PERFORM public.archive_vendor_quote(org, quote_archive);
  IF (SELECT deleted_at IS NULL FROM public.vendor_quotes WHERE id = quote_archive) THEN
    RAISE EXCEPTION 'Standalone vendor quote archive did not soft-delete';
  END IF;

  INSERT INTO public.purchase_requests (
    id, organization_id, project_id, pr_number, required_date, requester_id,
    department, urgency, status, created_by
  )
  VALUES (request_po, org, project, 'ARCHIVE-PR-3', CURRENT_DATE + 3, uid, 'Site', 'normal', 'converted_to_po', uid);
  INSERT INTO public.vendor_quotes (
    id, organization_id, project_id, purchase_request_id, vendor_id, quote_number,
    quote_date, subtotal, ppn_amount, grand_total, created_by
  )
  VALUES (quote_po, org, project, request_po, vendor, 'ARCHIVE-QUOTE-2', CURRENT_DATE, 0, 0, 0, uid);
  INSERT INTO public.purchase_orders (
    id, organization_id, project_id, purchase_request_id, vendor_quote_id, vendor_id,
    po_number, delivery_deadline, delivery_address, subtotal, ppn_percent, ppn_amount,
    grand_total, status, approved_by, approved_at, created_by
  )
  VALUES (
    po, org, project, request_po, quote_po, vendor, 'ARCHIVE-PO-1', CURRENT_DATE + 10,
    'Site Test', 0, 11, 0, 0, 'approved', uid, now(), uid
  );
  BEGIN
    PERFORM public.cancel_purchase_order(org, po, 'no');
    RAISE EXCEPTION 'Short cancellation reason unexpectedly accepted';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
  PERFORM public.cancel_purchase_order(org, po, 'Pembatalan uji PO');
  IF NOT EXISTS (
    SELECT 1 FROM public.purchase_orders
    WHERE id = po AND status = 'cancelled' AND cancellation_reason = 'Pembatalan uji PO'
      AND cancelled_by = uid AND cancelled_at IS NOT NULL
  ) OR NOT EXISTS (
    SELECT 1 FROM public.purchase_requests WHERE id = request_po AND status = 'approved'
  ) THEN
    RAISE EXCEPTION 'PO cancellation metadata or PR restoration failed';
  END IF;
  PERFORM public.archive_purchase_order(org, po);
  IF (SELECT deleted_at IS NULL FROM public.purchase_orders WHERE id = po) THEN
    RAISE EXCEPTION 'Cancelled PO archive did not soft-delete';
  END IF;
  PERFORM public.archive_purchase_request(org, request_po);
  IF (SELECT deleted_at IS NULL FROM public.purchase_requests WHERE id = request_po) THEN
    RAISE EXCEPTION 'Purchase request with cancelled PO did not archive';
  END IF;

  RAISE NOTICE 'Positive archive flows passed: attendance permissions/immutability, cash correction, advance, PR, quote, and PO cancellation/archive.';
END;
$$;

ROLLBACK;
