import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Building2, ImagePlus, Save } from 'lucide-react';
import { Button, Input, Select, Textarea, useToast } from '../../../components/ui';
import { useApp } from '../../../context/AppContext';
import { getMessages } from '../../../i18n';
import { updateOrganization } from '../../../services/dataService';
import { getSupabase } from '../../../lib/supabase';
import { useCan } from '../../../hooks/useCan';
import type { Organization } from '../../../types/database';
import { uploadOrganizationLogo } from '../../organizations/services/organization.service';
import { companyProfileSchema, type CompanyProfileInput } from '../schemas/settings.schema';

function getProfileValues(organization: Organization): CompanyProfileInput {
  return {
    name: organization.name,
    company_code: organization.company_code,
    address: organization.address ?? '',
    city: organization.city ?? '',
    province: organization.province ?? '',
    postal_code: organization.postal_code ?? '',
    phone: organization.phone ?? '',
    email: organization.email ?? '',
    npwp: organization.npwp ?? '',
    nib: organization.nib ?? '',
    timezone: organization.timezone,
  };
}

export function CompanyProfilePanel({ onOpenSupabaseModal }: { onOpenSupabaseModal: () => void }) {
  const { currentOrg, updateCurrentOrganization, isSupabaseLive } = useApp();
  const { toast } = useToast();
  const messages = getMessages().settings;
  const canEdit = useCan('settings', 'edit');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoError, setLogoError] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CompanyProfileInput>({
    defaultValues: currentOrg ? getProfileValues(currentOrg) : undefined,
  });

  useEffect(() => {
    if (currentOrg) reset(getProfileValues(currentOrg));
  }, [currentOrg, reset]);

  useEffect(() => {
    let active = true;
    setLogoError('');
    if (!currentOrg?.logo_url) {
      setLogoUrl('');
      return () => { active = false; };
    }
    if (/^https?:\/\//i.test(currentOrg.logo_url)) {
      setLogoUrl(currentOrg.logo_url);
      return () => { active = false; };
    }

    const supabase = getSupabase();
    if (!supabase) {
      setLogoUrl('');
      setLogoError(messages.logoPreviewUnavailable);
      return () => { active = false; };
    }
    void supabase.storage.from('org-logos').createSignedUrl(currentOrg.logo_url, 3600)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) throw error;
        setLogoUrl(data.signedUrl);
      })
      .catch((error: unknown) => {
        if (active) setLogoError(error instanceof Error ? error.message : messages.logoPreviewUnavailable);
      });
    return () => { active = false; };
  }, [currentOrg?.id, currentOrg?.logo_url, messages.logoPreviewUnavailable]);

  const saveProfile = handleSubmit(async (values) => {
    const parsed = companyProfileSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === 'string' && field in values) {
          setError(field as keyof CompanyProfileInput, { type: 'manual', message: issue.message });
        }
      }
      return;
    }
    if (!currentOrg) {
      toast({ title: messages.organizationMissing, variant: 'error' });
      return;
    }
    try {
      const updated = await updateOrganization(currentOrg.id, parsed.data);
      updateCurrentOrganization(updated);
      toast({ title: messages.profileSaved, variant: 'success' });
    } catch (error: unknown) {
      toast({
        title: messages.profileSaveFailed,
        description: error instanceof Error ? error.message : messages.unexpectedError,
        variant: 'error',
      });
    }
  });

  const uploadLogo = async (file: File | undefined) => {
    if (!file || !currentOrg) return;
    setLogoError('');
    setIsUploadingLogo(true);
    try {
      const updated = await uploadOrganizationLogo(currentOrg.id, file);
      updateCurrentOrganization(updated);
      toast({ title: messages.logoSaved, variant: 'success' });
    } catch (error: unknown) {
      setLogoError(error instanceof Error ? error.message : messages.logoUploadFailed);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  if (!currentOrg) {
    return <p className="rounded-md border border-border bg-surface p-4 text-sm text-muted">{messages.organizationMissing}</p>;
  }

  return (
    <section className="grid gap-4">
      <form onSubmit={saveProfile} className="grid gap-5 rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-text">
              <Building2 className="h-5 w-5 text-primary-600" aria-hidden="true" />
              {messages.companyProfile}
            </h2>
            <p className="mt-1 text-sm text-muted">{messages.companyProfileHint}</p>
          </div>
          {!isSupabaseLive && (
            <Button type="button" variant="outline" size="sm" onClick={onOpenSupabaseModal}>
              {messages.configureSupabase}
            </Button>
          )}
        </div>

        {!canEdit && <p className="rounded-md bg-surface-2 px-3 py-2 text-sm text-muted">{messages.permissionReadOnly}</p>}
        <fieldset disabled={!canEdit} className="grid gap-4 sm:grid-cols-2">
          <Input label={messages.companyName} error={errors.name?.message} {...register('name')} className="text-sm" />
          <Input label={messages.companyCode} error={errors.company_code?.message} {...register('company_code')} className="text-sm font-mono uppercase" />
          <Input label={messages.npwp} error={errors.npwp?.message} {...register('npwp')} className="text-sm" />
          <Input label={messages.nib} error={errors.nib?.message} {...register('nib')} className="text-sm" />
          <Input label={messages.phone} error={errors.phone?.message} {...register('phone')} className="text-sm" />
          <Input label={messages.email} type="email" error={errors.email?.message} {...register('email')} className="text-sm" />
          <Input label={messages.city} error={errors.city?.message} {...register('city')} className="text-sm" />
          <Input label={messages.province} error={errors.province?.message} {...register('province')} className="text-sm" />
          <Input label={messages.postalCode} error={errors.postal_code?.message} {...register('postal_code')} className="text-sm" />
          <Select label={messages.timezone} error={errors.timezone?.message} {...register('timezone')}>
            <option value="WIB">WIB</option>
            <option value="WITA">WITA</option>
            <option value="WIT">WIT</option>
          </Select>
          <div className="sm:col-span-2">
            <Textarea label={messages.officeAddress} error={errors.address?.message} {...register('address')} className="text-sm" />
          </div>
        </fieldset>

        <p className="rounded-md bg-surface-2 px-3 py-2 text-sm text-muted">{messages.letterheadHint}</p>
        <div className="flex justify-end border-t border-border pt-4">
          <Button type="submit" variant="accent" loading={isSubmitting} disabled={!canEdit}>
            <Save className="h-4 w-4" aria-hidden="true" />
            {messages.saveProfile}
          </Button>
        </div>
      </form>

      <section className="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6" aria-labelledby="company-logo-title">
        <h2 id="company-logo-title" className="text-base font-semibold text-text">{messages.companyLogo}</h2>
        {!canEdit && <p className="mt-1 text-sm text-muted">{messages.permissionReadOnly}</p>}
        <p className="mt-1 text-sm text-muted">
          {messages.companyLogoHint}{!isSupabaseLive ? ` ${messages.logoRequiresSupabase}` : ''}
        </p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="grid h-20 w-28 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-surface-2">
            {logoUrl
              ? <img src={logoUrl} alt={messages.companyLogoAlt} className="h-full w-full object-contain" />
              : <Building2 className="h-8 w-8 text-muted" aria-hidden="true" />}
          </div>
          <div className="grid gap-2">
            <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-border-strong bg-surface px-4 text-sm font-semibold text-text hover:bg-surface-2 has-[:disabled]:cursor-wait has-[:disabled]:opacity-60">
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
              {isUploadingLogo ? messages.logoUploading : messages.changeLogo}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={!canEdit || !isSupabaseLive || isUploadingLogo}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  void uploadLogo(file);
                  event.currentTarget.value = '';
                }}
              />
            </label>
            {logoError && <p className="text-sm text-danger" role="alert">{logoError}</p>}
          </div>
        </div>
      </section>
    </section>
  );
}
