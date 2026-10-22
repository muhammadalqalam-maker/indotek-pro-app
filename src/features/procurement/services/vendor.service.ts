import { getSupabase } from '../../../lib/supabase';
import type { Vendor } from '../../../types/database';
import type { Tables } from '../../../types/database.types';
import type { VendorEvaluationInput, VendorInput } from '../schemas/vendor.schema';
import { vendorCategories } from '../schemas/vendor.schema';

type VendorEvaluationRecord = Pick<
  Tables<'vendor_evaluations'>,
  | 'id'
  | 'organization_id'
  | 'vendor_id'
  | 'transaction_reference'
  | 'quality_score'
  | 'price_score'
  | 'delivery_score'
  | 'service_score'
  | 'overall_score'
  | 'comment'
  | 'evaluated_by'
  | 'created_at'
>;

export type VendorEvaluation = Omit<VendorEvaluationRecord, 'overall_score'> & {
  overall_score: number;
};

type VendorRecord = Pick<
  Tables<'vendors'>,
  | 'id'
  | 'organization_id'
  | 'code'
  | 'name'
  | 'category'
  | 'contact_person'
  | 'phone'
  | 'email'
  | 'address'
  | 'npwp'
  | 'payment_terms_days'
  | 'is_active'
  | 'rating'
  | 'evaluation_count'
  | 'created_at'
  | 'updated_at'
  | 'deleted_at'
>;

function getClient() {
  const client = getSupabase();
  if (!client) throw new Error('Koneksi Supabase belum tersedia.');
  return client;
}

function toVendorCategory(value: string): Vendor['category'] {
  const category = vendorCategories.find((candidate) => candidate === value);
  if (!category) throw new Error('Kategori vendor dari server tidak dikenal.');
  return category;
}

function toVendor(row: VendorRecord): Vendor {
  return {
    id: row.id,
    organization_id: row.organization_id,
    code: row.code,
    name: row.name,
    category: toVendorCategory(row.category),
    contact_person: row.contact_person,
    phone: row.phone,
    email: row.email,
    address: row.address,
    npwp: row.npwp,
    bank_name: '',
    bank_account_no: '',
    bank_account_name: '',
    rating: Number(row.rating),
    evaluation_count: row.evaluation_count,
    payment_terms_days: row.payment_terms_days,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  };
}

function toVendorEvaluation(row: VendorEvaluationRecord): VendorEvaluation {
  if (row.overall_score === null) {
    throw new Error('Nilai keseluruhan evaluasi vendor tidak tersedia.');
  }
  return { ...row, overall_score: Number(row.overall_score) };
}

export async function fetchVendors(organizationId: string): Promise<Vendor[]> {
  const { data, error } = await getClient()
    .from('vendors')
    .select('id, organization_id, code, name, category, contact_person, phone, email, address, npwp, payment_terms_days, is_active, rating, evaluation_count, created_at, updated_at, deleted_at')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('name');
  if (error) throw error;
  return data.map(toVendor);
}

export async function createVendorRecord(
  organizationId: string,
  values: VendorInput,
): Promise<Vendor> {
  const { data, error } = await getClient()
    .from('vendors')
    .insert({ ...values, organization_id: organizationId })
    .select('id, organization_id, code, name, category, contact_person, phone, email, address, npwp, payment_terms_days, is_active, rating, evaluation_count, created_at, updated_at, deleted_at')
    .single();
  if (error) throw error;
  return toVendor(data);
}

export async function updateVendorRecord(
  organizationId: string,
  vendorId: string,
  values: VendorInput,
): Promise<Vendor> {
  const { data, error } = await getClient()
    .from('vendors')
    .update(values)
    .eq('organization_id', organizationId)
    .eq('id', vendorId)
    .is('deleted_at', null)
    .select('id, organization_id, code, name, category, contact_person, phone, email, address, npwp, payment_terms_days, is_active, rating, evaluation_count, created_at, updated_at, deleted_at')
    .single();
  if (error) throw error;
  return toVendor(data);
}

export async function archiveVendorRecord(
  organizationId: string,
  vendorId: string,
): Promise<void> {
  const { data, error } = await getClient()
    .from('vendors')
    .update({ is_active: false, deleted_at: new Date().toISOString() })
    .eq('organization_id', organizationId)
    .eq('id', vendorId)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Vendor tidak ditemukan atau tidak dapat diarsipkan.');
}

export async function fetchVendorEvaluations(
  organizationId: string,
  vendorId: string,
): Promise<VendorEvaluation[]> {
  const { data, error } = await getClient()
    .from('vendor_evaluations')
    .select('id, organization_id, vendor_id, transaction_reference, quality_score, price_score, delivery_score, service_score, overall_score, comment, evaluated_by, created_at')
    .eq('organization_id', organizationId)
    .eq('vendor_id', vendorId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data.map(toVendorEvaluation);
}

export async function recordVendorEvaluation(
  organizationId: string,
  vendorId: string,
  values: VendorEvaluationInput,
): Promise<{ rating: number; evaluationCount: number }> {
  const { data, error } = await getClient().rpc('record_vendor_evaluation', {
    p_organization_id: organizationId,
    p_vendor_id: vendorId,
    p_transaction_reference: values.transaction_reference,
    p_quality_score: values.quality_score,
    p_price_score: values.price_score,
    p_delivery_score: values.delivery_score,
    p_service_score: values.service_score,
    p_comment: values.comment,
  });
  if (error) throw error;
  const result = data[0];
  if (!result) throw new Error('Server tidak mengembalikan hasil evaluasi vendor.');
  return { rating: Number(result.rating), evaluationCount: result.evaluation_count };
}
