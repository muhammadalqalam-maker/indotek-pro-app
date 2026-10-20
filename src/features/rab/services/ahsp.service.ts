import { calculateAhspTotal } from '../ahspCalculations';
import type { AhspFormValues } from '../schemas/ahsp.schema';
import { getSupabase } from '../../../lib/supabase';
import type { Tables } from '../../../types/database';
import type { AhspCatalog, AhspComponentDetail, AhspDetail, AhspPriceItem } from '../types';

type ComponentRow = Tables<'ahsp_components'>;
type ComponentWrite = Pick<
  ComponentRow,
  'organization_id' | 'ahsp_id' | 'price_item_id' | 'coefficient' | 'sort_order'
> & { id?: string; deleted_at?: string | null };

function getRabClient() {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Koneksi Supabase belum tersedia.');
  return supabase;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (
    typeof error === 'object'
    && error !== null
    && 'message' in error
    && typeof error.message === 'string'
  ) {
    return error.message;
  }
  return 'Terjadi kesalahan yang tidak diketahui.';
}

function getComponentWrites(
  organizationId: string,
  ahspId: string,
  components: AhspFormValues['components'],
): ComponentWrite[] {
  return components.map((component, index) => ({
    ...(component.component_id ? { id: component.component_id } : {}),
    organization_id: organizationId,
    ahsp_id: ahspId,
    price_item_id: component.price_item_id,
    coefficient: component.coefficient,
    sort_order: index,
    deleted_at: null,
  }));
}

async function removeNewAhsp(organizationId: string, ahspId: string, cause: unknown): Promise<never> {
  const { error } = await getRabClient()
    .from('ahsp')
    .delete()
    .eq('id', ahspId)
    .eq('organization_id', organizationId);

  if (error) {
    throw new Error(`${getErrorMessage(cause)} Pembersihan AHSP baru juga gagal: ${getErrorMessage(error)}`);
  }
  throw cause;
}

