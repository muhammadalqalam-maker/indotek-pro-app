import type { Tables } from '../../types/database';

export type MeasurementUnit = Tables<'measurement_units'>;
export type PriceItem = Tables<'price_items'>;

export type AhspPriceItem = PriceItem & {
  unitSymbol: string;
};

export type AhspComponentDetail = Tables<'ahsp_components'> & {
  item: AhspPriceItem;
};

export type AhspDetail = Tables<'ahsp'> & {
  unitSymbol: string;
  components: AhspComponentDetail[];
  unitPrice: number;
};

export type AhspCatalog = {
  analyses: AhspDetail[];
  units: MeasurementUnit[];
  priceItems: AhspPriceItem[];
};
