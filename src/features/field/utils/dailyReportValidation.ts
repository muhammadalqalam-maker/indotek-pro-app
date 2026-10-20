import { type FieldPath, type UseFormReturn } from 'react-hook-form';
import { getMessages } from '../../../i18n';
import type { DailyReportFormValues } from '../schemas/dailyReport.schema';

const messages = getMessages().fieldReports;

export function applyDailyReportValidationIssues(
  form: UseFormReturn<DailyReportFormValues>,
  issues: readonly { path: PropertyKey[]; message: string }[],
) {
  form.clearErrors();
  const sections = {
    manpower: ['trade_type', 'headcount', 'work_hours', 'remarks'],
    equipment: ['equipment_name', 'quantity', 'active_hours', 'standby_hours', 'remarks'],
    materials: ['material_name', 'quantity', 'unit', 'supplier_name', 'delivery_note_no'],
  } as const;
  const simpleFields = [
    'report_date',
    'site_manager_name',
    'weather_conditions',
    'work_summary',
    'obstacles',
    'solutions',
  ] as const;

  for (const issue of issues) {
    const [section, index, field] = issue.path;
    if (typeof section === 'string' && simpleFields.includes(section as (typeof simpleFields)[number])) {
      form.setError(section as FieldPath<DailyReportFormValues>, { type: 'validation', message: issue.message });
      continue;
    }
    if (
      typeof section === 'string'
      && section in sections
      && typeof index === 'number'
      && Number.isInteger(index)
      && typeof field === 'string'
      && (sections[section as keyof typeof sections] as readonly string[]).includes(field)
    ) {
      form.setError(`${section}.${index}.${field}` as FieldPath<DailyReportFormValues>, {
        type: 'validation',
        message: issue.message,
      });
    }
  }

  form.setError('root.validation', {
    type: 'validation',
    message: issues[0]?.message ?? messages.loadError,
  });
}
