import type { ProjectStatus } from '../../types/database';
import { getMessages } from '../../i18n';

const messages = getMessages('id').dashboard;

export const dashboardProjectStatusLabels: Record<ProjectStatus, string> = {
  planning: messages.planning,
  active: messages.ongoing,
  delayed: messages.delayed,
  completed: messages.completed,
  maintenance: messages.maintenance,
};

export const dashboardProjectStatusVariants = {
  planning: 'info',
  active: 'default',
  delayed: 'danger',
  completed: 'success',
  maintenance: 'neutral',
} as const;
