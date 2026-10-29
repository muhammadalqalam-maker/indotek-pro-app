import { getMessages } from '../../../i18n';
import { TabsList, TabsTrigger } from '../../../components/ui';

const messages = getMessages().equipment;

export type EquipmentTab = 'assets' | 'usage' | 'maintenance';

export function EquipmentWorkspaceTabs() {
  const tabs: Array<[EquipmentTab, string]> = [
    ['assets', messages.assetsTab],
    ['usage', messages.usageTab],
    ['maintenance', messages.maintenanceTab],
  ];

  return (
    <TabsList aria-label={messages.title} className="w-full justify-start">
      {tabs.map(([tab, label]) => (
        <TabsTrigger
          key={tab}
          value={tab}
        >
          {label}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
