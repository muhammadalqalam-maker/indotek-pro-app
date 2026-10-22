import test from 'node:test';
import assert from 'node:assert/strict';
import { subcontractSchema, subcontractorSchema } from './subcontractor.schema';

const subcontractor = { code: 'SUB-01', companyName: 'PT Karya Mandiri', tradeSpecialty: 'Pekerjaan struktur', picName: 'Budi', phone: '08123456789', email: '', address: '', npwp: '', bankName: '', bankAccountNo: '', bankAccountName: '' };
const contract = { projectId: '00000000-0000-4000-8000-000000000001', subcontractorId: '00000000-0000-4000-8000-000000000002', spkNumber: 'SPK/001', workDescription: 'Pekerjaan struktur lantai satu', contractDate: '2026-10-22', startDate: '2026-10-23', endDate: '2026-12-23', contractAmount: 150000000, retentionPercent: 5, status: 'active' as const, notes: '' };

test('validates subcontractor master data', () => { assert.equal(subcontractorSchema.safeParse(subcontractor).success, true); assert.equal(subcontractorSchema.safeParse({ ...subcontractor, companyName: '' }).success, false); });
test('rejects subcontract end date before start date', () => { assert.equal(subcontractSchema.safeParse(contract).success, true); assert.equal(subcontractSchema.safeParse({ ...contract, endDate: '2026-10-22' }).success, false); });
