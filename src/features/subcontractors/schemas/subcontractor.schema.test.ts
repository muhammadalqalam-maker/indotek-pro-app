import test from 'node:test';
import assert from 'node:assert/strict';
import { subcontractOpnameSchema, subcontractSchema, subcontractorSchema } from './subcontractor.schema';

const subcontractor = { code: 'SUB-01', companyName: 'PT Karya Mandiri', tradeSpecialty: 'Pekerjaan struktur', picName: 'Budi', phone: '08123456789', email: '', address: '', npwp: '', bankName: '', bankAccountNo: '', bankAccountName: '' };
const contract = { projectId: '00000000-0000-4000-8000-000000000001', subcontractorId: '00000000-0000-4000-8000-000000000002', spkNumber: 'SPK/001', workDescription: 'Pekerjaan struktur lantai satu', contractDate: '2026-10-22', startDate: '2026-10-23', endDate: '2026-12-23', contractAmount: 150000000, retentionPercent: 5, status: 'active' as const, notes: '' };

test('validates subcontractor master data', () => { assert.equal(subcontractorSchema.safeParse(subcontractor).success, true); assert.equal(subcontractorSchema.safeParse({ ...subcontractor, companyName: '' }).success, false); });
test('rejects subcontract end date before start date', () => { assert.equal(subcontractSchema.safeParse(contract).success, true); assert.equal(subcontractSchema.safeParse({ ...contract, endDate: '2026-10-22' }).success, false); });
test('validates periodic opname deductions', () => { const opname = { subcontractId: contract.subcontractorId, opnameNumber: 'OPN/001', periodStart: '2026-10-23', periodEnd: '2026-10-31', grossAmount: 10000000, notes: '', deductions: [{ description: 'Uang muka', amount: 1000000 }] }; assert.equal(subcontractOpnameSchema.safeParse(opname).success, true); assert.equal(subcontractOpnameSchema.safeParse({ ...opname, deductions: [{ description: 'Uang muka', amount: 11000000 }] }).success, false); });
