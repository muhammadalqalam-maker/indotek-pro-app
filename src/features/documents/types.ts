import type { Tables } from '../../types/database.types';
import type { UserRole } from '../../utils/permissions';
import type { DOCUMENT_CATEGORIES } from './schemas/documents.schema';

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];
export type ProjectDocumentRecord = Tables<'project_documents'>;
export type ProjectDocumentVersionRecord = Tables<'project_document_versions'>;
export type ProjectDocumentVersion = ProjectDocumentVersionRecord;

export interface ProjectDocument extends Omit<ProjectDocumentRecord, 'category'> {
  category: DocumentCategory;
  versions: ProjectDocumentVersion[];
}

export interface CreateProjectDocumentInput {
  project_id: string;
  document_number: string;
  title: string;
  category: DocumentCategory;
  access_roles: UserRole[];
  expires_on: string | null;
  file: File;
}

export interface AddProjectDocumentVersionInput {
  document: ProjectDocument;
  file: File;
}
