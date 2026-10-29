import React, { useState } from 'react';
import { Building2, CheckCircle2, Mail, RefreshCw } from 'lucide-react';
import { Button, Skeleton } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { formatDateIndo } from '../../utils/format';
import { ROLE_LABELS } from '../../utils/permissions';
import { memberMessages } from '../../i18n/id';

export const OrganizationInvitationInbox: React.FC<{
  standalone?: boolean;
  onContinueWithoutInvitations?: () => void;
}> = ({ standalone = false, onContinueWithoutInvitations }) => {
  const {
    pendingInvitations,
    pendingInvitationsLoading,
    pendingInvitationsError,
    reloadPendingInvitations,
    handleAcceptInvitation,
  } = useApp();
  const [acceptingInvitationId, setAcceptingInvitationId] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState('');

  if (!standalone && !pendingInvitationsLoading && !pendingInvitationsError && pendingInvitations.length === 0) {
    return null;
  }

  const containerClass = standalone
    ? 'mx-auto w-full max-w-2xl rounded-lg border border-border bg-surface p-5 shadow-xs sm:p-7'
    : 'mx-3 mt-3 rounded-lg border border-border bg-surface p-4 shadow-xs sm:mx-6 lg:mx-8';

  const accept = async (invitationId: string) => {
    setAcceptingInvitationId(invitationId);
    setAcceptError('');
    try {
      await handleAcceptInvitation(invitationId);
    } catch (error: unknown) {
      setAcceptError(error instanceof Error ? error.message : memberMessages.invitationAcceptError);
    } finally {
      setAcceptingInvitationId(null);
    }
  };

  return (
    <section className={containerClass} aria-labelledby="invitation-inbox-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="invitation-inbox-title" className="flex items-center gap-2 text-base font-bold text-text">
            <Mail className="h-5 w-5 text-primary" aria-hidden="true" />
            {memberMessages.invitationTitle}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {memberMessages.invitationDescription}
          </p>
        </div>
        {pendingInvitationsError && (
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => void reloadPendingInvitations()}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {memberMessages.invitationRetry}
          </Button>
        )}
      </div>

      {pendingInvitationsLoading && (
        <div className="mt-4 space-y-3" role="status" aria-busy="true" aria-label={memberMessages.invitationLoading}>
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {pendingInvitationsError && (
        <p className="mt-4 rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger" role="alert">
          {memberMessages.invitationLoadError} {pendingInvitationsError}
        </p>
      )}

      {acceptError && (
        <p className="mt-4 rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger" role="alert">
          {acceptError}
        </p>
      )}

      {!pendingInvitationsLoading && pendingInvitations.length > 0 && (
        <ul className="mt-4 space-y-3">
          {pendingInvitations.map((invitation) => (
            <li
              key={invitation.id}
              className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-semibold text-text">
                  <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="truncate">{invitation.organization_name}</span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {invitation.full_name} · {ROLE_LABELS[invitation.role]}
                  {invitation.department ? ` · ${invitation.department}` : ''}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {memberMessages.invitationExpires} {formatDateIndo(invitation.expires_at)}
                </p>
              </div>
              <Button
                type="button"
                onClick={() => void accept(invitation.id)}
                disabled={acceptingInvitationId !== null}
                loading={acceptingInvitationId === invitation.id}
                className="shrink-0 gap-2"
              >
                {acceptingInvitationId === invitation.id
                  ? memberMessages.invitationAccepting
                  : <><CheckCircle2 className="h-4 w-4" aria-hidden="true" />{memberMessages.invitationAccept}</>}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {standalone && !pendingInvitationsLoading && pendingInvitations.length === 0 && !pendingInvitationsError && (
        <p className="mt-4 text-sm text-muted-foreground">
          {memberMessages.noInvitations}
        </p>
      )}

      {standalone && onContinueWithoutInvitations && (
        <div className="mt-5 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onContinueWithoutInvitations}
          >
            {memberMessages.createOwnOrganization}
          </Button>
        </div>
      )}
    </section>
  );
};
