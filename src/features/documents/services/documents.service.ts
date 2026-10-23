import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '../../../lib/supabase';
import type { Database, Tables } from '../../../types/database.types';
import {
  documentAccessSchema,
  documentCategorySchema,
  documentFormSchema,
  documentVersionFileSchema,
} from '../schemas/documents.schema';
import type {
  AddProjectDocumentVersionInput,
  CreateProjectDocumentInput,
  ProjectDocument,
  ProjectDocumentVersion,
} from '../types';

const DOCUMENT_BUCKET = 'project-documents';
const FILE_EXTENSIONS: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function getClient(): SupabaseClient<Database> {
  const client = getSupabase();
  if (!client) throw new Error('Repositori dokumen memerlukan koneksi Supabase.');
  return client;
}

function createFilePath(
  organizationId: string,
  projectId: string,
  documentId: string,
  versionId: string,
  file: File,
): string {
  const extension = FILE_EXTENSIONS[file.type];
  if (!extension) throw new Error('Format file dokumen tidak didukung.');
  return `${organizationId}/${projectId}/${documentId}/${versionId}.${extension}`;
}

async function uploadFile(path: string, file: File): Promise<void> {
  documentVersionFileSchema.parse(file);
  const { error } = await getClient()
    .storage
    .from(DOCUMENT_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
}

async function removeUnlinkedFile(path: string): Promise<void> {
  const { error } = await getClient().storage.from(DOCUMENT_BUCKET).remove([path]);
  if (error) throw error;
}

async function cleanupAfterFailure(path: string, originalError: unknown): Promise<never> {
  try {
    await removeUnlinkedFile(path);
  } catch (cleanupError: unknown) {
    throw new AggregateError(
      [originalError, cleanupError],
      'Dokumen gagal disimpan dan file sementara tidak berhasil dibersihkan.',
    );
  }
  throw originalError;
}

export async function fetchProjectDocuments(
  organizationId: string,
  projectId: string,
): Promise<ProjectDocument[]> {
  const client = getClient();
  let documentsQuery = client
    .from('project_documents')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (projectId !== 'all') documentsQuery = documentsQuery.eq('project_id', projectId);

  const { data: documents, error: documentsError } = await documentsQuery;
  if (documentsError) throw documentsError;
  if (documents.length === 0) return [];

  const { data: versions, error: versionsError } = await client
    .from('project_document_versions')
    .select('*')
    .eq('organization_id', organizationId)
    .in('document_id', documents.map((document) => document.id))
    .is('deleted_at', null)
    .order('version_number', { ascending: false });
  if (versionsError) throw versionsError;

  const versionsByDocument = new Map<string, ProjectDocumentVersion[]>();
  for (const version of versions) {
    const entries = versionsByDocument.get(version.document_id) ?? [];
    entries.push(version);
    versionsByDocument.set(version.document_id, entries);
  }

  return documents.map((document) => ({
    ...document,
    category: documentCategorySchema.parse(document.category),
    versions: versionsByDocument.get(document.id) ?? [],
  }));
}

export async function createProjectDocument(
  organizationId: string,
  input: CreateProjectDocumentInput,
): Promise<void> {
  const { file, ...values } = input;
  const document = documentFormSchema.parse(values);
  documentVersionFileSchema.parse(file);
  const documentId = crypto.randomUUID();
  const versionId = crypto.randomUUID();
  const filePath = createFilePath(organizationId, document.project_id, documentId, versionId, file);

  await uploadFile(filePath, file);
  const { error } = await getClient().rpc('create_project_document_with_version', {
    p_document_id: documentId,
    p_organization_id: organizationId,
    p_project_id: document.project_id,
    p_document_number: document.document_number,
    p_title: document.title,
    p_category: document.category,
    p_access_roles: document.access_roles,
    p_expires_on: document.expires_on,
    p_version_id: versionId,
    p_file_path: filePath,
    p_file_name: file.name,
    p_content_type: file.type,
    p_file_size_bytes: file.size,
  });
  if (error) await cleanupAfterFailure(filePath, error);
}

export async function addProjectDocumentVersion({
  document,
  file,
}: AddProjectDocumentVersionInput): Promise<void> {
  documentVersionFileSchema.parse(file);
  const versionId = crypto.randomUUID();
  const filePath = createFilePath(
    document.organization_id,
    document.project_id,
    document.id,
    versionId,
    file,
  );
  await uploadFile(filePath, file);

  const { error } = await getClient().from('project_document_versions').insert({
    id: versionId,
    organization_id: document.organization_id,
    project_id: document.project_id,
    document_id: document.id,
    file_path: filePath,
    file_name: file.name,
    content_type: file.type,
    file_size_bytes: file.size,
  });
  if (error) await cleanupAfterFailure(filePath, error);
}

export async function updateProjectDocument(
  organizationId: string,
  documentId: string,
  values: Pick<Tables<'project_documents'>, 'access_roles' | 'expires_on'>,
): Promise<void> {
  const access = documentAccessSchema.parse(values);
  const { error } = await getClient()
    .from('project_documents')
    .update(access)
    .eq('organization_id', organizationId)
    .eq('id', documentId);
  if (error) throw error;
}

export async function archiveProjectDocument(organizationId: string, documentId: string): Promise<void> {
  const { error } = await getClient()
    .from('project_documents')
    .update({ deleted_at: new Date().toISOString() })
    .eq('organization_id', organizationId)
    .eq('id', documentId);
  if (error) throw error;
}

export async function createProjectDocumentSignedUrl(filePath: string): Promise<string> {
  const { data, error } = await getClient()
    .storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(filePath, 300);
  if (error) throw error;
  if (!data.signedUrl) throw new Error('Tautan pratinjau dokumen tidak tersedia.');
  return data.signedUrl;
}
