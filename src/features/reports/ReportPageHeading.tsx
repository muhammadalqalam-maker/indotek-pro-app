import { FileText } from 'lucide-react';
import { PageHeader } from '../../components/ui';
import { getMessages } from '../../i18n';

const messages = getMessages().reportAnalytics;

export function ReportPageHeading() {
  return (
    <PageHeader
      title={messages.title}
      description={messages.description}
      eyebrow={<FileText className="h-4 w-4 text-primary-600" aria-hidden="true" />}
    />
  );
}
