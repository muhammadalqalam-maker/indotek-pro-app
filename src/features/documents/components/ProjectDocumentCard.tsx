import { Archive, Eye, FileText } from 'lucide-react';
import { Badge, Button } from '../../../components/ui';
import { formatTanggal } from '../../../utils/format';
import { getMessages } from '../../../i18n';
import type { ProjectDocument } from '../types';

const messages = getMessages().documents;

interface ProjectDocumentCardProps {
  document: ProjectDocument;
  projectName: string;
  canArchive: boolean;
  onPreview: () => void;
  onArchive: () => void;
}

function isExpired(date: string): boolean {
  return date < new Date().toISOString().slice(0, 10);
}

export function ProjectDocumentCard({
  document,
  projectName,
  canArchive,
  onPreview,
  onArchive,
}: ProjectDocumentCardProps) {
  const latestVersion = document.versions[0];
  const expired = document.expires_on !== null && isExpired(document.expires_on);

  return (
    <article className="grid content-start gap-3 rounded-xl border border-border bg-surface p-4 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-2 text-primary-700 dark:text-primary-500">
            <FileText className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted">{messages.categories[document.category]}</p>
            <p className="truncate text-xs text-subtle">{document.document_number}</p>
          </div>
        </div>
        {expired ? (
          <Badge variant="danger">{messages.expired}</Badge>
        ) : document.expires_on ? (
          <Badge variant="warning">{messages.expiryBadge}</Badge>
        ) : (
          <Badge variant="neutral">{messages.noExpiry}</Badge>
        )}
      </div>
      <div>
        <h2 className="line-clamp-2 text-sm font-semibold text-text">{document.title}</h2>
        <p className="mt-1 text-xs text-muted">{projectName}</p>
      </div>
      <div className="grid gap-1 rounded-lg bg-surface-2 p-3 text-xs text-muted">
        <p className="truncate">{latestVersion?.file_name ?? messages.versionMissing}</p>
        <p>{latestVersion ? `${messages.revision} ${latestVersion.version_number}` : messages.versionMissing}</p>
        <p>{messages.uploaded} {formatTanggal(latestVersion?.created_at)}</p>
        {document.expires_on && <p>{messages.expiryDate}: {formatTanggal(document.expires_on)}</p>}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
        <Button variant="outline" size="sm" onClick={onPreview}>
          <Eye className="size-4" aria-hidden="true" />
          {messages.preview}
        </Button>
        {canArchive && (
          <Button
            variant="ghost"
            size="sm"
            aria-label={`${messages.archive}: ${document.title}`}
            onClick={onArchive}
          >
            <Archive className="size-4" aria-hidden="true" />
            {messages.archive}
          </Button>
        )}
      </div>
    </article>
  );
}
