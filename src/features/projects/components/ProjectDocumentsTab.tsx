import { FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui';
import { getMessages } from '../../../i18n';
import type { ProjectDocument } from '../../../types/database';

const messages = getMessages('id').projects;

const documentCategories = [
  'Kontrak & SPK',
  'Gambar Kerja (DED)',
  'Shop Drawing',
  'As-Built Drawing',
  'RFI (Klarifikasi)',
  'Berita Acara (BAST)',
  'Laporan K3 & Lingkungan',
] satisfies readonly ProjectDocument['category'][];

export function ProjectDocumentsTab() {
  return (
    <section className="space-y-4">
      <p className="text-sm text-muted">{messages.detail.documentIntro}</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {documentCategories.map((category) => (
          <Card key={category}>
            <CardHeader className="flex-row items-start gap-3 space-y-0">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </span>
              <CardTitle className="text-sm">{messages.documentCategories[category]}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted">{messages.detail.documentPlaceholder}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
