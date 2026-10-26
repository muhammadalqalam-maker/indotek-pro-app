import { useState } from 'react';
import { Activity, Boxes, Building2, FileCode, Shield, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getMessages } from '../../i18n';
import { ActivityPanel } from './components/ActivityPanel';
import { CompanyProfilePanel } from './components/CompanyProfilePanel';
import { DocumentNumberingPanel } from './components/DocumentNumberingPanel';
import { EstimatingCatalogPanel } from './components/EstimatingCatalogPanel';
import { RolePermissionsPanel } from './components/RolePermissionsPanel';
import { TeamMembersPanel } from './components/TeamMembersPanel';

type SettingsTab = 'company' | 'team' | 'roles' | 'numbering' | 'catalog' | 'audit';

const settingsTabs = [
  { id: 'company', labelKey: 'companyProfile', icon: Building2 },
  { id: 'team', labelKey: 'team', icon: Users },
  { id: 'roles', labelKey: 'rolePermissions', icon: Shield },
  { id: 'numbering', labelKey: 'documentNumbering', icon: FileCode },
  { id: 'catalog', labelKey: 'estimatingCatalog', icon: Boxes },
  { id: 'audit', labelKey: 'auditTitle', icon: Activity },
] as const;

export function SettingsView() {
  const { members } = useApp();
  const messages = getMessages().settings;
  const [activeTab, setActiveTab] = useState<SettingsTab>('company');

  return (
    <main className="grid gap-6">
      <header>
        <h1 className="text-xl font-bold tracking-tight text-text sm:text-2xl">{messages.pageTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{messages.pageDescription}</p>
      </header>

      <nav aria-label={messages.settingsNavigation} className="flex gap-1 overflow-x-auto border-b border-border">
        {settingsTabs.map((tab) => {
          const Icon = tab.icon;
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              aria-current={selected ? 'page' : undefined}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-semibold transition-colors ${
                selected
                  ? 'border-primary-600 text-primary-700 dark:text-primary-300'
                  : 'border-transparent text-muted-foreground hover:text-text'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{tab.id === 'team' ? `${messages.team} (${members.length})` : messages[tab.labelKey]}</span>
            </button>
          );
        })}
      </nav>

      {activeTab === 'company' && <CompanyProfilePanel />}
      {activeTab === 'team' && <TeamMembersPanel />}
      {activeTab === 'roles' && <RolePermissionsPanel />}
      {activeTab === 'numbering' && <DocumentNumberingPanel />}
      {activeTab === 'catalog' && <EstimatingCatalogPanel />}
      {activeTab === 'audit' && <ActivityPanel />}
    </main>
  );
}
