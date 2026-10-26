# AGENTS.md — Aturan Kerja Agent untuk Indotek Pro

Dokumen ini adalah **kontrak kerja** untuk setiap AI agent (Claude Code, Cline, Copilot Agent, dll.) yang mengerjakan repo ini. Baca seluruhnya sebelum menulis kode. Jangan menyimpang.

## 0. Urutan Baca Wajib (setiap sesi baru)

1. `AGENTS.md` (file ini)
2. `TASK.md` — cari task aktif berikutnya (sengaja dijaga ≤ 10 KB; riwayat ada di `docs/archive/`)
3. `PRD.md` — untuk requirement fitur yang sedang dikerjakan
4. `DESIGN.md` — untuk semua pekerjaan UI
5. `docs/ui/shadcn-admin-parity.md` — hanya untuk task UI Fase D–E (hasil audit T-UI.0.2)

**Hierarki sumber kebenaran jika ada konflik:** `PRD.md` (apa yang dibangun) > `DESIGN.md` (bagaimana tampilannya) > `TASK.md` (urutan kerja) > `AGENTS.md` (cara kerja). Jika menemukan konflik atau ambiguitas, **berhenti dan tanyakan**, jangan menebak.

## 1. Tentang Produk

**Indotek Pro** adalah aplikasi manajemen konstruksi berbasis web (PWA) bergaya SaaS premium untuk kontraktor di Indonesia.
- Tahap 1: dipakai internal oleh PT. Indotek Karya Nusantara.
- Tahap 2: SaaS multi-tenant untuk perusahaan konstruksi lain.
- Desktop dan mobile, bisa di-install ke layar utama HP (PWA).
- Bahasa UI: Indonesia. Mata uang: Rupiah. PPN default 11% (configurable).

> Konteks: Fase 0–5 sudah dikerjakan dan diarsipkan di `docs/archive/TASK-fase0-6.md` (**jangan dibaca kecuali diminta**; ukurannya besar dan memboroskan konteks). Fokus saat ini: **redesign UI/UX bergaya shadcn-admin** (Fase UI di `TASK.md`) sementara UAT/go-live (T-5.12) berjalan.

## 2. Tech Stack (TERKUNCI — jangan ganti tanpa persetujuan)

| Lapisan | Pilihan |
|---|---|
| Bahasa | TypeScript (strict) |
| Frontend | React 19 + Vite |
| Styling | Tailwind CSS v4 (CSS-first: `@theme inline` di `src/index.css`, tanpa `tailwind.config`) + shadcn/ui (Radix UI) + `class-variance-authority` + `tw-animate-css` |
| Routing | React Router v7, berbasis URL (PRD §5.1); `activeTab` hanya adapter turunan URL |
| Data fetching/cache | TanStack Query |
| Form & validasi | React Hook Form + Zod |
| State global ringan | Zustand |
| Grafik | Recharts |
| Ikon | lucide-react |
| Tabel | `@tanstack/react-table` (setelah disetujui di Decision Log UI) |
| Animasi | `tw-animate-css` + transisi CSS sesuai DESIGN §2.6; `motion` hanya dengan persetujuan di Decision Log |
| Backend | **Supabase** (Postgres, Auth, Storage, Realtime, RLS, Edge Functions) |
| Deploy | **Vercel** |
| PWA | vite-plugin-pwa (Workbox) |
| Offline storage | IndexedDB (mis. `idb`) |
| Tanggal | Helper `src/utils/format.ts` (`formatTanggal`, zona WIB/WITA/WIT) |
| Ekspor | `exceljs`/`xlsx` untuk Excel, `@react-pdf/renderer` atau `jspdf` untuk PDF |

**Dilarang:** Firebase, library UI lain (MUI, Ant, Chakra; **shadcn/ui + Radix diizinkan**), CSS-in-JS, Redux, script dari CDN, dan dependensi baru tanpa alasan jelas. Jika perlu library baru, catat alasannya di `TASK.md` bagian *Keputusan* dan pilih yang kecil, terawat, dan tipenya lengkap.

## 3. Struktur Folder

```
/
├─ AGENTS.md  PRD.md  DESIGN.md  TASK.md
├─ public/                    # ikon PWA, favicon, offline.html
├─ supabase/
│  ├─ migrations/             # SQL bernomor: 0001_xxx.sql, 0002_xxx.sql
│  ├─ seed.sql
│  └─ functions/              # Edge Functions (jika ada)
├─ src/
│  ├─ routes/                 # tabel route + adapter URL↔activeTab (Fase UI-B)
│  ├─ context/                # AppContext (provider global)
│  ├─ components/ui/          # primitif legacy + BARREL index.ts (satu-satunya titik impor UI)
│  ├─ components/shadcn/      # hasil `shadcn add` (catat modifikasi di DESIGN §13)
│  ├─ components/layout/      # sidebar, header, bottom nav, command palette
│  ├─ components/shared/      # komponen lintas fitur
│  ├─ components/pwa/         # indikator offline, install prompt
│  ├─ features/<modul>/       # components/ hooks/ services/ schemas/ types.ts pages/
│  ├─ services/               # akses data (Supabase + TanStack Query)
│  ├─ lib/                    # supabase client, offline queue, observability
│  ├─ utils/                  # format (rupiah, tanggal), permissions, kalkulasi
│  ├─ hooks/  stores/  types/ # hook global, zustand, database.types.ts (generate Supabase)
│  └─ i18n/                   # kamus id (siapkan en)
├─ .env.example
├─ vercel.json
└─ vite.config.ts
```

