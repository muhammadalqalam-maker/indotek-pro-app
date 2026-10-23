import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  archiveProjectDocument,
  addProjectDocumentVersion,
  createProjectDocument,
  createProjectDocumentSignedUrl,
  fetchProjectDocuments,
  updateProjectDocument,
} from '../services/documents.service';

export function useDocumentsWorkspace(
  organizationId: string,
  projectId: string,
  enabled: boolean,
) {
  const queryClient = useQueryClient();
  const queryKey = ['project-documents', organizationId, projectId];
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['project-documents', organizationId] });
  };
  const query = useQuery({
    queryKey,
    enabled: Boolean(enabled && organizationId),
    queryFn: () => fetchProjectDocuments(organizationId, projectId),
    gcTime: 0,
  });

  const create = useMutation({
    gcTime: 0,
    mutationFn: (input: Parameters<typeof createProjectDocument>[1]) => (
      createProjectDocument(organizationId, input)
    ),
    onSuccess: refresh,
  });
  const addVersion = useMutation({
    gcTime: 0,
    mutationFn: addProjectDocumentVersion,
    onSuccess: refresh,
  });
  const update = useMutation({
    gcTime: 0,
    mutationFn: (input: {
      documentId: string;
      values: Parameters<typeof updateProjectDocument>[2];
    }) => updateProjectDocument(organizationId, input.documentId, input.values),
    onSuccess: refresh,
  });
  const archive = useMutation({
    gcTime: 0,
    mutationFn: (documentId: string) => archiveProjectDocument(organizationId, documentId),
    onSuccess: refresh,
  });
  const preview = useMutation({
    gcTime: 0,
    mutationFn: createProjectDocumentSignedUrl,
  });

  return { query, create, addVersion, update, archive, preview };
}
