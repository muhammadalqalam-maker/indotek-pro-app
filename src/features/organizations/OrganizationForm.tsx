import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useApp } from '../../context/AppContext';
import { organizationMessages as messages } from '../../i18n/id';
import { organizationSchema, type NewOrganizationData, type OrganizationFormValues } from './schemas/organization.schema';
import { createOrganizationWithOwner, uploadOrganizationLogo } from './services/organization.service';

type OrganizationFormProps = {
  required?: boolean;
  onComplete?: () => void;
  onCancel?: () => void;
};

const inputClassName = 'mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2.5 text-base text-slate-900 outline-none focus-visible:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-700 dark:text-white dark:focus-visible:ring-offset-slate-900';
const primaryButtonClassName = 'min-h-11 w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-slate-900 sm:w-auto';
const secondaryButtonClassName = 'min-h-11 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-900';

function errorMessage(error: unknown): string {
  if (!(error instanceof Error)) return messages.createFailure;
  if (error.message.includes('organizations_slug_key')) {
    return messages.duplicateSlug;
  }
  return error.message;
}

export function OrganizationForm({ required = false, onComplete, onCancel }: OrganizationFormProps) {
  const { isSupabaseLive, completeOrganization } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pendingOrganization, setPendingOrganization] = useState<Awaited<ReturnType<typeof createOrganizationWithOwner>> | null>(null);
  const { register, handleSubmit, getValues, setValue, setError: setFieldError, clearErrors, watch, formState: { errors } } = useForm<OrganizationFormValues>({
    defaultValues: { name: '', companyCode: '', address: '', city: '', province: '', npwp: '', timezone: 'WIB' },
  });
  const logo = watch('logo');
  const [logoPreview, setLogoPreview] = useState('');

  useEffect(() => {
    if (!logo) {
      setLogoPreview('');
      return;
    }
    const previewUrl = URL.createObjectURL(logo);
    setLogoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [logo]);

  const applyValidationErrors = (issues: z.ZodIssue[]) => {
    for (const issue of issues) {
      const field = issue.path[0];
      if (field === 'name' || field === 'companyCode' || field === 'address' || field === 'city' || field === 'province' || field === 'npwp' || field === 'timezone' || field === 'logo') {
        setFieldError(field, { type: 'validate', message: issue.message });
      }
    }
  };

  const finishOnboarding = (organization: Awaited<ReturnType<typeof createOrganizationWithOwner>>) => {
    completeOrganization(organization);
    setPendingOrganization(null);
    onComplete?.();
  };

  const onSubmit = async (values: OrganizationFormValues) => {
    setError('');
    clearErrors();
    const parsed = organizationSchema.safeParse(values);
    if (!parsed.success) {
      applyValidationErrors(parsed.error.issues);
      return;
    }

    setIsSubmitting(true);
    try {
      let organization = pendingOrganization;
      if (!organization) {
        const slug = parsed.data.name
          .normalize('NFKD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        if (!slug) {
          setFieldError('name', { type: 'validate', message: 'Nama organisasi perlu memuat huruf atau angka.' });
          return;
        }
        const organizationData: NewOrganizationData = {
          name: parsed.data.name,
          slug,
          company_code: parsed.data.companyCode.toUpperCase(),
          address: parsed.data.address,
          city: parsed.data.city || undefined,
          province: parsed.data.province || undefined,
          npwp: parsed.data.npwp || undefined,
          timezone: parsed.data.timezone,
        };
        organization = await createOrganizationWithOwner(organizationData);
        setPendingOrganization(organization);
      }

      if (parsed.data.logo) {
        organization = await uploadOrganizationLogo(organization.id, parsed.data.logo);
      }
      finishOnboarding(organization);
    } catch (submitError: unknown) {
      setError(errorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-8 dark:border-slate-800 dark:bg-slate-900">
      <header className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary-500">Indotek Pro</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
          {required ? messages.onboardingTitle : messages.createTitle}
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {messages.description}
        </p>
      </header>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300" role="alert">{error}</p>}
      {pendingOrganization && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200" role="status">
          {messages.organizationCreated} {logo ? messages.uploadToContinue : messages.uploadOrContinue}
        </p>
      )}

      <form className="space-y-5" noValidate onSubmit={handleSubmit(onSubmit)}>
        <fieldset disabled={isSubmitting || Boolean(pendingOrganization)} className="space-y-5 disabled:opacity-75">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="organization-name">
              {messages.name} <span aria-hidden="true">*</span>
              <input
                {...register('name', {
                  onChange: (event) => {
                    if (getValues('companyCode')) return;
                    const code = event.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase();
                    setValue('companyCode', code, { shouldDirty: true });
                  },
                })}
                id="organization-name"
                className={inputClassName}
                autoComplete="organization"
                aria-required="true"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'organization-name-error' : undefined}
              />
            </label>
            {errors.name && <p id="organization-name-error" className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="organization-code">
                {messages.companyCode} <span aria-hidden="true">*</span>
                <input {...register('companyCode')} id="organization-code" className={inputClassName} autoComplete="off" maxLength={6} aria-required="true" aria-invalid={Boolean(errors.companyCode)} aria-describedby={errors.companyCode ? 'organization-code-error' : undefined} />
              </label>
              {errors.companyCode && <p id="organization-code-error" className="mt-1 text-xs text-red-600">{errors.companyCode.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="organization-npwp">
                {messages.npwp} <span className="font-normal text-slate-500">({messages.optional})</span>
                <input {...register('npwp')} id="organization-npwp" className={inputClassName} autoComplete="off" inputMode="numeric" />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="organization-address">
              {messages.address} <span aria-hidden="true">*</span>
              <textarea {...register('address')} id="organization-address" className={`${inputClassName} min-h-24 resize-y`} autoComplete="street-address" aria-required="true" aria-invalid={Boolean(errors.address)} aria-describedby={errors.address ? 'organization-address-error' : undefined} />
            </label>
            {errors.address && <p id="organization-address-error" className="mt-1 text-xs text-red-600">{errors.address.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="organization-city">
                {messages.city} <span className="font-normal text-slate-500">({messages.optional})</span>
                <input {...register('city')} id="organization-city" className={inputClassName} autoComplete="address-level2" />
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="organization-province">
                {messages.province} <span className="font-normal text-slate-500">({messages.optional})</span>
                <input {...register('province')} id="organization-province" className={inputClassName} autoComplete="address-level1" />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="organization-timezone">
              {messages.timezone}
              <select {...register('timezone')} id="organization-timezone" className={inputClassName}>
                <option value="WIB">WIB</option>
                <option value="WITA">WITA</option>
                <option value="WIT">WIT</option>
              </select>
            </label>
          </div>
        </fieldset>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="organization-logo">
            {messages.logo} <span className="font-normal text-slate-500">({messages.logoRequirements})</span>
            <input
              id="organization-logo"
              className={`${inputClassName} file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-sm dark:file:bg-slate-800`}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={isSubmitting || !isSupabaseLive}
              onChange={(event) => {
                clearErrors('logo');
                setValue('logo', event.target.files?.[0], { shouldValidate: true });
              }}
              aria-invalid={Boolean(errors.logo)}
              aria-describedby={errors.logo ? 'organization-logo-error' : undefined}
            />
          </label>
          {errors.logo && <p id="organization-logo-error" className="mt-1 text-xs text-red-600">{errors.logo.message}</p>}
          {logoPreview && <img src={logoPreview} alt={messages.logoPreview} className="mt-3 h-20 w-20 rounded-lg border border-slate-200 object-contain p-2 dark:border-slate-700" />}
          <p className="mt-1 text-xs text-slate-500">{messages.logoCompress}</p>
          {!isSupabaseLive && <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{messages.uploadNeedsSupabase}</p>}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end dark:border-slate-800">
          {!required && onCancel && (
            <button className={secondaryButtonClassName} type="button" onClick={onCancel} disabled={isSubmitting || Boolean(pendingOrganization)}>
            {messages.cancel}
            </button>
          )}
          <button className={primaryButtonClassName} type="submit" disabled={isSubmitting}>
          {isSubmitting ? messages.saving : pendingOrganization ? messages.retryButton : messages.createButton}
          </button>
          {pendingOrganization && (
            <button className={secondaryButtonClassName} type="button" onClick={() => finishOnboarding(pendingOrganization)} disabled={isSubmitting}>
            {messages.continueWithoutLogo}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
