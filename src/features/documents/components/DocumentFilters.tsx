import { Select } from '../../../components/ui';
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
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="flex gap-2 overflow-x-auto pb-1" aria-label={messages.categoryLabel}>
        <button
          type="button"
          aria-pressed={selectedCategory === 'all'}
          onClick={() => onCategoryChange('all')}
          className={`min-h-11 shrink-0 rounded-full border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
            selectedCategory === 'all' ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-surface text-text'
          }`}
        >
          {messages.allCategories}
        </button>
        {DOCUMENT_CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            aria-pressed={selectedCategory === category}
            onClick={() => onCategoryChange(category)}
            className={`min-h-11 shrink-0 rounded-full border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
              selectedCategory === category ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-surface text-text'
            }`}
          >
            {messages.categories[category]}
          </button>
        ))}
      </div>
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
