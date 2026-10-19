import { useMemo } from 'react';
import { UserRound } from 'lucide-react';
import { Card, CardContent, EmptyState, ErrorState, Skeleton, Badge } from '../../../components/ui';
import { getMessages } from '../../../i18n';
import { useApp } from '../../../context/AppContext';

const messages = getMessages('id').projects;

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('id-ID') ?? '')
    .join('');
}

export function ProjectTeamTab({
  projectManagerId,
  siteManagerId,
}: {
  projectManagerId?: string | null;
  siteManagerId?: string | null;
}) {
  const { members, membersLoading, membersError, reloadMembers } = useApp();
  const detail = messages.detail;
  const memberByUserId = useMemo(
    () => new Map(members.map((member) => [member.user_id, member])),
    [members],
  );
  const assignments = [
    {
      id: 'project-manager',
      title: messages.projectManager,
      description: detail.projectManagerDescription,
      userId: projectManagerId,
    },
    {
      id: 'site-manager',
      title: messages.siteManager,
      description: detail.siteManagerDescription,
      userId: siteManagerId,
    },
  ] as const;

  if (membersLoading) {
    return (
      <section className="grid gap-3 sm:grid-cols-2" aria-busy="true" aria-label={messages.projectTeam}>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </section>
    );
  }

  if (membersError) {
    return (
      <ErrorState
        title={messages.membersLoadFailed}
        description={membersError}
        retryLabel={messages.retryMembers}
        onRetry={() => void reloadMembers()}
      />
    );
  }

  if (!projectManagerId && !siteManagerId) {
    return (
      <EmptyState
        title={messages.projectTeam}
        description={detail.noAssignedMember}
        icon={<UserRound className="h-5 w-5" aria-hidden="true" />}
      />
    );
  }

  return (
    <section className="space-y-4">
      <p className="text-sm text-muted">{detail.teamDescription}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {assignments.map(({ id, title, description, userId }) => {
          if (!userId) return null;
          const member = memberByUserId.get(userId);
          const name = member?.user?.full_name ?? detail.memberRoleUnavailable;
          const memberDescription = member?.job_title || member?.department || description;

          return (
            <Card key={id}>
              <CardContent className="flex min-w-0 items-start gap-3 p-4 sm:p-5">
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-50 text-sm font-semibold text-primary-700 dark:bg-primary-500/15 dark:text-primary-300"
                  aria-hidden="true"
                >
                  {member?.user?.full_name ? initials(member.user.full_name) : <UserRound className="h-5 w-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted">{title}</p>
                  <h3 className="mt-0.5 break-words text-sm font-semibold text-text">{name}</h3>
                  <p className="mt-1 break-words text-sm text-muted">{memberDescription}</p>
                  {member && !member.is_active && (
                    <Badge variant="warning" className="mt-2">
                      {detail.memberInactive}
                    </Badge>
                  )}
                  {!member && (
                    <Badge variant="warning" className="mt-2">
                      {detail.memberRoleUnavailable}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
