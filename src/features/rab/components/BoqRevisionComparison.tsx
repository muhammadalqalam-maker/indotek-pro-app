import { Badge, EmptyState } from '../../../components/ui';
import { formatPersen, formatRupiah } from '../../../utils/format';
import { compareBoqRevisions, type BoqRevisionChangeField } from '../boqRevisionComparison';
import type { BoqItem, BoqVersion } from '../services/boq.service';
import type { AhspDetail, MeasurementUnit } from '../types';

type BoqMessages = ReturnType<typeof import('../../../i18n').getMessages>['rab'];

type BoqRevisionComparisonProps = {
  previousVersion: BoqVersion;
  currentVersion: BoqVersion;
  previousItems: BoqItem[];
  currentItems: BoqItem[];
  units: MeasurementUnit[];
  analyses: AhspDetail[];
  messages: BoqMessages;
};

function getFieldLabel(field: BoqRevisionChangeField, messages: BoqMessages): string {
  const labels: Record<BoqRevisionChangeField, string> = {
    description: messages.boqCompareFieldDescription,
    divisionDescription: messages.boqCompareFieldDivision,
    unit: messages.boqCompareUnit,
    ahsp: messages.boqCompareAhsp,
    volume: messages.boqCompareVolume,
    unitPrice: messages.boqCompareUnitPrice,
    order: messages.boqCompareOrder,
  };
  return labels[field];
}

function getItemDetails(
  item: BoqItem,
  unitsById: ReadonlyMap<string, MeasurementUnit>,
  analysesById: ReadonlyMap<string, AhspDetail>,
  messages: BoqMessages,
) {
  if (item.item_type === 'division') {
    return (
      <div className="grid gap-1 text-sm">
        <p className="text-text">{item.description}</p>
        <p className="text-muted-foreground">{messages.boqCompareOrder}: {item.sort_order + 1}</p>
      </div>
    );
  }

  const unitSymbol = unitsById.get(item.unit_id ?? '')?.symbol ?? item.unit_id ?? '';
  const analysis = analysesById.get(item.ahsp_id ?? '');

  return (
    <div className="grid gap-1 text-sm text-muted-foreground">
      <p className="text-text">{item.description}</p>
      <p className="tabular-nums">
        {item.volume} {unitSymbol} × {formatRupiah(Number(item.unit_price), true, 2)}
        {' = '}{formatRupiah(Number(item.line_total), true, 2)}
      </p>
      {item.ahsp_id && (
        <p>{messages.boqCompareAhsp}: {analysis ? `${analysis.code} · ${analysis.title}` : item.ahsp_id}</p>
      )}
      <p>{messages.boqCompareOrder}: {item.sort_order + 1}</p>
    </div>
  );
}

export function BoqRevisionComparison({
  previousVersion,
  currentVersion,
  previousItems,
  currentItems,
  units,
  analyses,
  messages,
}: BoqRevisionComparisonProps) {
  const changes = compareBoqRevisions(previousItems, currentItems);
  const unitsById = new Map(units.map((unit) => [unit.id, unit]));
  const analysesById = new Map(analyses.map((analysis) => [analysis.id, analysis]));
  const difference = Number(currentVersion.grand_total) - Number(previousVersion.grand_total);
  const differencePrefix = difference > 0 ? '+' : difference < 0 ? '-' : '';
  const differenceClass = difference > 0 ? 'text-danger' : difference < 0 ? 'text-success' : 'text-text';

  return (
    <section className="grid gap-4 rounded-xl border border-border bg-surface p-4 sm:p-6" aria-labelledby="boq-comparison-title">
      <div>
        <h3 id="boq-comparison-title" className="text-base font-semibold text-text">{messages.boqCompareTitle}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{messages.boqCompareDescription}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {[previousVersion, currentVersion].map((version) => (
          <div key={version.id} className="rounded-lg border border-border bg-surface-2 p-3">
            <p className="text-sm font-medium text-text">Rev {version.revision_number} · {version.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{messages.boqGrandTotal}</p>
            <p className="tabular-nums text-lg font-semibold text-text">
              {formatRupiah(Number(version.grand_total), true, 2)}
            </p>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        {messages.boqComparePrevious}: {messages.boqOverhead}: {formatPersen(Number(previousVersion.overhead_percent))}
        {' · '}{messages.boqProfit}: {formatPersen(Number(previousVersion.profit_percent))}
        {' · '}{messages.boqPpn}: {formatPersen(Number(previousVersion.ppn_percent))}
      </p>
      <p className="text-sm text-muted-foreground">
        {messages.boqCompareCurrent}: {messages.boqOverhead}: {formatPersen(Number(currentVersion.overhead_percent))}
        {' · '}{messages.boqProfit}: {formatPersen(Number(currentVersion.profit_percent))}
        {' · '}{messages.boqPpn}: {formatPersen(Number(currentVersion.ppn_percent))}
      </p>

      <p className={`rounded-md border border-border p-3 text-sm font-medium tabular-nums ${differenceClass}`}>
        {messages.boqCompareDifference}: {differencePrefix}{formatRupiah(Math.abs(difference), true, 2)}
      </p>

      <p className="text-sm text-muted-foreground" role="status" aria-live="polite" aria-atomic="true">
        {messages.boqCompareChangeCount(changes.length)}
      </p>

      {changes.length === 0 ? (
        <EmptyState title={messages.boqCompareNoChanges} />
      ) : (
        <ul className="grid gap-3">
          {changes.map((change) => {
            const badgeVariant = change.kind === 'added'
              ? 'success'
              : change.kind === 'removed'
                ? 'danger'
                : 'warning';
            const changeLabel = change.kind === 'added'
              ? messages.boqCompareAdded
              : change.kind === 'removed'
                ? messages.boqCompareRemoved
                : messages.boqCompareChanged;

            return (
              <li key={change.key} className="grid gap-3 rounded-lg border border-border bg-surface-2 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 text-sm font-semibold text-text">{change.path}</p>
                  <Badge variant={badgeVariant}>{changeLabel}</Badge>
                </div>
                {change.changedFields.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {change.changedFields.map((field) => getFieldLabel(field, messages)).join(', ')}
                  </p>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  {change.previous && (
                    <div className="min-w-0">
                      <p className="mb-1 text-xs font-medium text-muted-foreground">{messages.boqComparePrevious}</p>
                      {getItemDetails(change.previous, unitsById, analysesById, messages)}
                    </div>
                  )}
                  {change.current && (
                    <div className="min-w-0">
                      <p className="mb-1 text-xs font-medium text-muted-foreground">{messages.boqCompareCurrent}</p>
                      {getItemDetails(change.current, unitsById, analysesById, messages)}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
