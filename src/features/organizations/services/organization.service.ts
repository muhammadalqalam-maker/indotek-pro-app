import { createOrganization } from '../../../services/dataService';
import type { Organization } from '../../../types/database';
import { getSupabase } from '../../../lib/supabase';
import type { NewOrganizationData } from '../schemas/organization.schema';
import { organizationMessages as messages } from '../../../i18n/id';

const MAX_LOGO_INPUT_BYTES = 10 * 1024 * 1024;
const MAX_LOGO_UPLOAD_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function createOrganizationWithOwner(data: NewOrganizationData): Promise<Organization> {
  return createOrganization(data);
}

async function compressLogo(file: File): Promise<Blob> {
  if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
    throw new Error(messages.invalidLogoType);
  }
  if (file.size > MAX_LOGO_INPUT_BYTES) {
    throw new Error(messages.logoInputTooLarge);
  }

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error(messages.browserCannotProcessLogo);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error(messages.cannotCompressLogo));
      }, 'image/webp', 0.82);
    });
    if (blob.type !== 'image/webp') {
      throw new Error(messages.browserCannotEncodeWebp);
    }
    if (blob.size > MAX_LOGO_UPLOAD_BYTES) {
      throw new Error(messages.logoOutputTooLarge);
    }
    return blob;
  } finally {
    bitmap.close();
  }
}

export async function uploadOrganizationLogo(
  organizationId: string,
  file: File,
): Promise<Organization> {
  const supabase = getSupabase();
  if (!supabase) throw new Error(messages.uploadUnavailable);

  const blob = await compressLogo(file);
  const path = `${organizationId}/${crypto.randomUUID()}.webp`;
  const storage = supabase.storage.from('org-logos');
  const { error: uploadError } = await storage.upload(path, blob, {
    cacheControl: '3600',
    contentType: 'image/webp',
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data, error: updateError } = await supabase
    .from('organizations')
    .update({ logo_url: path })
    .eq('id', organizationId)
    .select()
    .single();
  if (updateError) {
    const { error: removeError } = await storage.remove([path]);
    if (removeError) {
      throw new Error(`${messages.saveLogoFailed} ${messages.cleanupFailed} ${removeError.message}`);
    }
    throw updateError;
  }

  return data as Organization;
}
