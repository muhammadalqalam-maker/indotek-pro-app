import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button, ConfirmDialog, EmptyState, ErrorState, Input, Skeleton } from '../../../components/ui';
import { useToast } from '../../../components/ui/Toast';
import { useApp } from '../../../context/AppContext';
import type { UserRole } from '../../../utils/permissions';
import { getMessages } from '../../../i18n';
import { DocumentForm } from './DocumentForm';
import { DocumentFilters } from './DocumentFilters';
import { DocumentPreviewDialog } from './DocumentPreviewDialog';
import { ProjectDocumentCard } from './ProjectDocumentCard';
import { useDocumentsWorkspace } from '../hooks/useDocumentsWorkspace';
import type { DocumentCategory } from '../types';
import type { ProjectDocument, ProjectDocumentVersion } from '../types';

const messages = getMessages().documents;
const UPLOAD_ROLES: readonly UserRole[] = ['owner', 'admin', 'project_manager', 'site_manager'];
const ARCHIVE_ROLES: readonly UserRole[] = ['owner', 'admin', 'project_manager'];

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : messages.saveError;
}

export function DocumentsWorkspace({ projectId }: { projectId?: string }) {
  const {
    currentOrg,
    authSession,
    projects,
    selectedProjectId,
    setSelectedProjectId,
    isSupabaseLive,
    can,
    currentMemberRole,
    organizationDataError,
  } = useApp();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<ProjectDocument | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [documentToArchive, setDocumentToArchive] = useState<ProjectDocument | null>(null);
  const deferredSearch = useDeferredValue(searchTerm.trim().toLocaleLowerCase());
  const previewRequestId = useRef(0);

  const activeProjectId = projectId ?? selectedProjectId;
  useEffect(() => {
    previewRequestId.current += 1;
    setSearchTerm('');
    setSelectedCategory('all');
    setShowForm(false);
    setSelectedDocument(null);
    setSelectedVersionId(null);
    setPreviewUrl('');
    setPreviewError('');
    setDocumentToArchive(null);
  }, [activeProjectId, authSession?.user.id, currentOrg?.id]);
  const workspace = useDocumentsWorkspace(
    currentOrg?.id ?? '',
    activeProjectId,
    isSupabaseLive && can('projects', 'view'),
  );
  const documents = workspace.query.data ?? [];
  const projectNames = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );
  const canManage = Boolean(
    currentMemberRole
    && UPLOAD_ROLES.includes(currentMemberRole)
    && can('projects', 'edit'),
  );
  const canArchive = Boolean(
    currentMemberRole
    && ARCHIVE_ROLES.includes(currentMemberRole)
    && can('projects', 'delete'),
  );
  const canView = can('projects', 'view');
  const activeProject = activeProjectId === 'all'
    ? null
    : projects.find((project) => project.id === activeProjectId) ?? null;
  const filteredDocuments = documents.filter((document) => {
    const latestVersion = document.versions[0];
    const matchesCategory = selectedCategory === 'all' || document.category === selectedCategory;
    const matchesSearch = [
      document.title,
      document.document_number,
      latestVersion?.file_name ?? '',
    ].some((value) => value.toLocaleLowerCase().includes(deferredSearch));
    return matchesCategory && matchesSearch;
  });
  const defaultProjectId = activeProjectId === 'all' ? '' : activeProjectId;
  const isSaving = workspace.create.isPending
    || workspace.addVersion.isPending
    || workspace.update.isPending
    || workspace.archive.isPending;

  const loadPreview = async (version: ProjectDocumentVersion) => {
    const requestId = ++previewRequestId.current;
    setSelectedVersionId(version.id);
    setPreviewUrl('');
    setPreviewError('');
    try {
      const url = await workspace.preview.mutateAsync(version.file_path);
      if (requestId === previewRequestId.current) setPreviewUrl(url);
    } catch (error: unknown) {
      if (requestId === previewRequestId.current) setPreviewError(getErrorMessage(error));
    }
  };

  const closeDocumentPreview = () => {
    previewRequestId.current += 1;
    setSelectedDocument(null);
    setPreviewUrl('');
    setPreviewError('');
    setSelectedVersionId(null);
  };

  const openDocument = (document: ProjectDocument) => {
    previewRequestId.current += 1;
    setSelectedDocument(document);
    setPreviewUrl('');
    setPreviewError('');
    const latestVersion = document.versions[0];
    setSelectedVersionId(latestVersion?.id ?? null);
    if (latestVersion) void loadPreview(latestVersion);
  };

  const createDocument = async (input: Parameters<typeof workspace.create.mutateAsync>[0]) => {
    try {
      await workspace.create.mutateAsync(input);
      setShowForm(false);
      toast({ title: messages.documentSaved, variant: 'success' });
    } catch (error: unknown) {
      toast({ title: messages.saveError, description: getErrorMessage(error), variant: 'error' });
    }
  };

  const addVersion = async (file: File) => {
    if (!selectedDocument) return;
    await workspace.addVersion.mutateAsync({ document: selectedDocument, file });
    closeDocumentPreview();
    toast({ title: messages.versionSaved, variant: 'success' });
  };

  const saveAccess = async (roles: UserRole[], expiresOn: string | null) => {
    if (!selectedDocument) return;
    try {
      await workspace.update.mutateAsync({
        documentId: selectedDocument.id,
        values: { access_roles: roles, expires_on: expiresOn },
      });
      closeDocumentPreview();
      toast({ title: messages.accessSaved, variant: 'success' });
    } catch (error: unknown) {
      toast({ title: messages.saveError, description: getErrorMessage(error), variant: 'error' });
    }
  };

  const archiveDocument = async () => {
    if (!documentToArchive) return;
    try {
      await workspace.archive.mutateAsync(documentToArchive.id);
      setDocumentToArchive(null);
      if (selectedDocument?.id === documentToArchive.id) closeDocumentPreview();
      toast({ title: messages.documentArchived, variant: 'success' });
    } catch (error: unknown) {
      toast({ title: messages.saveError, description: getErrorMessage(error), variant: 'error' });
    }
  };

  if (!isSupabaseLive) {
    return (
      <div role="alert" className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-text">
        {messages.connectionRequired}
      </div>
    );
  }
  if (!currentOrg) {
    return <ErrorState title={messages.loadError} description={organizationDataError || messages.organizationRequired} />;
  }
  if (!canView) {
    return <ErrorState title={messages.permissionDenied} description={messages.permissionDeniedDescription} />;
  }
  if (projects.length === 0) {
    return <EmptyState title={messages.noProjects} description={messages.noProjectsDescription} />;
  }

  return (
    <section className="grid gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text sm:text-2xl">{messages.title}</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {activeProject ? messages.projectDescription.replace('{project}', activeProject.name) : messages.description}
          </p>
        </div>
        {canManage && !showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="size-4" aria-hidden="true" />
            {messages.newDocument}
          </Button>
        )}
      </header>

      {showForm && canManage && (
        <DocumentForm
          projects={projects}
          defaultProjectId={defaultProjectId}
          isSaving={workspace.create.isPending}
          onCancel={() => setShowForm(false)}
          onSave={createDocument}
        />
      )}

      <DocumentFilters
        projectScoped={Boolean(projectId)}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onProjectChange={setSelectedProjectId}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      <Input
        label={messages.search}
        placeholder={messages.searchPlaceholder}
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.currentTarget.value)}
        prefix={<Search className="size-4" aria-hidden="true" />}
      />

      {workspace.query.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label={messages.loading}>
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : workspace.query.isError ? (
        <ErrorState
          title={messages.loadError}
          description={getErrorMessage(workspace.query.error)}
          onRetry={() => { void workspace.query.refetch(); }}
          retryLabel={messages.retry}
        />
      ) : filteredDocuments.length === 0 ? (
        <EmptyState
          title={documents.length === 0 ? messages.emptyTitle : messages.noResults}
          description={documents.length === 0 ? messages.emptyDescription : messages.noResultsDescription}
          actionLabel={documents.length === 0 && canManage ? messages.newDocument : undefined}
          onAction={documents.length === 0 && canManage ? () => setShowForm(true) : undefined}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredDocuments.map((document) => (
            <ProjectDocumentCard
              key={document.id}
              document={document}
              projectName={projectNames.get(document.project_id) ?? messages.projectUnavailable}
              canArchive={canArchive}
              onPreview={() => openDocument(document)}
              onArchive={() => setDocumentToArchive(document)}
            />
          ))}
        </div>
      )}

      <DocumentPreviewDialog
        key={selectedDocument?.id ?? 'closed'}
        document={selectedDocument}
        canManage={canManage}
        isSaving={isSaving}
        isPreviewLoading={workspace.preview.isPending}
        previewUrl={previewUrl}
        selectedVersionId={selectedVersionId}
        previewError={previewError}
        onClose={closeDocumentPreview}
        onSelectVersion={(version) => { void loadPreview(version); }}
        onAddVersion={addVersion}
        onSaveAccess={saveAccess}
      />
      <ConfirmDialog
        open={documentToArchive !== null}
        onOpenChange={(open) => { if (!open) setDocumentToArchive(null); }}
        title={messages.archiveConfirmTitle}
        description={messages.archiveConfirmDescription}
        confirmLabel={messages.archive}
        cancelLabel={messages.cancel}
        destructive
        loading={workspace.archive.isPending}
        onConfirm={() => { void archiveDocument(); }}
      />
    </section>
  );
}
