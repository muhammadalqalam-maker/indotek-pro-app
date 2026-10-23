import { useState } from 'react';
import { Button, Checkbox, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input } from '../../../components/ui';
import { formatTanggal } from '../../../utils/format';
import { getMessages } from '../../../i18n';
import type { UserRole } from '../../../utils/permissions';
import { DOCUMENT_ACCESS_ROLES } from '../schemas/documents.schema';
import type { ProjectDocument, ProjectDocumentVersion } from '../types';

const messages = getMessages().documents;

interface DocumentPreviewDialogProps {
  document: ProjectDocument | null;
  canManage: boolean;
  isSaving: boolean;
  isPreviewLoading: boolean;
  previewUrl: string;
  selectedVersionId: string | null;
  previewError: string;
  onClose: () => void;
  onSelectVersion: (version: ProjectDocumentVersion) => void;
  onAddVersion: (file: File) => Promise<void>;
  onSaveAccess: (roles: UserRole[], expiresOn: string | null) => Promise<void>;
}

export function DocumentPreviewDialog({
  document,
  canManage,
  isSaving,
  isPreviewLoading,
  previewUrl,
  selectedVersionId,
  previewError,
  onClose,
  onSelectVersion,
  onAddVersion,
  onSaveAccess,
}: DocumentPreviewDialogProps) {
  const [readerRoles, setReaderRoles] = useState<UserRole[]>(document?.access_roles ?? []);
  const [expiresOn, setExpiresOn] = useState(document?.expires_on ?? '');
  const [accessError, setAccessError] = useState('');
  const [fileError, setFileError] = useState('');

  const toggleRole = (role: UserRole, checked: boolean) => {
    setReaderRoles((previous) => (
      checked ? [...previous, role] : previous.filter((item) => item !== role)
    ));
    setAccessError('');
  };

  const saveAccess = async () => {
    if (readerRoles.length === 0) {
      setAccessError(messages.validation.readerRequired);
      return;
    }
    setAccessError('');
    await onSaveAccess(readerRoles, expiresOn || null);
  };

  const chooseNewVersion = async (file: File | undefined) => {
    if (!file) return;
    setFileError('');
    try {
      await onAddVersion(file);
    } catch (error: unknown) {
      setFileError(error instanceof Error ? error.message : messages.saveError);
    }
  };

  return (
    <Dialog open={document !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="bottom-0 left-0 top-auto max-h-[90dvh] w-full max-w-none translate-x-0 translate-y-0 rounded-b-none rounded-t-xl p-4 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100%-2rem)] sm:max-w-3xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:p-6">
        {document && (
          <>
            <DialogHeader>
              <DialogTitle>{document.title}</DialogTitle>
              <DialogDescription>
                {document.document_number} · {messages.categories[document.category]}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
              <section className="min-h-64 overflow-hidden rounded-lg border border-border bg-surface-2">
                {isPreviewLoading ? (
                  <div className="grid min-h-64 place-items-center text-sm text-muted" role="status">
                    {messages.loadingPreview}
                  </div>
                ) : previewError ? (
                  <p className="p-4 text-sm text-danger" role="alert">{previewError}</p>
                ) : previewUrl && document.versions.find((version) => version.id === selectedVersionId)?.content_type.startsWith('image/') ? (
                  <img src={previewUrl} alt={`${document.title} ${messages.preview}`} className="max-h-[65dvh] w-full object-contain" />
                ) : previewUrl ? (
                  <iframe
                    src={previewUrl}
                    title={`${messages.preview}: ${document.title}`}
                    className="h-[65dvh] min-h-64 w-full bg-surface"
                  />
                ) : (
                  <p className="p-4 text-sm text-muted">{messages.previewUnavailable}</p>
                )}
              </section>

              <aside className="grid content-start gap-4">
                <div className="grid gap-2">
                  <h3 className="text-sm font-semibold text-text">{messages.versionHistory}</h3>
                  {document.versions.map((version) => (
                    <button
                      key={version.id}
                      type="button"
                      onClick={() => onSelectVersion(version)}
                      aria-pressed={version.id === selectedVersionId}
                      className="flex min-h-11 items-center justify-between gap-2 rounded-md border border-border px-3 text-left text-sm text-text hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    >
                      <span>{messages.revision} {version.version_number}</span>
                      <span className="text-xs text-muted">{formatTanggal(version.created_at)}</span>
                    </button>
                  ))}
                </div>

                {canManage && (
                  <div className="grid gap-2">
                    <label htmlFor="document-new-version" className="text-sm font-medium text-text">
                      {messages.addVersion}
                    </label>
                    <input
                      id="document-new-version"
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      disabled={isSaving}
                      onChange={(event) => {
                        void chooseNewVersion(event.currentTarget.files?.[0]);
                        event.currentTarget.value = '';
                      }}
                      className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-2 py-2 text-base text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    />
                    {fileError && <p role="alert" className="text-xs text-danger">{fileError}</p>}
                  </div>
                )}
              </aside>
            </div>

            {canManage && (
              <fieldset className="grid gap-3 border-t border-border pt-4">
                <legend className="text-sm font-semibold text-text">{messages.accessAndExpiry}</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    type="date"
                    label={messages.expiryDate}
                    value={expiresOn}
                    onChange={(event) => setExpiresOn(event.currentTarget.value)}
                  />
                  <div className="grid gap-x-4 sm:grid-cols-2">
                    {DOCUMENT_ACCESS_ROLES.map((role) => (
                      <Checkbox
                        key={role}
                        id={`edit-document-role-${role}`}
                        label={messages.roles[role]}
                        checked={readerRoles.includes(role)}
                        onChange={(event) => toggleRole(role, event.currentTarget.checked)}
                      />
                    ))}
                  </div>
                </div>
                {accessError && <p role="alert" className="text-xs text-danger">{accessError}</p>}
                <Button variant="outline" loading={isSaving} onClick={() => { void saveAccess(); }}>
                  {messages.saveAccess}
                </Button>
              </fieldset>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
