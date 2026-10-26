import { CircleHelp, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getMessages } from '../../i18n';

const messages = getMessages('id').common;

export function RouteStatusPage({ status }: { status: 'forbidden' | 'not-found' }) {
  const isForbidden = status === 'forbidden';
  const Icon = isForbidden ? ShieldAlert : CircleHelp;
  const title = isForbidden ? messages.accessDeniedTitle : messages.notFoundTitle;
  const description = isForbidden
    ? messages.accessDeniedDescription
    : messages.notFoundDescription;

  return (
    <section
      aria-labelledby="route-status-title"
      className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-xl border border-border bg-surface p-6 text-center sm:p-8"
      role={isForbidden ? 'alert' : 'status'}
    >
      <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-muted-foreground">
        <Icon aria-hidden="true" className="h-6 w-6" />
      </span>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-text" id="route-status-title">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Link
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary-700 px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        to="/dashboard"
      >
        {messages.returnHome}
      </Link>
    </section>
  );
}
