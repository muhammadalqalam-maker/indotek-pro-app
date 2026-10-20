import { useFieldArray, type UseFormReturn } from 'react-hook-form';
import type { ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { FileUploader } from '../../../components/ui/FileUploader';
import { Input } from '../../../components/ui/Input';
import { SignaturePad } from './SignaturePad';
import { getMessages } from '../../../i18n';
import type { DailyReportFormValues } from '../schemas/dailyReport.schema';

const messages = getMessages().fieldReports;

type DailyReportFormFieldsProps = {
  form: UseFormReturn<DailyReportFormValues>;
  editable: boolean;
  showApproverSignature: boolean;
  pendingPhotos: File[];
  setPendingPhotos: (files: File[]) => void;
  photoPreviewUrls: Record<string, string>;
  onRemovePhoto: (path: string) => void;
  siteSignatureUrl: string | null;
  approverSignatureUrl: string | null;
  onSiteSignatureChange: (file: File | null) => void;
  onApproverSignatureChange: (file: File | null) => void;
};

function Section({
  title,
  addLabel,
  onAdd,
  disabled,
  children,
}: {
  title: string;
  addLabel: string;
  onAdd: () => void;
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-lg border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-text">{title}</h2>
        {!disabled && (
          <Button variant="outline" size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {addLabel}
          </Button>
        )}
      </div>
      {children}
    </section>
  );
}

export function DailyReportFormFields({
  form,
  editable,
  showApproverSignature,
  pendingPhotos,
  setPendingPhotos,
  photoPreviewUrls,
  onRemovePhoto,
  siteSignatureUrl,
  approverSignatureUrl,
  onSiteSignatureChange,
  onApproverSignatureChange,
}: DailyReportFormFieldsProps) {
  const manpower = useFieldArray({ control: form.control, name: 'manpower' });
  const equipment = useFieldArray({ control: form.control, name: 'equipment' });
  const materials = useFieldArray({ control: form.control, name: 'materials' });
  const photos = form.watch('photo_paths');
  const errors = form.formState.errors;

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2 sm:p-5">
        <Input
          label={messages.reportDate}
          type="date"
          disabled={!editable}
          error={errors.report_date?.message}
          {...form.register('report_date')}
        />
        <Input
          label={messages.siteManager}
          disabled={!editable}
          error={errors.site_manager_name?.message}
          {...form.register('site_manager_name')}
        />
        <Input
          label={messages.weather}
          hint={messages.weatherHint}
          disabled={!editable}
          error={errors.weather_conditions?.message}
          {...form.register('weather_conditions')}
        />
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="daily-report-work">
            {messages.workSummary}
          </label>
          <textarea
            id="daily-report-work"
            disabled={!editable}
            aria-invalid={Boolean(errors.work_summary)}
            className="min-h-28 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-base text-text outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-60"
            {...form.register('work_summary')}
          />
          {errors.work_summary?.message && <p className="mt-1 text-xs text-danger" role="alert">{errors.work_summary.message}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="daily-report-obstacles">
            {messages.obstacles}
          </label>
          <textarea
            id="daily-report-obstacles"
            disabled={!editable}
            aria-invalid={Boolean(errors.obstacles)}
            className="min-h-24 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-base text-text outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-60"
            {...form.register('obstacles')}
          />
          {errors.obstacles?.message && <p className="mt-1 text-xs text-danger" role="alert">{errors.obstacles.message}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="daily-report-solutions">
            {messages.solutions}
          </label>
          <textarea
            id="daily-report-solutions"
            disabled={!editable}
            aria-invalid={Boolean(errors.solutions)}
            className="min-h-24 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-base text-text outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-60"
            {...form.register('solutions')}
          />
          {errors.solutions?.message && <p className="mt-1 text-xs text-danger" role="alert">{errors.solutions.message}</p>}
        </div>
      </section>

      <Section
        title={messages.manpower}
        addLabel={messages.addManpower}
        disabled={!editable || manpower.fields.length >= 50}
        onAdd={() => manpower.append({
          id: crypto.randomUUID(), trade_type: '', headcount: 1, work_hours: 8, remarks: '',
        })}
      >
        {manpower.fields.length === 0 ? (
          <p className="text-sm text-muted">{messages.emptyEntries}</p>
        ) : manpower.fields.map((field, index) => {
          const rowErrors = errors.manpower?.[index];
          return (
            <div key={field.id} className="grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-5">
              <Input label={messages.manpowerType} disabled={!editable} error={rowErrors?.trade_type?.message} {...form.register(`manpower.${index}.trade_type`)} />
              <Input label={messages.headcount} type="number" min={1} step={1} disabled={!editable} error={rowErrors?.headcount?.message} {...form.register(`manpower.${index}.headcount`, { valueAsNumber: true })} />
              <Input label={messages.workHours} type="number" min={0} max={24} step={0.25} disabled={!editable} error={rowErrors?.work_hours?.message} {...form.register(`manpower.${index}.work_hours`, { valueAsNumber: true })} />
              <Input label={messages.remarks} disabled={!editable} error={rowErrors?.remarks?.message} {...form.register(`manpower.${index}.remarks`)} />
              {editable && (
                <Button variant="ghost" aria-label={`${messages.removeEntry}: ${messages.manpowerType} ${index + 1}`} onClick={() => manpower.remove(index)}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  {messages.removeEntry}
                </Button>
              )}
            </div>
          );
        })}
      </Section>

      <Section
        title={messages.equipment}
        addLabel={messages.addEquipment}
        disabled={!editable || equipment.fields.length >= 50}
        onAdd={() => equipment.append({
          id: crypto.randomUUID(), equipment_name: '', quantity: 1, active_hours: 0, standby_hours: 0, remarks: '',
        })}
      >
        {equipment.fields.length === 0 ? (
          <p className="text-sm text-muted">{messages.emptyEntries}</p>
        ) : equipment.fields.map((field, index) => {
          const rowErrors = errors.equipment?.[index];
          return (
            <div key={field.id} className="grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-5">
              <Input label={messages.equipmentName} disabled={!editable} error={rowErrors?.equipment_name?.message} {...form.register(`equipment.${index}.equipment_name`)} />
              <Input label={messages.quantity} type="number" min={0.01} step={0.01} disabled={!editable} error={rowErrors?.quantity?.message} {...form.register(`equipment.${index}.quantity`, { valueAsNumber: true })} />
              <Input label={messages.activeHours} type="number" min={0} max={24} step={0.25} disabled={!editable} error={rowErrors?.active_hours?.message} {...form.register(`equipment.${index}.active_hours`, { valueAsNumber: true })} />
              <Input label={messages.standbyHours} type="number" min={0} max={24} step={0.25} disabled={!editable} error={rowErrors?.standby_hours?.message} {...form.register(`equipment.${index}.standby_hours`, { valueAsNumber: true })} />
              <Input label={messages.remarks} disabled={!editable} error={rowErrors?.remarks?.message} {...form.register(`equipment.${index}.remarks`)} />
              {editable && (
                <Button variant="ghost" aria-label={`${messages.removeEntry}: ${messages.equipmentName} ${index + 1}`} onClick={() => equipment.remove(index)}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  {messages.removeEntry}
                </Button>
              )}
            </div>
          );
        })}
      </Section>

      <Section
        title={messages.materials}
        addLabel={messages.addMaterial}
        disabled={!editable || materials.fields.length >= 50}
        onAdd={() => materials.append({
          id: crypto.randomUUID(), material_name: '', quantity: 1, unit: '', supplier_name: '', delivery_note_no: '',
        })}
      >
        {materials.fields.length === 0 ? (
          <p className="text-sm text-muted">{messages.emptyEntries}</p>
        ) : materials.fields.map((field, index) => {
          const rowErrors = errors.materials?.[index];
          return (
            <div key={field.id} className="grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-5">
              <Input label={messages.materialName} disabled={!editable} error={rowErrors?.material_name?.message} {...form.register(`materials.${index}.material_name`)} />
              <Input label={messages.quantity} type="number" min={0.0001} step={0.0001} disabled={!editable} error={rowErrors?.quantity?.message} {...form.register(`materials.${index}.quantity`, { valueAsNumber: true })} />
              <Input label={messages.unit} disabled={!editable} error={rowErrors?.unit?.message} {...form.register(`materials.${index}.unit`)} />
              <Input label={messages.supplier} disabled={!editable} error={rowErrors?.supplier_name?.message} {...form.register(`materials.${index}.supplier_name`)} />
              <Input label={messages.deliveryNote} disabled={!editable} error={rowErrors?.delivery_note_no?.message} {...form.register(`materials.${index}.delivery_note_no`)} />
              {editable && (
                <Button variant="ghost" aria-label={`${messages.removeEntry}: ${messages.materialName} ${index + 1}`} onClick={() => materials.remove(index)}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  {messages.removeEntry}
                </Button>
              )}
            </div>
          );
        })}
      </Section>

      <section className="space-y-4 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <div>
          <h2 className="text-base font-semibold text-text">{messages.photos}</h2>
          <p className="mt-1 text-xs text-muted">{messages.photosHint}</p>
        </div>
        {photos.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((photo) => (
              <figure key={photo.path} className="space-y-2 rounded-md border border-border p-2">
                <img src={photoPreviewUrls[photo.path]} alt={photo.caption} className="aspect-video w-full rounded object-cover" />
                <figcaption className="flex items-center justify-between gap-2 text-xs text-muted">
                  <span className="truncate">{photo.caption}</span>
                  {editable && (
                    <button type="button" className="grid h-11 w-11 shrink-0 place-items-center rounded text-muted hover:bg-danger-bg hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500" aria-label={`${messages.removePhoto}: ${photo.caption}`} onClick={() => onRemovePhoto(photo.path)}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
        {editable && photos.length < 10 && (
          <FileUploader
            label={messages.photos}
            hint={messages.photosHint}
            files={pendingPhotos}
            onFilesChange={setPendingPhotos}
            accept="image/jpeg,image/png,image/webp"
            acceptedMimeTypes={['image/jpeg', 'image/png', 'image/webp']}
            maxFileSizeBytes={10 * 1024 * 1024}
            maxFiles={10 - photos.length}
            compressImages
          />
        )}
      </section>

      <SignaturePad
        label={messages.siteSignature}
        hint={messages.signatureHint}
        clearLabel={messages.clearSignature}
        savedLabel={messages.savedSignature}
        typedNameLabel={messages.typedSignatureName}
        useTypedNameLabel={messages.useTypedName}
        processErrorLabel={messages.signatureProcessError}
        disabled={!editable}
        savedSignatureUrl={siteSignatureUrl}
        onSignatureChange={onSiteSignatureChange}
      />
      {showApproverSignature && (
        <SignaturePad
          label={messages.approvalSignature}
          hint={messages.signatureHint}
          clearLabel={messages.clearSignature}
          savedLabel={messages.savedSignature}
          typedNameLabel={messages.typedSignatureName}
          useTypedNameLabel={messages.useTypedName}
          processErrorLabel={messages.signatureProcessError}
          savedSignatureUrl={approverSignatureUrl}
          onSignatureChange={onApproverSignatureChange}
        />
      )}
    </div>
  );
}
