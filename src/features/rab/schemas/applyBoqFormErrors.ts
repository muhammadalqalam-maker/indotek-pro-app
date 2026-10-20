import type { UseFormReturn } from 'react-hook-form';
import type { ZodIssue } from 'zod';
import type { BoqDraftFormValues } from './boq.schema';

export function applyBoqFormErrors(form: UseFormReturn<BoqDraftFormValues>, issues: ZodIssue[]) {
  issues.forEach((issue) => {
    const [section, divisionIndex, group, itemIndex, field] = issue.path;
    const message = issue.message;
    if (section === 'title') {
      form.setError('title', { type: 'validate', message });
      return;
    }
    if (section === 'overhead_percent' || section === 'profit_percent' || section === 'ppn_percent') {
      form.setError(section, { type: 'validate', message });
      return;
    }
    if (section !== 'divisions' || typeof divisionIndex !== 'number') return;
    if (group === 'item_code' || group === 'description') {
      form.setError(`divisions.${divisionIndex}.${group}`, { type: 'validate', message });
      return;
    }
    if (group !== 'work_items' || typeof itemIndex !== 'number') return;
    if (
      field === 'item_code'
      || field === 'description'
      || field === 'unit_id'
      || field === 'volume'
      || field === 'unit_price'
    ) {
      form.setError(`divisions.${divisionIndex}.work_items.${itemIndex}.${field}`, { type: 'validate', message });
    }
  });
}
