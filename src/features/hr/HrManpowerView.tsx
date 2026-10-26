import { useEffect, useMemo, useState } from 'react';
import { Banknote, CalendarDays, Users } from 'lucide-react';
import { EmptyState, Skeleton } from '../../components/ui';
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

  if (!isSupabaseLive || !organizationId || !userId) {
    return (
      <p className="rounded-md border border-border bg-surface p-4 text-sm text-muted-foreground">
        {messages.liveRequired}
      </p>
    );
  }
  if (!canAccessWorkforce) {
    return (
      <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        {messages.accessDenied}
      </p>
    );
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6">
      <header className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">{messages.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{messages.description}</p>
        </div>
        <SyncIndicator isOnline={isOnline} onRetry={() => void retrySync()} />
      </header>

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

      <section className="grid gap-4 rounded-xl border border-border bg-surface p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-5">
        <label className="grid gap-2 text-sm font-medium text-text">
          {messages.project}
          <select
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className="min-h-11 rounded-md border border-border bg-surface px-3 text-base text-text"
          >
            <option value="">{messages.selectProject}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-text sm:min-w-56">
          {messages.date}
          <span className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="date"
              value={attendanceDate}
              onChange={(event) => setAttendanceDate(event.target.value)}
              className="min-h-11 w-full rounded-md border border-border bg-surface pl-10 pr-3 text-base text-text"
            />
          </span>
        </label>
      </section>

      {!projectId ? (
        <p className="rounded-lg border border-border bg-surface p-5 text-sm text-muted-foreground">
          {messages.projectRequired}
        </p>
      ) : (
        <>
          <nav className="flex flex-wrap gap-2 border-b border-border pb-3" aria-label={messages.title}>
            <button
              type="button"
              aria-pressed={activeTab === 'attendance'}
              onClick={() => setActiveTab('attendance')}
              className={`inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold ${
                activeTab === 'attendance' ? 'bg-primary-700 text-white' : 'text-muted-foreground hover:bg-surface-2 hover:text-text'
              }`}
            >
              <CalendarDays className="size-4" aria-hidden="true" />
              {messages.attendanceTab}
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-text">{recordedCount}</span>
            </button>
            <button
              type="button"
              aria-pressed={activeTab === 'workers'}
              onClick={() => setActiveTab('workers')}
              className={`inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold ${
                activeTab === 'workers' ? 'bg-primary-700 text-white' : 'text-muted-foreground hover:bg-surface-2 hover:text-text'
              }`}
            >
              <Users className="size-4" aria-hidden="true" />
              {messages.workersTab}
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-text">{workerCount}</span>
            </button>
            <button
              type="button"
              aria-pressed={activeTab === 'wages'}
              onClick={() => setActiveTab('wages')}
              className={`inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold ${
                activeTab === 'wages' ? 'bg-primary-700 text-white' : 'text-muted-foreground hover:bg-surface-2 hover:text-text'
              }`}
            >
              <Banknote className="size-4" aria-hidden="true" />
              {messages.wagesTab}
            </button>
          </nav>

          {(workersQuery.isPending || (activeTab === 'attendance' && attendanceQuery.isPending)) && (
            <div className="grid gap-3" aria-label={messages.loadingWorkers}>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}
          {(workersQuery.isError || (activeTab === 'attendance' && attendanceQuery.isError)) && (
            <section role="alert" className="grid gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <p>{workersQuery.error?.message === messages.staleOffline ? messages.staleOffline : messages.loadError}</p>
              <button
                type="button"
                onClick={() => {
                  void workersQuery.refetch();
                  void attendanceQuery.refetch();
                }}
                className="min-h-11 w-fit rounded-md border border-current px-3 font-semibold"
              >
                {messages.retry}
              </button>
            </section>
          )}
          {workersQuery.data && activeTab === 'attendance' && !attendanceQuery.isPending && !attendanceQuery.isError && (
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
          {workersQuery.data && activeTab === 'workers' && (
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
          {workersQuery.data && activeTab === 'wages' && (
            <WeeklyWagesPanel
              organizationId={organizationId}
              projectId={projectId}
              userId={userId}
              workers={workersQuery.data}
              isOnline={isOnline}
              canManagePiecework={canManageWorkers}
            />
          )}
        </>
      )}
    </main>
  );
}