async function restoreComponents(
  organizationId: string,
  ahspId: string,
  previousRows: ComponentRow[],
  savedRows: Pick<ComponentRow, 'id'>[],
  cause: unknown,
): Promise<never> {
  const client = getRabClient();
  const recoveryErrors: string[] = [];
  const previousIds = new Set(previousRows.map((row) => row.id));

  if (previousRows.length > 0) {
    const { error } = await client
      .from('ahsp_components')
      .upsert(previousRows.map((row) => ({
        id: row.id,
        organization_id: row.organization_id,
        ahsp_id: row.ahsp_id,
        price_item_id: row.price_item_id,
        coefficient: row.coefficient,
        sort_order: row.sort_order,
        deleted_at: null,
      })));
    if (error) recoveryErrors.push(getErrorMessage(error));
  }

  const newIds = savedRows.map((row) => row.id).filter((id) => !previousIds.has(id));
  if (newIds.length > 0) {
    const { error } = await client
      .from('ahsp_components')
      .update({ deleted_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .eq('ahsp_id', ahspId)
      .in('id', newIds);
    if (error) recoveryErrors.push(getErrorMessage(error));
  }

  if (recoveryErrors.length > 0) {
    throw new Error(
      `${getErrorMessage(cause)} Pemulihan komponen AHSP tidak tuntas: ${recoveryErrors.join('; ')}`,
    );
  }
  throw cause;
}

export async function fetchAhspCatalog(organizationId: string): Promise<AhspCatalog> {
  const client = getRabClient();
  const [ahspResult, componentResult, priceItemResult, unitResult] = await Promise.all([
    client.from('ahsp')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('division')
      .order('code'),
    client.from('ahsp_components')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('sort_order'),
    client.from('price_items')
      .select('*')
      .eq('organization_id', organizationId)
      .order('category')
      .order('code'),
    client.from('measurement_units')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name'),
  ]);

  if (ahspResult.error) throw ahspResult.error;
  if (componentResult.error) throw componentResult.error;
  if (priceItemResult.error) throw priceItemResult.error;
  if (unitResult.error) throw unitResult.error;

  const unitsById = new Map((unitResult.data ?? []).map((unit) => [unit.id, unit]));
  const itemsById = new Map<string, AhspPriceItem>();
  for (const item of priceItemResult.data ?? []) {
    const unit = unitsById.get(item.unit_id);
    if (!unit) {
      throw new Error(`Satuan untuk item harga "${item.code}" tidak ditemukan.`);
    }
    itemsById.set(item.id, { ...item, unitSymbol: unit.symbol });
  }

  const componentsByAhspId = new Map<string, AhspComponentDetail[]>();
  for (const component of componentResult.data ?? []) {
    const item = itemsById.get(component.price_item_id);
    if (!item) {
      throw new Error(`Item harga untuk komponen AHSP ${component.id} tidak ditemukan.`);
    }
    const detail = { ...component, item };
    const group = componentsByAhspId.get(component.ahsp_id) ?? [];
    group.push(detail);
    componentsByAhspId.set(component.ahsp_id, group);
  }

  const analyses: AhspDetail[] = (ahspResult.data ?? []).map((analysis) => {
    const unit = unitsById.get(analysis.unit_id);
    if (!unit) throw new Error(`Satuan untuk AHSP "${analysis.code}" tidak ditemukan.`);
    const components = componentsByAhspId.get(analysis.id) ?? [];
    return {
      ...analysis,
      unitSymbol: unit.symbol,
      components,
      unitPrice: calculateAhspTotal(components.map((component) => ({
        coefficient: component.coefficient,
        unitPrice: component.item.unit_price,
      }))),
    };
  });

  return {
    analyses,
    units: unitResult.data ?? [],
    priceItems: [...itemsById.values()],
  };
}

export async function saveAhsp(
  organizationId: string,
  ahspId: string | null,
  values: AhspFormValues,
): Promise<void> {
  const client = getRabClient();
  const { components, ...header } = values;

  if (ahspId === null) {
    const { data, error } = await client
      .from('ahsp')
      .insert({ organization_id: organizationId, ...header })
      .select('id')
      .single();
    if (error) throw error;

    const { error: componentError } = await client
      .from('ahsp_components')
      .insert(getComponentWrites(organizationId, data.id, components));
    if (componentError) return removeNewAhsp(organizationId, data.id, componentError);
    return;
  }

  const { data: previousRows, error: previousError } = await client
    .from('ahsp_components')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('ahsp_id', ahspId)
    .is('deleted_at', null);
  if (previousError) throw previousError;

  const previousIds = new Set((previousRows ?? []).map((row) => row.id));
  for (const component of components) {
    if (component.component_id && !previousIds.has(component.component_id)) {
      throw new Error('Komponen AHSP tidak cocok dengan analisa yang sedang diubah.');
    }
  }

  const { data: savedRows, error: saveComponentsError } = await client
    .from('ahsp_components')
    .upsert(getComponentWrites(organizationId, ahspId, components))
    .select('id');
  if (saveComponentsError) throw saveComponentsError;

  const retainedIds = new Set(components.flatMap((component) => component.component_id ?? []));
  const removedIds = (previousRows ?? []).map((row) => row.id).filter((id) => !retainedIds.has(id));
  if (removedIds.length > 0) {
    const { error } = await client
      .from('ahsp_components')
      .update({ deleted_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .eq('ahsp_id', ahspId)
      .in('id', removedIds);
    if (error) {
      return restoreComponents(organizationId, ahspId, previousRows ?? [], savedRows ?? [], error);
    }
  }

  const { error: headerError } = await client
    .from('ahsp')
    .update(header)
    .eq('id', ahspId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select('id')
    .single();
  if (headerError) {
    return restoreComponents(organizationId, ahspId, previousRows ?? [], savedRows ?? [], headerError);
  }
}

export async function archiveAhsp(organizationId: string, ahspId: string): Promise<void> {
  const { error } = await getRabClient()
    .from('ahsp')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', ahspId)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select('id')
    .single();
  if (error) throw error;
}
