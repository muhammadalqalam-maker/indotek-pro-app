import { FileText } from 'lucide-react';
import { getMessages } from '../../i18n';

const messages = getMessages().reportAnalytics;

export function ReportPageHeading() {
  return (
    <header>
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary-600" aria-hidden="true" />
        <h1 className="text-2xl font-bold tracking-tight text-text">{messages.title}</h1>
      </div>
      <p className="mt-1 max-w-3xl text-sm text-muted">{messages.description}</p>
    </header>
  );
}
