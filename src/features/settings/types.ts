import type { Json, Tables } from '../../types/database';
import type { AppAction, AppModule, UserRole } from '../../utils/permissions';

export type MeasurementUnit = Tables<'measurement_units'>;
export type PriceItem = Omit<Tables<'price_items'>, 'category'> & {
  category: 'bahan' | 'upah' | 'alat';
};

export type PriceItemInput = Omit<
  PriceItem,
  'id' | 'organization_id' | 'created_by' | 'created_at' | 'updated_at' | 'deleted_at'
>;

export type DocumentSequence = Pick<
  Tables<'doc_number_sequences'>,
  'id' | 'organization_id' | 'entity_type' | 'year' | 'prefix' | 'last_value' | 'updated_at'
>;

export type RolePermissionOverride = {
  organization_id: string;
  role: UserRole;
  module: AppModule;
  action: AppAction;
  allowed: boolean;
};

export type OrganizationActivity = {
  id: string;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  project_name: string | null;
  created_at: string;
};

export type JsonObject = { [key: string]: Json | undefined };
