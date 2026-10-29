import { Activity, Boxes, Building2, FileCode, Shield, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getMessages } from '../../i18n';
import { PageHeader, PageShell, Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui';
import { ActivityPanel } from './components/ActivityPanel';
import { CompanyProfilePanel } from './components/CompanyProfilePanel';
import { DocumentNumberingPanel } from './components/DocumentNumberingPanel';
import { EstimatingCatalogPanel } from './components/EstimatingCatalogPanel';
import { RolePermissionsPanel } from './components/RolePermissionsPanel';
import { TeamMembersPanel } from './components/TeamMembersPanel';

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

  return (
    <PageShell header={<PageHeader title={messages.pageTitle} description={messages.pageDescription} />}>
      <Tabs defaultValue="company">
        <TabsList aria-label={messages.settingsNavigation} className="w-full max-w-full justify-start sm:w-fit">
          {settingsTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.id} value={tab.id}>
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{tab.id === 'team' ? `${messages.team} (${members.length})` : messages[tab.labelKey]}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
        <TabsContent value="company"><CompanyProfilePanel /></TabsContent>
        <TabsContent value="team"><TeamMembersPanel /></TabsContent>
        <TabsContent value="roles"><RolePermissionsPanel /></TabsContent>
        <TabsContent value="numbering"><DocumentNumberingPanel /></TabsContent>
        <TabsContent value="catalog"><EstimatingCatalogPanel /></TabsContent>
        <TabsContent value="audit"><ActivityPanel /></TabsContent>
      </Tabs>
    </PageShell>
  );
}
