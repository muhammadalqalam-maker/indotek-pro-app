import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Card, CardContent, CardDescription, CardHeader, Input, Textarea } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { organizationMessages as messages } from '../../i18n/id';
import { organizationSchema, type NewOrganizationData, type OrganizationFormValues } from './schemas/organization.schema';
import { createOrganizationWithOwner, uploadOrganizationLogo } from './services/organization.service';

type OrganizationFormProps = {
  required?: boolean;
  onComplete?: () => void;
  onCancel?: () => void;
};

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
          setFieldError('name', { type: 'validate', message: messages.nameNeedsLetter });
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
    <Card className="w-full max-w-2xl shadow-lg">
      <CardHeader>
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Indotek Pro</p>
        <h1 className="text-2xl font-semibold leading-snug text-text">
          {required ? messages.onboardingTitle : messages.createTitle}
        </h1>
        <CardDescription>{messages.description}</CardDescription>
      </CardHeader>
      <CardContent>

      {error && <p className="mb-4 rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger" role="alert">{error}</p>}
      {pendingOrganization && (
        <p className="mb-4 rounded-md border border-warning/30 bg-warning-bg px-3 py-2 text-sm text-warning-foreground" role="status">
          {messages.organizationCreated} {logo ? messages.uploadToContinue : messages.uploadOrContinue}
        </p>
      )}

      <form className="space-y-5" noValidate onSubmit={handleSubmit(onSubmit)}>
        <fieldset disabled={isSubmitting || Boolean(pendingOrganization)} className="space-y-5 disabled:opacity-75">
          <Input
            {...register('name', {
              onChange: (event) => {
                if (getValues('companyCode')) return;
                const code = event.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase();
                setValue('companyCode', code, { shouldDirty: true });
              },
            })}
            id="organization-name"
            label={`${messages.name} *`}
            autoComplete="organization"
            aria-required="true"
            error={errors.name?.message}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input {...register('companyCode')} id="organization-code" label={`${messages.companyCode} *`} autoComplete="off" maxLength={6} aria-required="true" error={errors.companyCode?.message} />
            <Input {...register('npwp')} id="organization-npwp" label={`${messages.npwp} (${messages.optional})`} autoComplete="off" inputMode="numeric" />
          </div>

          <Textarea {...register('address')} id="organization-address" label={`${messages.address} *`} autoComplete="street-address" aria-required="true" error={errors.address?.message} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input {...register('city')} id="organization-city" label={`${messages.city} (${messages.optional})`} autoComplete="address-level2" />
            <Input {...register('province')} id="organization-province" label={`${messages.province} (${messages.optional})`} autoComplete="address-level1" />
          </div>

          <div>
            <label className="grid gap-1.5 text-sm font-medium text-text" htmlFor="organization-timezone">
              {messages.timezone}
              <select {...register('timezone')} id="organization-timezone" className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 py-2.5 text-base text-text outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                <option value="WIB">WIB</option>
                <option value="WITA">WITA</option>
                <option value="WIT">WIT</option>
              </select>
            </label>
          </div>
        </fieldset>

        <div>
          <label className="grid gap-1.5 text-sm font-medium text-text" htmlFor="organization-logo">
            {messages.logo} <span className="font-normal text-muted-foreground">({messages.logoRequirements})</span>
            <input
              id="organization-logo"
              className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm file:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
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
          {errors.logo && <p id="organization-logo-error" className="mt-1 text-xs text-danger">{errors.logo.message}</p>}
          {logoPreview && <img src={logoPreview} alt={messages.logoPreview} className="mt-3 h-20 w-20 rounded-lg border border-border object-contain p-2" />}
          <p className="mt-1 text-xs text-muted-foreground">{messages.logoCompress}</p>
          {!isSupabaseLive && <p className="mt-1 text-xs text-warning-foreground">{messages.uploadUnavailable}</p>}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
          {!required && onCancel && (
            <Button className="sm:w-auto" variant="outline" type="button" onClick={onCancel} disabled={isSubmitting || Boolean(pendingOrganization)}>
              {messages.cancel}
            </Button>
          )}
          <Button className="sm:w-auto" type="submit" loading={isSubmitting} disabled={isSubmitting}>
            {isSubmitting ? messages.saving : pendingOrganization ? messages.retryButton : messages.createButton}
          </Button>
          {pendingOrganization && (
            <Button className="sm:w-auto" variant="outline" type="button" onClick={() => finishOnboarding(pendingOrganization)} disabled={isSubmitting}>
              {messages.continueWithoutLogo}
            </Button>
          )}
        </div>
      </form>
      </CardContent>
    </Card>
  );
}
