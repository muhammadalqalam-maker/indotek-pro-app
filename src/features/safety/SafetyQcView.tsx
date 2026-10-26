import { useState } from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getMessages } from '../../i18n';
import { QualityWorkspace } from './components/QualityWorkspace';
import { SafetyWorkspace } from './components/SafetyWorkspace';

const messages = getMessages().safety;
type SafetyQcTab = 'safety' | 'quality';

export const SafetyQcView: React.FC = () => {
  const { can } = useApp();
  const [activeTab, setActiveTab] = useState<SafetyQcTab>('safety');

  if (!can('safety', 'view')) {
    return (
      <section role="alert" className="rounded-xl border border-border bg-surface p-5 text-sm text-muted-foreground">
        {messages.permissionDenied}
      </section>
    );
  }

  return (
    <section className="grid gap-5">
      <header>
        <h1 className="text-2xl font-bold text-text">{messages.title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{messages.description}</p>
      </header>

      <div role="tablist" aria-label={messages.title} className="flex gap-2 overflow-x-auto border-b border-border">
        <button
          id="safety-qc-tab-safety"
          type="button"
          role="tab"
          aria-selected={activeTab === 'safety'}
          aria-controls="safety-qc-panel-safety"
          onClick={() => setActiveTab('safety')}
          className={`inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold ${
            activeTab === 'safety' ? 'border-primary-500 text-primary-700 dark:text-primary-500' : 'border-transparent text-muted-foreground hover:text-text'
          }`}
        >
          <ShieldCheck className="size-4" aria-hidden="true" />
          {messages.k3Tab}
        </button>
        <button
          id="safety-qc-tab-quality"
          type="button"
          role="tab"
          aria-selected={activeTab === 'quality'}
          aria-controls="safety-qc-panel-quality"
          onClick={() => setActiveTab('quality')}
          className={`inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold ${
            activeTab === 'quality' ? 'border-primary-500 text-primary-700 dark:text-primary-500' : 'border-transparent text-muted-foreground hover:text-text'
          }`}
        >
          <CheckCircle2 className="size-4" aria-hidden="true" />
          {messages.qualityTab}
        </button>
      </div>

      {activeTab === 'safety' ? (
        <div id="safety-qc-panel-safety" role="tabpanel" aria-labelledby="safety-qc-tab-safety">
          <SafetyWorkspace />
        </div>
      ) : (
        <div id="safety-qc-panel-quality" role="tabpanel" aria-labelledby="safety-qc-tab-quality">
          <QualityWorkspace />
        </div>
      )}
    </section>
  );
};
