import { useMemo, useState } from 'react';
import { FilePlus2, FileText } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
} from '../../../components/ui';
import { Can } from '../../../components/shared/Can';
import { getMessages } from '../../../i18n';
import { useApp } from '../../../context/AppContext';
import type { Project, ProjectAddendum } from '../../../types/database';
import { formatRupiah, formatTanggal } from '../../../utils/format';
import {
  calculateApprovedTimeExtensionDays,
  calculateEffectiveProjectContractValue,
} from '../../../utils/projectCalculations';
import { ProjectAddendumFormDialog } from './ProjectAddendumFormDialog';

const messages = getMessages('id').projects;
const noAddendums: ProjectAddendum[] = [];

function addendumStatusVariant(status: string): 'success' | 'warning' | 'danger' {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'danger';
  return 'warning';
}

export function ProjectAddendumsTab({ project }: { project: Project }) {
  const { members } = useApp();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const addendums = project.addendums ?? noAddendums;
  const effectiveContractValue = calculateEffectiveProjectContractValue(project);
  const approvedExtensionDays = calculateApprovedTimeExtensionDays(addendums);
  const sortedAddendums = useMemo(
    () => [...addendums].sort((a, b) => (
      Number(Boolean(a.approved_at)) - Number(Boolean(b.approved_at))
      || b.created_at.localeCompare(a.created_at)
    )),
    [addendums],
  );

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4 sm:p-5">
            <p className="text-sm text-muted-foreground">{messages.baseContractValue}</p>
            <p className="mt-1 break-words text-xl font-bold tabular-nums text-text">
              {formatRupiah(project.contract_value)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-5">
            <p className="text-sm text-muted-foreground">{messages.effectiveContractValue}</p>
            <p className="mt-1 break-words text-xl font-bold tabular-nums text-text">
              {formatRupiah(effectiveContractValue)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {messages.approvedAddendumTotal}: {formatRupiah(effectiveContractValue - project.contract_value)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{messages.addendumListTitle}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {messages.approvedTimeExtension}: {approvedExtensionDays} {messages.days}
            </p>
          </div>
          <Can module="projects" action="create">
            <Button onClick={() => setIsFormOpen(true)}>
              <FilePlus2 className="h-4 w-4" aria-hidden="true" />
              {messages.addendumCreateAction}
            </Button>
          </Can>
        </CardHeader>
        <CardContent>
          {sortedAddendums.length === 0 ? (
            <EmptyState
              title={messages.addendumEmptyTitle}
              description={messages.addendumEmptyDescription}
              icon={<FileText className="h-5 w-5" aria-hidden="true" />}
            />
          ) : (
            <ul className="space-y-3">
              {sortedAddendums.map((addendum) => {
                const approver = members.find((member) => member.user_id === addendum.approved_by);
                const approverName = approver?.user?.full_name
                  ?? addendum.approved_by_name
                  ?? messages.addendumApproverUnavailable;
                const status = addendum.approval_status
                  ?? (addendum.approved_at ? 'approved' : 'pending');
                const approved = status === 'approved';

                return (
                  <li key={addendum.id}>
                    <Card>
                      <CardContent className="flex min-w-0 flex-col gap-3 p-4 sm:p-5">
                        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="break-all font-mono text-xs font-semibold text-muted-foreground">
                                {addendum.addendum_number}
                              </p>
                              <Badge variant={addendumStatusVariant(status)}>
                                {status === 'approved'
                                  ? messages.addendumStatusApproved
                                  : status === 'rejected'
                                    ? messages.addendumStatusRejected
                                    : messages.addendumStatusPending}
                              </Badge>
                            </div>
                            <h3 className="mt-1 break-words text-base font-semibold text-text">
                              {addendum.title}
                            </h3>
                          </div>
                        </div>

                        {addendum.description && (
                          <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                            {addendum.description}
                          </p>
                        )}

                        <dl className="grid gap-3 rounded-md bg-surface-2 p-3 sm:grid-cols-3">
                          <div className="min-w-0">
                            <dt className="text-xs text-muted-foreground">{messages.addendumAmount}</dt>
                            <dd className="mt-1 break-words text-sm font-semibold tabular-nums text-text">
                              {formatRupiah(addendum.amount)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">{messages.addendumTimeExtension}</dt>
                            <dd className="mt-1 text-sm font-semibold tabular-nums text-text">
                              {addendum.time_extension_days} {messages.days}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">
                              {approved ? messages.addendumApprovedOn : messages.addendumCreatedOn}
                            </dt>
                            <dd className="mt-1 break-words text-sm font-medium text-text">
                              {formatTanggal(approved ? addendum.approved_at : addendum.created_at, { withTime: true })}
                            </dd>
                          </div>
                        </dl>

                        {approved && (
                          <p className="text-xs text-muted-foreground">
                            {messages.addendumApprovedBy}: {approverName}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <ProjectAddendumFormDialog
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        projectId={project.id}
        projectCode={project.code}
        addendums={addendums}
      />

    </section>
  );
}
