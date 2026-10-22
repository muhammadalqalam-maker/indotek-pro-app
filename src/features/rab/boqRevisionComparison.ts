import type { BoqItem } from './services/boq.service';

export type BoqRevisionChangeField =
  | 'description'
  | 'divisionDescription'
  | 'unit'
  | 'ahsp'
  | 'volume'
  | 'unitPrice'
  | 'order';

export type BoqRevisionChange = {
  key: string;
  path: string;
  kind: 'added' | 'removed' | 'changed';
  previous: BoqItem | null;
  current: BoqItem | null;
  changedFields: BoqRevisionChangeField[];
};

type IndexedBoqItem = {
  item: BoqItem;
  division: BoqItem | null;
  key: string;
  path: string;
};

function indexItems(items: BoqItem[]): Map<string, IndexedBoqItem> {
  const divisions = new Map(
    items
      .filter((item) => item.item_type === 'division')
      .map((item) => [item.id, item]),
  );
  const indexed = new Map<string, IndexedBoqItem>();

  for (const item of items) {
    const division = item.item_type === 'division'
      ? null
      : divisions.get(item.parent_id ?? '') ?? null;
    const code = item.item_code.toLowerCase();
    const key = division
      ? JSON.stringify(['work', division.item_code.toLowerCase(), code])
      : JSON.stringify(['division', code]);
    indexed.set(key, {
      item,
      division,
      key,
      path: division
        ? `${division.item_code} / ${item.item_code}`
        : item.item_code,
    });
  }

  return indexed;
}

function valuesDiffer(left: string | number | null, right: string | number | null): boolean {
  if (typeof left === 'number' || typeof right === 'number') {
    return Number(left) !== Number(right);
  }
  return left !== right;
}

function getChangedFields(previous: IndexedBoqItem, current: IndexedBoqItem): BoqRevisionChangeField[] {
  const changed: BoqRevisionChangeField[] = [];

  if (previous.item.description !== current.item.description) changed.push('description');
  if (previous.division?.description !== current.division?.description) changed.push('divisionDescription');
  if (previous.item.sort_order !== current.item.sort_order) changed.push('order');

  if (previous.item.item_type === 'work_item' && current.item.item_type === 'work_item') {
    if (previous.item.unit_id !== current.item.unit_id) changed.push('unit');
    if (previous.item.ahsp_id !== current.item.ahsp_id) changed.push('ahsp');
    if (valuesDiffer(previous.item.volume, current.item.volume)) changed.push('volume');
    if (valuesDiffer(previous.item.unit_price, current.item.unit_price)) changed.push('unitPrice');
  }

  return changed;
}

export function compareBoqRevisions(
  previousItems: BoqItem[],
  currentItems: BoqItem[],
): BoqRevisionChange[] {
  const previous = indexItems(previousItems);
  const current = indexItems(currentItems);
  const keys = new Set([...previous.keys(), ...current.keys()]);
  const changes: BoqRevisionChange[] = [];

  for (const key of keys) {
    const before = previous.get(key);
    const after = current.get(key);

    if (!before && after) {
      changes.push({
        key,
        path: after.path,
        kind: 'added',
        previous: null,
        current: after.item,
        changedFields: [],
      });
      continue;
    }

    if (before && !after) {
      changes.push({
        key,
        path: before.path,
        kind: 'removed',
        previous: before.item,
        current: null,
        changedFields: [],
      });
      continue;
    }

    if (!before || !after) continue;
    const changedFields = getChangedFields(before, after);
    if (changedFields.length > 0) {
      changes.push({
        key,
        path: after.path,
        kind: 'changed',
        previous: before.item,
        current: after.item,
        changedFields,
      });
    }
  }

  return changes.sort((left, right) => left.path.localeCompare(right.path, 'id'));
}
