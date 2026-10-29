import { useState } from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { PageHeader, PageShell, Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { getMessages } from '../../i18n';
import { QualityWorkspace } from './components/QualityWorkspace';
import { SafetyWorkspace } from './components/SafetyWorkspace';

const messages = getMessages().safety;
type SafetyQcTab = 'safety' | 'quality';

export const SafetyQcView: React.FC = () => {
  const { can } = useApp();
  const [activeTab, setActiveTab] = useState<SafetyQcTab>('safety');
  const header = <PageHeader title={messages.title} description={messages.description} />;

  if (!can('safety', 'view')) {
    return (
      <PageShell className="mx-auto max-w-6xl" header={header}>
        <section role="alert" className="rounded-xl border border-border bg-surface p-5 text-sm text-muted-foreground">
          {messages.permissionDenied}
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell className="mx-auto max-w-6xl" header={header}>
      <Tabs value={activeTab} onValueChange={(value) => {
        if (value === 'safety' || value === 'quality') setActiveTab(value);
      }}>
        <TabsList aria-label={messages.title} className="w-full justify-start">
          <TabsTrigger value="safety" className="min-h-11">
            <ShieldCheck className="size-4" aria-hidden="true" />
            {messages.k3Tab}
          </TabsTrigger>
          <TabsTrigger value="quality" className="min-h-11">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {messages.qualityTab}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="safety">
          <SafetyWorkspace />
        </TabsContent>
        <TabsContent value="quality">
          <QualityWorkspace />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
};
