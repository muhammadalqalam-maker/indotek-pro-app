import type { ProjectStatus } from '../../types/database';
import { getMessages } from '../../i18n';

const messages = getMessages('id').projects;

export const projectStatusLabels: Record<ProjectStatus, string> = messages.statusLabels;

export const projectStatusVariants = {
  planning: 'info',
  active: 'default',
  delayed: 'danger',
  completed: 'success',
  maintenance: 'neutral',
} as const;
