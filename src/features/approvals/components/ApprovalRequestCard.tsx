import { useMemo, useState } from 'react';
import { Check, Clock3, X } from 'lucide-react';
import { Badge, Button, Card, CardContent, Textarea } from '../../../components/ui';
import { SignaturePad } from '../../../components/shared/SignaturePad';
import { getMessages } from '../../../i18n';
import { ROLE_LABELS, type UserRole } from '../../../utils/permissions';
import { formatRupiah, formatTanggal } from '../../../utils/format';
import {
  delegateApprovalStep,
  processApprovalStep,
  uploadDailyReportApproverSignature,
} from '../services/approval.service';
import { approvalDecisionSchema } from '../schemas/approval.schema';
import { APPROVAL_STATUSES, APPROVAL_STEP_STATUSES, type ApprovalDecision, type ApprovalRequest } from '../types';
import type { OrganizationMember } from '../../../types/database';

const messages = getMessages().approvals;
const fieldMessages = getMessages().fieldReports;

function resourceLabel(type: string): string {
  if (type === 'boq_revision') return messages.typeBoq;
  if (type === 'project_addendum') return messages.typeAddendum;
  if (type === 'purchase_request') return messages.typePurchaseRequest;
  if (type === 'purchase_order') return messages.typePurchaseOrder;
  if (type === 'material_request') return messages.typeMaterialRequest;
  return messages.typeDailyReport;
}

function statusLabel(status: string): string {
  if (status === APPROVAL_STATUSES.approved) return messages.approved;
  if (status === APPROVAL_STATUSES.rejected) return messages.rejected;
  return messages.pending;
}

function statusVariant(status: string): 'success' | 'warning' | 'danger' {
  if (status === APPROVAL_STATUSES.approved) return 'success';
  if (status === APPROVAL_STATUSES.rejected) return 'danger';
  return 'warning';
}

