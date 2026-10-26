import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Users } from 'lucide-react';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Select } from '../../../components/ui';
import { Can } from '../../../components/shared/Can';
import { useApp } from '../../../context/AppContext';
import { useCan } from '../../../hooks/useCan';
import { getMessages } from '../../../i18n';
import { memberMessages } from '../../../i18n/id';
import { INVITABLE_MEMBER_ROLES, ROLE_LABELS, type InvitableMemberRole, type UserRole } from '../../../utils/permissions';
import { memberInvitationSchema, type MemberInvitationInput } from '../schemas/member.schema';

type InvitationForm = Omit<MemberInvitationInput, 'organization_id'>;

export function TeamMembersPanel() {
  const {
    currentOrg,
    members,
    membersLoading,
    membersError,
    reloadMembers,
    authSession,
    currentRole,
    handleInviteMember,
    handleUpdateRole,
    handleToggleMember,
  } = useApp();
  const messages = getMessages().settings;
  const canManageMembers = useCan('users', 'edit');
  const canInviteMembers = useCan('users', 'create');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteNotice, setInviteNotice] = useState('');
  const [memberActionError, setMemberActionError] = useState('');
  const [memberActionId, setMemberActionId] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<InvitationForm>({
    mode: 'onSubmit',
    defaultValues: { full_name: '', email: '', role: 'site_manager', department: 'Lapangan' },
  });

  const submitInvite = handleSubmit(async (values) => {
    setInviteError('');
    setInviteNotice('');
    const parsed = memberInvitationSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === 'full_name' || field === 'email' || field === 'role' || field === 'department') {
          setError(field, { type: 'manual', message: issue.message });
        }
      }
      return;
    }
    if (!currentOrg) {
      setInviteError(messages.organizationMissing);
      return;
    }
    try {
      const result = await handleInviteMember({ ...parsed.data, organization_id: currentOrg.id });
      setInviteNotice(result.message);
      setIsInviteOpen(false);
      reset();
    } catch (error: unknown) {
      setInviteError(error instanceof Error ? error.message : memberMessages.inviteSendError);
    }
  });

  const updateMemberRole = async (memberId: string, role: InvitableMemberRole) => {
    setMemberActionId(memberId);
    setMemberActionError('');
    try {
      await handleUpdateRole(memberId, role);
    } catch (error: unknown) {
      setMemberActionError(error instanceof Error ? error.message : memberMessages.memberActionError);
    } finally {
      setMemberActionId(null);
    }
  };

  const updateMemberStatus = async (memberId: string, isActive: boolean) => {
    setMemberActionId(memberId);
    setMemberActionError('');
    try {
      await handleToggleMember(memberId, isActive);
    } catch (error: unknown) {
      setMemberActionError(error instanceof Error ? error.message : memberMessages.memberActionError);
    } finally {
      setMemberActionId(null);
    }
  };

  const managerRole: UserRole = currentRole;

  if (!currentOrg) {
    return <p className="rounded-md border border-border bg-surface p-4 text-sm text-muted-foreground">{messages.organizationMissing}</p>;
  }

  return (
    <section className="grid gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-text">
            <Users className="h-5 w-5 text-primary-600" aria-hidden="true" />
            {messages.team}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{messages.teamDescription} {currentOrg.name}</p>
        </div>
        <Can module="users" action="create">
          <Button variant="accent" onClick={() => { setInviteError(''); setIsInviteOpen(true); }}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {memberMessages.inviteTitle}
          </Button>
        </Can>
      </header>

      {!canManageMembers && !canInviteMembers && (
        <p className="rounded-md border border-border bg-surface p-3 text-sm text-muted-foreground">{memberMessages.managerOnly}</p>
      )}
      {inviteNotice && <p className="rounded-md border border-success/30 bg-success/5 p-3 text-sm text-text" role="status">{inviteNotice}</p>}
      {memberActionError && <p className="rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger" role="alert">{memberActionError}</p>}

      {membersError && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger" role="alert">
          <span>{memberMessages.memberLoadError} {membersError}</span>
          <Button variant="outline" size="sm" onClick={() => void reloadMembers()}>{memberMessages.invitationRetry}</Button>
        </div>
      )}

      {membersLoading ? (
        <div className="grid gap-3" role="status" aria-busy="true" aria-label={memberMessages.loadingMembers}>
          <div className="h-24 animate-pulse rounded-xl bg-surface-2" />
          <div className="h-24 animate-pulse rounded-xl bg-surface-2" />
        </div>
      ) : members.length === 0 && !membersError ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="mt-2 font-semibold text-text">{memberMessages.memberEmptyTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">{memberMessages.memberEmptyHelp}</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {members.map((member) => {
            const canEditMember = canManageMembers
              && member.role !== 'owner'
              && member.user_id !== authSession?.user.id
              && !(managerRole === 'admin' && member.role === 'admin');
            return (
              <li key={member.id} className="grid gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_minmax(12rem,auto)] sm:items-center">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-text">{member.user?.full_name || 'Anggota'}</p>
                  <p className="break-all text-sm text-muted-foreground">{member.user?.email}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{member.department || 'Operasional'}</p>
                </div>
                <div className="grid gap-2 sm:min-w-52">
                  {canEditMember ? (
                    <Select
                      aria-label={`${memberMessages.memberRoleAria}: ${member.user?.full_name || 'anggota'}`}
                      value={member.role}
                      disabled={memberActionId === member.id}
                      onChange={(event) => {
                        const role = INVITABLE_MEMBER_ROLES.find((candidate) => candidate === event.target.value);
                        if (role) void updateMemberRole(member.id, role);
                      }}
                    >
                      {INVITABLE_MEMBER_ROLES
                        .filter((role) => managerRole === 'owner' || role !== 'admin')
                        .map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
                    </Select>
                  ) : (
                    <span className="text-sm font-semibold text-text">{ROLE_LABELS[member.role]}</span>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${member.is_active ? 'bg-success/10 text-success' : 'bg-surface-2 text-muted-foreground'}`}>
                      {member.is_active ? messages.memberActive : messages.memberInactive}
                    </span>
                    {canEditMember && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={memberActionId === member.id}
                        onClick={() => void updateMemberStatus(member.id, !member.is_active)}
                      >
                        {member.is_active ? messages.memberDeactivate : messages.memberActivate}
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={isInviteOpen} onOpenChange={(open) => { if (!isSubmitting) setIsInviteOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{memberMessages.inviteTitle} ke {currentOrg.name}</DialogTitle>
            <DialogDescription>{memberMessages.invitationDescription}</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitInvite} className="grid gap-4">
            {inviteError && <p className="rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger" role="alert">{inviteError}</p>}
            <Input
              label={memberMessages.inviteFullName}
              autoComplete="name"
              error={errors.full_name?.message}
              {...register('full_name')}
            />
            <Input
              label={memberMessages.inviteEmail}
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <Select label={memberMessages.inviteRole} error={errors.role?.message} {...register('role')}>
              {INVITABLE_MEMBER_ROLES
                .filter((role) => managerRole === 'owner' || role !== 'admin')
                .map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
            </Select>
            <Input
              label={memberMessages.inviteDepartment}
              error={errors.department?.message}
              {...register('department')}
            />
            <DialogFooter>
              <Button variant="outline" disabled={isSubmitting} onClick={() => setIsInviteOpen(false)}>{memberMessages.inviteCancel}</Button>
              <Button type="submit" variant="accent" loading={isSubmitting}>{memberMessages.inviteSend}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
