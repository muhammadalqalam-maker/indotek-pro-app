import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, ShieldCheck } from 'lucide-react';
import { Button, ConfirmDialog, Select, useToast } from '../../../components/ui';
import { useApp } from '../../../context/AppContext';
import { getMessages } from '../../../i18n';
import { useCan } from '../../../hooks/useCan';
import {
  INVITABLE_MEMBER_ROLES,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  type AppAction,
  type AppModule,
  type InvitableMemberRole,
} from '../../../utils/permissions';
import {
  clearRolePermissionOverrides,
  fetchOrganizationRolePermissions,
  saveRolePermissionOverride,
} from '../services/settings.service';
import type { RolePermissionOverride } from '../types';

const actions: AppAction[] = ['view', 'create', 'edit', 'delete', 'approve'];

export function RolePermissionsPanel() {
  const { currentOrg, isSupabaseLive, reloadPermissions } = useApp();
  const { toast } = useToast();
  const messages = getMessages().settings;
  const canEdit = useCan('settings', 'edit') && isSupabaseLive;
  const [role, setRole] = useState<InvitableMemberRole>('admin');
  const [overrides, setOverrides] = useState<RolePermissionOverride[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const loadPermissions = async () => {
    if (!currentOrg || !isSupabaseLive) {
      setOverrides([]);
      setLoadingError('');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadingError('');
    try {
      setOverrides(await fetchOrganizationRolePermissions(currentOrg.id));
    } catch (error: unknown) {
      setLoadingError(error instanceof Error ? error.message : messages.loadSettingsFailed);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPermissions();
  }, [currentOrg?.id, isSupabaseLive]);

  const overridesByKey = useMemo(() => new Map(
    overrides
      .filter((entry) => entry.role === role)
      .map((entry) => [`${entry.module}:${entry.action}`, entry.allowed]),
  ), [overrides, role]);

  const isAllowed = (module: AppModule, action: AppAction) => (
    overridesByKey.get(`${module}:${action}`)
      ?? ROLE_PERMISSIONS[role][module].includes(action)
  );

  const updatePermission = async (module: AppModule, action: AppAction) => {
    if (!currentOrg || !canEdit) return;
    const allowed = !isAllowed(module, action);
    const key = `${module}:${action}`;
    setSavingKey(key);
    try {
      await saveRolePermissionOverride(currentOrg.id, role, module, action, allowed);
      reloadPermissions();
      setOverrides((previous) => [
        ...previous.filter((entry) => !(entry.role === role && entry.module === module && entry.action === action)),
        { organization_id: currentOrg.id, role, module, action, allowed },
      ]);
      toast({ title: messages.permissionSaved, variant: 'success' });
    } catch (error: unknown) {
      toast({
        title: messages.permissionSaveFailed,
        description: error instanceof Error ? error.message : messages.unexpectedError,
        variant: 'error',
      });
    } finally {
      setSavingKey(null);
    }
  };

  const resetPermissions = async () => {
    if (!currentOrg || !canEdit) return;
    setIsResetting(true);
    try {
      await clearRolePermissionOverrides(currentOrg.id, role);
      reloadPermissions();
      setOverrides((previous) => previous.filter((entry) => entry.role !== role));
      setIsResetConfirmOpen(false);
      toast({ title: messages.permissionResetSuccess, variant: 'success' });
    } catch (error: unknown) {
      toast({
        title: messages.permissionResetFailed,
        description: error instanceof Error ? error.message : messages.unexpectedError,
        variant: 'error',
      });
    } finally {
      setIsResetting(false);
    }
  };

  if (!currentOrg) {
    return <p className="rounded-md border border-border bg-surface p-4 text-sm text-muted-foreground">{messages.organizationMissing}</p>;
  }

  const modules = Object.keys(ROLE_PERMISSIONS[role]) as AppModule[];
  const moduleNames = messages.moduleNames as Record<AppModule, string>;
  const actionNames: Record<AppAction, string> = {
    view: messages.view,
    create: messages.create,
    edit: messages.edit,
    delete: messages.delete,
    approve: messages.approve,
  };

  return (
    <section className="grid gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-text">
            <ShieldCheck className="h-5 w-5 text-primary-600" aria-hidden="true" />
            {messages.rolePermissions}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{messages.rolePermissionsHint}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={!canEdit || isLoading || isResetting}
          loading={isResetting}
          onClick={() => setIsResetConfirmOpen(true)}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {messages.permissionReset}
        </Button>
      </div>

      {!canEdit && <p className="rounded-md bg-surface-2 px-3 py-2 text-sm text-muted-foreground">{messages.permissionReadOnly}</p>}

      <div className="max-w-sm">
        <Select label={messages.role} value={role} onChange={(event) => setRole(event.target.value as InvitableMemberRole)}>
          {INVITABLE_MEMBER_ROLES.map((candidate) => (
            <option key={candidate} value={candidate}>{ROLE_LABELS[candidate]}</option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-3" role="status" aria-busy="true" aria-label={messages.loadingSettings}>
          <div className="h-12 animate-pulse rounded-md bg-surface-2" />
          <div className="h-12 animate-pulse rounded-md bg-surface-2" />
          <div className="h-12 animate-pulse rounded-md bg-surface-2" />
        </div>
      ) : loadingError ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger" role="alert">
          <span>{messages.loadSettingsFailed} {loadingError}</span>
          <Button variant="outline" size="sm" onClick={() => void loadPermissions()}>{messages.retry}</Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-3">{messages.module}</th>
                {actions.map((action) => (
                  <th scope="col" key={action} className="px-3 py-3 text-center">{actionNames[action]}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {modules.map((module) => (
                <tr key={module}>
                  <th scope="row" className="px-3 py-3 font-medium text-text">{moduleNames[module]}</th>
                  {actions.map((action) => {
                    const enabled = isAllowed(module, action);
                    return (
                      <td key={action} className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={enabled}
                          disabled={!canEdit || Boolean(savingKey)}
                          aria-label={`${moduleNames[module]} — ${actionNames[action]}`}
                          onChange={() => void updatePermission(module, action)}
                          className="h-5 w-5 accent-primary-700"
                        />
                        <span className="sr-only">{enabled ? actionNames[action] : `${actionNames[action]}: tidak diizinkan`}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog
        open={isResetConfirmOpen}
        onOpenChange={setIsResetConfirmOpen}
        title={messages.permissionResetConfirmTitle}
        description={messages.permissionResetConfirmDescription}
        confirmLabel={messages.permissionReset}
        cancelLabel={messages.cancel}
        destructive
        loading={isResetting}
        onConfirm={() => void resetPermissions()}
      />
    </section>
  );
}