Aturan: kode khusus fitur hanya boleh ada di `src/features/<modul>/`. Fitur tidak boleh meng-import dari fitur lain secara langsung; lewat `components/shared` atau `lib`.

## 4. Aturan Kode

- TypeScript `strict: true`. **Tanpa `any`** kecuali dengan komentar alasan. Tipe database dari `supabase gen types`.
- Komponen fungsional + hooks. Satu komponen per file, nama file `PascalCase.tsx`; hook `useXxx.ts`.
- Semua akses data lewat **service/hook per fitur** (TanStack Query). Komponen UI tidak memanggil `supabase` langsung.
- Semua form memakai React Hook Form + skema Zod; skema ditaruh di `schemas/`.
- Tidak ada magic string untuk status/role; gunakan konstanta atau enum terpusat.
- Format angka/uang/tanggal **hanya** lewat helper di `src/utils/format.ts` (`formatRupiah`, `formatTanggal`, `formatPersen`).
- Nilai uang disimpan sebagai `numeric(18,2)` di database. Hitung di server/SQL bila memungkinkan; di klien gunakan helper aman untuk pembulatan.
- Tidak ada data dummy hard-coded di komponen. Data contoh hanya lewat `supabase/seed.sql`.
- Tidak ada `console.log` tertinggal. Error ditangani lewat penanganan error terpusat + toast.
- Komentar hanya untuk "mengapa", bukan "apa". Bahasa komentar: Indonesia atau Inggris, konsisten per file.
- Hindari file > 300 baris; pecah komponen/hook.

## 5. Aturan Supabase & Multi-Tenant (KRITIS)

1. **Setiap tabel bisnis wajib punya `organization_id uuid not null`** (FK ke `organizations`) plus `created_at`, `updated_at`, `created_by`, dan `deleted_at` (soft delete) bila relevan.
2. **RLS wajib aktif di SEMUA tabel** pada skema `public`. Tabel tanpa policy = tidak boleh dimerge.
3. Policy berbasis `organization_id` dan role lewat fungsi helper (`is_org_member(org_id)`, `has_role(org_id, role)`), `security definer` dengan `search_path` terkunci.
4. Semua perubahan skema **hanya lewat file migrasi** di `supabase/migrations/` (bernomor berurutan, idempoten sebisanya). Jangan ubah skema manual lewat dashboard tanpa membuat migrasi.
5. **Jangan pernah** memakai `service_role` key di frontend atau meng-commit-nya. Frontend hanya memakai `anon` key. Operasi privileged lewat Edge Function.
6. Storage: bucket privat, path `org_id/project_id/...`, policy mengikuti organisasi dan role. Batasi tipe & ukuran file.
7. Tambahkan index untuk kolom filter/join (`organization_id`, `project_id`, `status`, kolom tanggal).
8. Setelah migrasi: regenerasi `src/types/database.types.ts`.
9. Perubahan data penting (RAB, PO, pembayaran, approval) harus tercatat di `audit_log` (trigger).
10. Uji isolasi tenant: akun organisasi A **tidak boleh** bisa membaca/menulis data organisasi B. Dokumentasikan hasil uji di `TASK.md`.

## 6. Keamanan

- Semua kredensial lewat env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Pertahankan `.env.example`; **jangan commit `.env*` asli**.
- Tidak ada API key, token, atau URL rahasia di source code.
- Tidak ada skrip/stylesheet dari CDN eksternal (kecuali font yang di-self-host atau di-bundle). Semua lewat npm/bundle.
- Validasi input di klien (Zod) **dan** di DB (constraint, check, FK).
- Sanitasi tampilan konten dari pengguna; jangan gunakan `dangerouslySetInnerHTML`.
- Upload: validasi MIME + ukuran, kompres gambar di klien sebelum upload.

## 7. UI/UX

- Ikuti `DESIGN.md` secara ketat: gunakan design token, komponen di `components/ui`, dan pola yang sudah ada. **Dilarang** menulis warna/ukuran ad-hoc (mis. `#123456`, `w-[437px]`) di komponen fitur.
- Setiap halaman wajib punya: loading skeleton, empty state, error state, dan tampilan mobile.
- Mobile-first: uji di lebar 360px dan 1280px sebelum menandai selesai.
- Teks UI dalam Bahasa Indonesia lewat kamus i18n, bukan string tersebar.

### 7A. Aturan Redesign shadcn-admin (berlaku selama Fase UI)

