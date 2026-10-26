import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Check, Clock3 } from 'lucide-react';
import { getMessages } from '../../i18n';
import type { DailyAttendance, FieldWorker } from '../../types/database';
import {
  ATTENDANCE_STATUSES,
  attendanceBatchSchema,
  type AttendanceRecordInput,
} from './schemas/hr.schema';

const messages = getMessages().hrManpower;

type AttendanceFormState = {
  records: Array<{
    worker_id: string;
    status: '' | DailyAttendance['status'];
    work_hours: number;
    overtime_hours: number;
  }>;
};

type WorkerAttendanceFormProps = {
  workers: FieldWorker[];
  attendance: DailyAttendance[];
  recordedCount: number;
  projectName: string;
  attendanceDate: string;
  isSaving: boolean;
  onSubmit: (records: AttendanceRecordInput[]) => Promise<void>;
};

export function WorkerAttendanceForm({
  workers,
  attendance,
  recordedCount,
  projectName,
  attendanceDate,
  isSaving,
  onSubmit,
}: WorkerAttendanceFormProps) {
  const [formError, setFormError] = useState('');
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const { handleSubmit, register, reset, setValue, watch, formState: { isDirty } } = useForm<AttendanceFormState>({
    defaultValues: { records: [] },
  });

  useEffect(() => {
    if (isDirty) return;
    const savedByWorker = new Map(attendance.map((record) => [record.worker_id, record]));
    reset({
      records: workers.map((worker) => {
        const saved = savedByWorker.get(worker.id);
        return {
          worker_id: worker.id,
          status: saved?.status ?? '',
          work_hours: saved?.work_hours ?? 0,
          overtime_hours: saved?.overtime_hours ?? 0,
        };
      }),
    });
  }, [attendance, isDirty, reset, workers]);

  useEffect(() => {
    if (formError) errorSummaryRef.current?.focus();
  }, [formError]);

  const records = watch('records');
  const submit = handleSubmit(async (values) => {
    setFormError('');
    const selectedRecords = values.records.filter((record) => record.status !== '');
    const result = attendanceBatchSchema.safeParse({
      attendance_date: attendanceDate,
      records: selectedRecords,
    });
    if (!result.success) {
      setFormError(selectedRecords.length === 0
        ? messages.noAttendanceSelected
        : messages.attendanceFormError);
      return;
    }
    try {
      await onSubmit(result.data.records);
      reset(values);
    } catch {
      setFormError(messages.attendanceSaveError);
    }
  });

  return (
    <form onSubmit={(event) => void submit(event)} className="grid gap-4">
      <header className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-text">{projectName}</h2>
          <p className="text-sm text-muted-foreground">{messages.attendanceCount(recordedCount, workers.length)}</p>
        </div>
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Clock3 className="size-4" aria-hidden="true" />
          {attendanceDate}
        </span>
      </header>
      {recordedCount === 0 && (
        <p className="rounded-lg border border-border bg-surface p-3 text-sm text-muted-foreground">{messages.noAttendance}</p>
      )}

      {workers.map((worker, index) => {
        const statusField = register(`records.${index}.status`);
        const status = records?.[index]?.status ?? '';
        return (
          <article key={worker.id} className="grid gap-4 rounded-xl border border-border bg-surface p-4 sm:grid-cols-[minmax(0,1.1fr)_minmax(13rem,1fr)_minmax(10rem,0.7fr)_minmax(10rem,0.7fr)] sm:items-end">
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-text">{worker.full_name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {messages.trades[worker.role_trade]} · {worker.nik}
              </p>
            </div>

            <label className="grid gap-1.5 text-sm font-medium text-text">
              {messages.attendanceStatus}
              <select
                {...statusField}
                value={status}
                disabled={isSaving}
                onChange={(event) => {
                  void statusField.onChange(event);
                  const selectedStatus = event.target.value;
                  if (selectedStatus !== 'hadir' && selectedStatus !== 'lembur') {
                    setValue(`records.${index}.work_hours`, 0);
                    setValue(`records.${index}.overtime_hours`, 0);
                  } else if ((records?.[index]?.work_hours ?? 0) === 0) {
                    setValue(`records.${index}.work_hours`, 8);
                  }
                }}
                className="min-h-11 rounded-md border border-border bg-surface px-3 text-base text-text"
              >
                <option value="">{messages.selectStatus}</option>
                {ATTENDANCE_STATUSES.map((value) => (
                  <option key={value} value={value}>{messages.statuses[value]}</option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5 text-sm font-medium text-text">
              {messages.workHours}
              <input
                type="number"
                min="0"
                max="24"
                step="0.5"
                disabled={isSaving || (status !== 'hadir' && status !== 'lembur')}
                {...register(`records.${index}.work_hours`, { valueAsNumber: true })}
                className="min-h-11 rounded-md border border-border bg-surface px-3 text-base text-text disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted-foreground"
              />
            </label>

            <label className="grid gap-1.5 text-sm font-medium text-text">
              {messages.overtimeHours}
              <input
                type="number"
                min="0"
                max="24"
                step="0.5"
                disabled={isSaving || (status !== 'hadir' && status !== 'lembur')}
                {...register(`records.${index}.overtime_hours`, { valueAsNumber: true })}
                className="min-h-11 rounded-md border border-border bg-surface px-3 text-base text-text disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted-foreground"
              />
            </label>
          </article>
        );
      })}

      {formError && (
        <div ref={errorSummaryRef} role="alert" tabIndex={-1} className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {formError}
        </div>
      )}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary-700 px-5 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Check className="size-4" aria-hidden="true" />
          {isSaving ? messages.savingAttendance : messages.saveAttendance}
        </button>
      </div>
    </form>
  );
}