function localDateTime(date: Date): string {
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function defaultExpiry(): string {
  return localDateTime(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
}

function minimumExpiry(): string {
  return localDateTime(new Date());
}

function maximumExpiry(): string {
  return localDateTime(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
}

export function ApprovalRequestCard({
  request,
  currentUserId,
  currentRole,
  members,
  hasApprovalPermission,
  onProcessed,
}: {
  request: ApprovalRequest;
  currentUserId: string;
  currentRole: UserRole | null;
  members: OrganizationMember[];
  hasApprovalPermission: boolean;
  onProcessed: () => Promise<void>;
}) {
  const [comment, setComment] = useState('');
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [selectedDelegate, setSelectedDelegate] = useState('');
  const [expiry, setExpiry] = useState(defaultExpiry);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDelegating, setIsDelegating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [feedback, setFeedback] = useState('');
  const currentStep = request.steps.find((step) => (
    step.step_number === request.current_step && step.status === APPROVAL_STEP_STATUSES.pending
  ));
  const isDelegated = Boolean(currentStep && request.delegations.some((delegation) => (
    delegation.approval_step_id === currentStep.id
    && delegation.delegate_user_id === currentUserId
    && new Date(delegation.expires_at).getTime() > Date.now()
  )));
  const isRoleApprover = Boolean(
    currentStep && currentRole && currentStep.approver_roles.includes(currentRole),
  );
  const canAct = Boolean(
    request.status === APPROVAL_STATUSES.pending
    && request.requester_id !== currentUserId
    && (isDelegated || (hasApprovalPermission && isRoleApprover)),
  );
  const canDelegate = Boolean(
    canAct && !isDelegated && isRoleApprover && currentStep,
  );
  const eligibleMembers = useMemo(() => members.filter((member) => (
    member.is_active
    && member.user_id !== currentUserId
    && member.user_id !== request.requester_id
  )), [currentUserId, members, request.requester_id]);

  const process = async (decision: ApprovalDecision) => {
    const parsed = approvalDecisionSchema.safeParse({ decision, comment });
    if (!parsed.success) {
      setErrorMessage(messages.commentRequired);
      return;
    }
    if (decision === APPROVAL_STATUSES.approved && request.resource_type === 'daily_report' && !signatureFile) {
      setErrorMessage(messages.signatureRequired);
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');
    setFeedback('');
    try {
      let signaturePath: string | null = null;
      if (decision === APPROVAL_STATUSES.approved && request.resource_type === 'daily_report' && signatureFile) {
        signaturePath = await uploadDailyReportApproverSignature(
          request.organization_id,
          request.project_id,
          request.resource_id,
          signatureFile,
        );
      }
      await processApprovalStep(request.id, parsed.data.decision, parsed.data.comment, signaturePath);
      setFeedback(decision === APPROVAL_STATUSES.approved ? messages.decisionApproved : messages.decisionRejected);
      setComment('');
      setSignatureFile(null);
      await onProcessed();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : messages.decisionFailed);
    } finally {
      setIsProcessing(false);
    }
  };

  const delegate = async () => {
    if (!currentStep || !selectedDelegate || !expiry) return;
    setIsDelegating(true);
    setErrorMessage('');
    setFeedback('');
    try {
      await delegateApprovalStep(currentStep.id, selectedDelegate, new Date(expiry).toISOString());
      setFeedback(messages.delegationSaved);
      setSelectedDelegate('');
      await onProcessed();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : messages.delegationFailed);
    } finally {
      setIsDelegating(false);
    }
  };

  return (
    <Card>
      <CardContent className="grid gap-4 p-4 sm:p-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info">{resourceLabel(request.resource_type)}</Badge>
              <Badge variant={statusVariant(request.status)}>{statusLabel(request.status)}</Badge>
              <span className="break-all font-mono text-xs text-muted-foreground">{request.reference_number}</span>
            </div>
            <h3 className="mt-2 break-words text-base font-semibold text-text">{request.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {messages.project}: {request.project_name} · {messages.requester}: {request.requester_name}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {messages.submittedAt}: {formatTanggal(request.created_at, { withTime: true })}
            </p>
          </div>
          <div className="shrink-0 sm:text-right">
            <p className="text-xs text-muted-foreground">{messages.amount}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-text">
              {request.amount > 0 ? formatRupiah(request.amount) : messages.noAmount}
            </p>
          </div>
        </header>

        {request.requester_comment && (
          <p className="rounded-md bg-surface-2 p-3 text-sm text-muted-foreground">
            <strong className="text-text">{messages.requesterComment}: </strong>
            {request.requester_comment}
          </p>
        )}

        <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {request.steps.map((step) => {
            const isCurrent = step.id === currentStep?.id;
            const actor = members.find((member) => member.user_id === step.acted_by)?.user?.full_name
              ?? step.acted_by;
            const roleNames = step.approver_roles.map((role) => ROLE_LABELS[role]).join(', ');
            const stepDelegations = request.delegations.filter((delegation) => (
              delegation.approval_step_id === step.id
            ));
            return (
              <li
                key={step.id}
                className={`grid gap-1 rounded-md border p-3 text-sm ${
                  isCurrent ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/15' : 'border-border bg-surface'
                }`}
              >
                <span className="flex items-center gap-2 font-semibold text-text">
                  {step.status === APPROVAL_STEP_STATUSES.approved
                    ? <Check className="h-4 w-4 text-success" aria-hidden="true" />
                    : step.status === APPROVAL_STEP_STATUSES.rejected
                      ? <X className="h-4 w-4 text-danger" aria-hidden="true" />
                      : <Clock3 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
                  {messages.step(step.step_number)}
                  {isCurrent && <span className="text-xs text-primary-700 dark:text-primary-500">{messages.currentStep}</span>}
                </span>
                <span className="text-xs text-muted-foreground">{roleNames}</span>
                {step.status === APPROVAL_STEP_STATUSES.waiting && (
                  <span className="text-xs text-muted-foreground">{messages.waitingStep}</span>
                )}
                {step.acted_by && (
                  <span className="text-xs text-muted-foreground">
                    {messages.approvedBy}: {actor}
                  </span>
                )}
                {step.comment && <p className="break-words text-xs text-text">{step.comment}</p>}
                {stepDelegations.map((delegation) => {
                  const delegate = members.find((member) => member.user_id === delegation.delegate_user_id);
                  return (
                    <span key={delegation.id} className="text-xs text-muted-foreground">
                      {messages.delegationActive(
                        delegate?.user?.full_name ?? delegation.delegate_user_id,
                        formatTanggal(delegation.expires_at, { withTime: true }),
                      )}
                    </span>
                  );
                })}
              </li>
            );
          })}
        </ol>

        {canAct && (
          <div className="grid gap-3 border-t border-border pt-4">
            <Textarea
              label={messages.decisionComment}
              hint={messages.decisionCommentHint}
              value={comment}
              onChange={(event) => setComment(event.currentTarget.value)}
              maxLength={2000}
              required
            />
            {request.resource_type === 'daily_report' && (
              <SignaturePad
                label={messages.signatureTitle}
                hint={messages.signatureHint}
                clearLabel={messages.signatureClear}
                savedLabel={messages.signatureSaved}
                typedNameLabel={messages.signatureTypedName}
                useTypedNameLabel={messages.signatureUseTypedName}
                processErrorLabel={messages.signatureProcessError}
                onSignatureChange={setSignatureFile}
              />
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="destructive"
                onClick={() => void process(APPROVAL_STATUSES.rejected)}
                disabled={isProcessing || !comment.trim()}
              >
                <X className="h-4 w-4" aria-hidden="true" />
                {isProcessing ? messages.processing : messages.reject}
              </Button>
              <Button
                type="button"
                onClick={() => void process(APPROVAL_STATUSES.approved)}
                disabled={isProcessing || !comment.trim() || (
                  request.resource_type === 'daily_report' && !signatureFile
                )}
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                {isProcessing ? messages.processing : messages.approve}
              </Button>
            </div>
          </div>
        )}

        {canDelegate && (
          <div className="grid gap-3 rounded-md border border-border bg-surface-2 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
            <label className="grid gap-1.5 text-sm font-medium text-text">
              {messages.delegateMember}
              <select
                value={selectedDelegate}
                onChange={(event) => setSelectedDelegate(event.currentTarget.value)}
                className="min-h-11 rounded-md border border-border-strong bg-surface px-3 text-text"
              >
                <option value="">{messages.chooseMember}</option>
                {eligibleMembers.map((member) => (
                  <option key={member.id} value={member.user_id}>
                    {member.user?.full_name ?? member.user_id} · {ROLE_LABELS[member.role]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-text">
              {messages.delegationExpiry}
              <input
                type="datetime-local"
                value={expiry}
                min={minimumExpiry()}
                max={maximumExpiry()}
                onChange={(event) => setExpiry(event.currentTarget.value)}
                className="min-h-11 rounded-md border border-border-strong bg-surface px-3 text-text"
              />
            </label>
            <Button
              type="button"
              variant="outline"
              onClick={() => void delegate()}
              disabled={isDelegating || !selectedDelegate || eligibleMembers.length === 0}
            >
              {isDelegating ? messages.delegating : messages.delegateAction}
            </Button>
          </div>
        )}

        {feedback && <p className="rounded-md bg-success-bg p-3 text-sm text-success" role="status">{feedback}</p>}
        {errorMessage && <p className="rounded-md bg-danger-bg p-3 text-sm text-danger" role="alert">{errorMessage}</p>}
      </CardContent>
    </Card>
  );
}