1. Redesign **hanya menyentuh tampilan**. Dilarang mengubah `supabase/`, `src/services/`, `src/lib/offline*`, skema/RLS, atau logika `AppContext` (kecuali adapter router di T-UI.B.1).
2. Semua pekerjaan di branch `redesign/shadcn-admin`, diverifikasi lewat Vercel Preview. Dilarang merge ke `main` tanpa persetujuan pengguna. T-5.12 (UAT/go-live) tidak boleh terblokir oleh redesign.
3. Komponen shadcn ditambah **hanya** lewat `npx shadcn@latest add <nama>` dengan alias `src/components/shadcn`. Dilarang menulis ulang komponen shadcn dari ingatan. Dilarang menimpa file di `src/components/ui/` (Windows tidak membedakan huruf besar/kecil: `button.tsx` akan menimpa `Button.tsx`).
4. Kode fitur mengimpor UI hanya lewat barrel `components/ui`. Penggantian implementasi dilakukan di balik barrel dengan wrapper kompatibel (API lama tetap jalan); satu komponen per commit.
5. Warna hanya lewat token (DESIGN §2.7). `text-muted` lama menjadi `text-muted-foreground` (T-UI.A.1); jangan memakai `bg-muted` sebelum T-UI.A.1 selesai.
6. Animasi hanya yang tercantum di DESIGN §2.6/§13, dengan `prefers-reduced-motion` dihormati. Dilarang menambah animasi di luar paritas tanpa persetujuan.
7. Satu halaman = satu commit + screenshot sebelum/sesudah (375 dan 1280px, light dan dark).
8. Halaman offline-kritis (Laporan Lapangan, SDM/Absensi, upload foto) wajib diuji ulang dalam mode offline setelah diubah.

## 8. PWA & Offline

- Manifest + service worker harus tetap valid dan lolos Lighthouse PWA.
- Fitur yang wajib offline-capable: Laporan Harian, Absensi, upload foto lapangan (antrian + sinkron otomatis).
- Tampilkan indikator online/offline/sinkron. Tangani konflik sinkron secara eksplisit (last-write-wins dengan penanda, atau tanya pengguna).
- Jangan cache respons berisi data sensitif tanpa strategi invalidasi saat logout.

## 9. Alur Kerja Agent

1. Ambil **satu** task (ID) dari `TASK.md` — urutan teratas yang belum selesai, kecuali diarahkan lain.
2. Pecah kecil. Kerjakan hanya cakupan task itu. **Dilarang scope creep**, refactor besar tak diminta, atau "sekalian memperbaiki" hal lain. Temuan lain dicatat di `TASK.md` bagian *Backlog/Temuan*.
3. Implementasi → jalankan: `npm run typecheck`, `npm run lint`, `npm run build` (dan `npm test` bila ada). Semua harus lulus.
4. Verifikasi manual alur utama di mobile & desktop.
5. Perbarui `TASK.md`: centang `[x]`, isi tanggal & catatan singkat, tulis keputusan penting.
6. Commit kecil dan bermakna (lihat §10).
7. Lapor ringkas: apa yang selesai, file yang berubah, cara menguji, risiko/hal yang perlu keputusan.

**Berhenti dan bertanya** bila: requirement ambigu/bertentangan, perlu mengubah tech stack atau skema inti, menyentuh keamanan/RLS secara signifikan, atau task jauh lebih besar dari perkiraan.

## 10. Git

- Branch: `feat/<id-task>-<slug>`, `fix/...`, `chore/...`.
- Commit mengikuti Conventional Commits: `feat(proyek): tambah halaman detail proyek`.
- Satu task = satu atau beberapa commit kecil. Jangan commit file generated besar atau secret.

## 11. Definition of Done (per task)

- [ ] Sesuai acceptance criteria di `PRD.md` / `TASK.md`
- [ ] `typecheck`, `lint`, `build` lulus tanpa error
- [ ] Tanpa `any` tak beralasan, tanpa `console.log`, tanpa data dummy hard-coded
- [ ] RLS & migrasi benar (jika menyentuh DB); tipe database diregenerasi
- [ ] Loading / empty / error state ada; responsif 360px–1280px+
- [ ] Sesuai `DESIGN.md` (token, komponen, dark mode)
- [ ] Teks lewat i18n; format Rupiah/tanggal lewat helper
- [ ] (Task UI) screenshot sebelum/sesudah dilampirkan; `prefers-reduced-motion` dan mode offline diuji bila relevan
- [ ] `TASK.md` diperbarui

## 12. Daftar Larangan Ringkas

- Mengganti stack, menambah Firebase, atau memakai CDN
- Menaruh secret/`service_role` di klien atau repo
- Membuat tabel tanpa `organization_id` dan RLS
- Mengubah skema tanpa file migrasi
- Mengabaikan `DESIGN.md` atau menulis style ad-hoc
- Mengerjakan fitur fase berikutnya sebelum fase aktif selesai
- Menandai task selesai tanpa build/test lulus
- Menjalankan `shadcn add` ke `src/components/ui/` atau menimpa komponen yang ada
- Mengubah service, migrasi, RLS, atau antrean offline di dalam task UI
- Merge Fase UI ke `main` tanpa persetujuan pengguna
