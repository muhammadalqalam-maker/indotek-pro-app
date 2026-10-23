import { getMessages } from '../../../i18n';

const messages = getMessages().equipment;

export type EquipmentTab = 'assets' | 'usage' | 'maintenance';

export function EquipmentWorkspaceTabs({
  activeTab,
  onChange,
}: {
  activeTab: EquipmentTab;
  onChange: (tab: EquipmentTab) => void;
}) {
  const tabs: Array<[EquipmentTab, string]> = [
    ['assets', messages.assetsTab],
    ['usage', messages.usageTab],
    ['maintenance', messages.maintenanceTab],
  ];

  return (
    <div role="tablist" aria-label={messages.title} className="flex gap-2 overflow-x-auto border-b border-border">
      {tabs.map(([tab, label]) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={activeTab === tab}
          onClick={() => onChange(tab)}
          className={`min-h-11 shrink-0 border-b-2 px-3 text-sm font-semibold ${
            activeTab === tab
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-muted hover:text-text'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
