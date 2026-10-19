import type { ReactNode } from 'react';
import { Badge, EmptyState } from '../../../components/ui';
import { getMessages } from '../../../i18n';

const messages = getMessages('id').projects;

export function ProjectPlaceholderTab({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-text">{title}</h2>
        <Badge variant="outline">{messages.detail.comingSoon}</Badge>
      </div>
      <EmptyState
        title={messages.detail.comingSoon}
        description={description}
        icon={icon}
        className="min-h-56"
      />
    </section>
  );
}
