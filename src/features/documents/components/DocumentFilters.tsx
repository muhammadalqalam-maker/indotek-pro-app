import { FilterChips, Select, type FilterChipOption } from '../../../components/ui';
import { getMessages } from '../../../i18n';
import type { Project } from '../../../types/database';
import { DOCUMENT_CATEGORIES } from '../schemas/documents.schema';
import type { DocumentCategory } from '../types';

const messages = getMessages().documents;

interface DocumentFiltersProps {
  projectScoped: boolean;
  projects: Project[];
  selectedProjectId: string;
  onProjectChange: (projectId: string) => void;
  selectedCategory: DocumentCategory | 'all';
  onCategoryChange: (category: DocumentCategory | 'all') => void;
}

export function DocumentFilters({
  projectScoped,
  projects,
  selectedProjectId,
  onProjectChange,
  selectedCategory,
  onCategoryChange,
}: DocumentFiltersProps) {
  const categoryOptions: FilterChipOption<DocumentCategory | 'all'>[] = [
    { value: 'all', label: messages.allCategories },
    ...DOCUMENT_CATEGORIES.map((category) => ({
      value: category,
      label: messages.categories[category],
    })),
  ];

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <FilterChips
        label={messages.categoryLabel}
        value={selectedCategory}
        options={categoryOptions}
        onValueChange={onCategoryChange}
      />
      {!projectScoped && (
        <Select
          label={messages.project}
          value={selectedProjectId}
          onChange={(event) => onProjectChange(event.currentTarget.value)}
        >
          <option value="all">{messages.allProjects}</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </Select>
      )}
    </div>
  );
}
