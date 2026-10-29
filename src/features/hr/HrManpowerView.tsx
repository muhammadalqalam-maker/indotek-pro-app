import { useEffect, useMemo, useState } from 'react';
import { Banknote, CalendarDays, Users } from 'lucide-react';
import {
  Card,
  CardContent,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  PageShell,
  Select,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { getMessages } from '../../i18n';
import { SyncIndicator } from '../field/components/SyncIndicator';
import { HR_WORKER_MANAGEMENT_ROLES, HR_WORKFORCE_ACCESS_ROLES } from '../../utils/permissions';
import type { AttendanceRecordInput, FieldWorkerFormValues } from './schemas/hr.schema';
import type { WorkerWageRateValues } from './schemas/wage.schema';
import { useHrManpower } from './hooks/useHrManpower';
import { WorkerAttendanceForm } from './WorkerAttendanceForm';
import { WorkerDirectory } from './WorkerDirectory';
import { WeeklyWagesPanel } from './components/WeeklyWagesPanel';

const messages = getMessages().hrManpower;

function getLocalDate(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
}

export function HrManpowerView() {
  const {
    authSession,
    currentMemberRole,
    currentOrg,
    isSupabaseLive,
    projects,
    selectedProjectId,
  } = useApp();
  const organizationId = currentOrg?.id ?? '';
  const userId = authSession?.user.id ?? '';
  const [projectId, setProjectId] = useState(
    selectedProjectId === 'all' ? '' : selectedProjectId,
  );
  const [attendanceDate, setAttendanceDate] = useState(getLocalDate);
  const [activeTab, setActiveTab] = useState<'attendance' | 'workers' | 'wages'>('attendance');
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const canManageWorkers = currentMemberRole !== null
    && HR_WORKER_MANAGEMENT_ROLES.includes(currentMemberRole);
  const canAccessWorkforce = currentMemberRole !== null
    && HR_WORKFORCE_ACCESS_ROLES.includes(currentMemberRole);
  const {
    actionError,
    actionMessage,
    attendanceQuery,
    createWorker,
    retrySync,
    saveAttendance,
    workersQuery,
    updateWorkerRates,
  } = useHrManpower(
    organizationId,
    userId,
    projectId,
    attendanceDate,
    isOnline,
    canAccessWorkforce,
  );

  useEffect(() => {
    setProjectId(selectedProjectId === 'all' ? '' : selectedProjectId);
  }, [selectedProjectId]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const workerCount = workersQuery.data?.length ?? 0;
  const recordedCount = attendanceQuery.data?.length ?? 0;
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === projectId),
    [projectId, projects],
  );
  const header = <PageHeader title={messages.title} description={messages.description} />;

  if (!isSupabaseLive || !organizationId || !userId) {
    return (
      <PageShell className="mx-auto max-w-6xl" header={header}>
        <p role="status" className="rounded-md border border-border bg-surface p-4 text-sm text-muted-foreground">
          {messages.liveRequired}
        </p>
      </PageShell>
    );
  }
  if (!canAccessWorkforce) {
    return (
      <PageShell className="mx-auto max-w-6xl" header={header}>
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {messages.accessDenied}
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell
      className="mx-auto max-w-6xl"
      header={(
        <PageHeader
          title={messages.title}
          description={messages.description}
          actions={<SyncIndicator isOnline={isOnline} onRetry={() => void retrySync()} />}
        />
      )}
    >

      {!isOnline && (
        <p role="status" className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning-foreground">
          {messages.offline}
        </p>
      )}
      {actionMessage && (
        <p role="status" aria-live="polite" className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success-foreground">
          {actionMessage}
        </p>
      )}
      {actionError && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {actionError}
        </p>
      )}

      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-5">
          <Select
            label={messages.project}
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
          >
            <option value="">{messages.selectProject}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </Select>
          <Input
            label={messages.date}
            type="date"
            value={attendanceDate}
            onChange={(event) => setAttendanceDate(event.currentTarget.value)}
            className="sm:min-w-56"
            prefix={<CalendarDays className="size-4" aria-hidden="true" />}
          />
        </CardContent>
      </Card>

      {!projectId ? (
        <EmptyState title={messages.projectRequired} icon={<Users className="size-5" aria-hidden="true" />} />
      ) : (
        <>
          <Tabs value={activeTab} onValueChange={(value) => {
            if (value === 'attendance' || value === 'workers' || value === 'wages') setActiveTab(value);
          }}>
            <TabsList aria-label={messages.title} className="w-full justify-start">
              <TabsTrigger value="attendance" className="min-h-11">
                <CalendarDays className="size-4" aria-hidden="true" />
                {messages.attendanceTab}
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-text">{recordedCount}</span>
              </TabsTrigger>
              <TabsTrigger value="workers" className="min-h-11">
                <Users className="size-4" aria-hidden="true" />
                {messages.workersTab}
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-text">{workerCount}</span>
              </TabsTrigger>
              <TabsTrigger value="wages" className="min-h-11">
                <Banknote className="size-4" aria-hidden="true" />
                {messages.wagesTab}
              </TabsTrigger>
            </TabsList>

            {(workersQuery.isPending || (activeTab === 'attendance' && attendanceQuery.isPending)) && (
              <div className="grid gap-3" aria-label={messages.loadingWorkers}>
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            )}
            {(workersQuery.isError || (activeTab === 'attendance' && attendanceQuery.isError)) && (
              <ErrorState
                title={workersQuery.error?.message === messages.staleOffline ? messages.staleOffline : messages.loadError}
                description={workersQuery.error?.message === messages.staleOffline ? messages.offline : messages.loadError}
                onRetry={() => {
                  void workersQuery.refetch();
                  void attendanceQuery.refetch();
                }}
                retryLabel={messages.retry}
              />
            )}
            <TabsContent value="attendance">
              {workersQuery.data && !attendanceQuery.isPending && !attendanceQuery.isError && (
                workersQuery.data.length === 0 ? (
                  <EmptyState title={messages.noWorkersTitle} description={messages.noWorkersDescription} />
                ) : (
                  <WorkerAttendanceForm
                    workers={workersQuery.data}
                    attendance={attendanceQuery.data ?? []}
                    recordedCount={recordedCount}
                    projectName={selectedProject?.name ?? ''}
                    attendanceDate={attendanceDate}
                    isSaving={saveAttendance.isPending}
                    onSubmit={async (records: AttendanceRecordInput[]) => {
                      await saveAttendance.mutateAsync(records);
                    }}
                  />
                )
              )}
            </TabsContent>
            <TabsContent value="workers">
              {workersQuery.data && (
                <WorkerDirectory
                  workers={workersQuery.data}
                  canManageWorkers={canManageWorkers}
                  isOnline={isOnline}
                  projectId={projectId}
                  isSaving={createWorker.isPending}
                  updatingWorkerId={updateWorkerRates.isPending ? updateWorkerRates.variables?.workerId ?? null : null}
                  onCreate={async (values: FieldWorkerFormValues) => {
                    await createWorker.mutateAsync(values);
                  }}
                  onUpdateRates={async (workerId: string, values: WorkerWageRateValues) => {
                    await updateWorkerRates.mutateAsync({ workerId, values });
                  }}
                />
              )}
            </TabsContent>
            <TabsContent value="wages">
              {workersQuery.data && (
                <WeeklyWagesPanel
                  organizationId={organizationId}
                  projectId={projectId}
                  userId={userId}
                  workers={workersQuery.data}
                  isOnline={isOnline}
                  canManagePiecework={canManageWorkers}
                />
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </PageShell>
  );
}
