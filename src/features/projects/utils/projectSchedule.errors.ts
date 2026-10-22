import { getMessages } from '../../../i18n';

const messages = getMessages('id').projects.schedule;

export function getScheduleErrorDetail(error: unknown): string {
  if (!(error instanceof Error)) return messages.unexpectedError;
  if (error.message.includes('Finish-to-start dependencies require')) return messages.dependencyDateConflict;
  if (error.message.includes('dependency cycle')) return messages.dependencyCycle;
  if (error.message.includes('hierarchy cannot contain a cycle')) return messages.parentCycle;
  if (error.message.includes('Archive child tasks')) return messages.archiveParentError;
  return error.message;
}
