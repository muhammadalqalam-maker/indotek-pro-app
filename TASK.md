# TASK — Indotek Pro

> Fase 0–6 dan seluruh Decision Log/Backlog lama ada di `docs/archive/TASK-fase0-6.md` (jangan dibaca kecuali diminta).
> File ini dijaga **≤ 10 KB**. Selesai satu fase UI → pindahkan baris selesainya ke arsip, sisakan satu baris ringkasan.
> Legenda: `[ ]` belum · `[~]` berjalan · `[x]` selesai · `[!]` ditunda/terblokir.

## Carry-over (bukan bagian redesign)

- [~] **T-5.12 UAT internal & go-live** (P0) — berjalan; **tidak boleh terblokir** oleh redesign.
- [!] **T-2.7 Impor/ekspor BOQ** — ditunda atas arahan pengguna (2026-10-20).
- [ ] **T-6.1–T-6.4** SaaS (paket langganan, onboarding mandiri, penagihan, super-admin) — backlog.

## Cara agent memilih task

- Ambil satu task ID dari `TASK.md`: pilih task aktif teratas yang belum selesai, kecuali pengguna mengarahkan lain. Kerjakan hanya task tersebut.
- Jika requirement task ambigu atau bertentangan, berhenti dan minta arahan sebelum melanjutkan.

## Aturan Fase UI

- Branch `redesign/shadcn-admin`; verifikasi via Vercel Preview; **merge ke `main` hanya atas persetujuan pengguna**.
- Hanya tampilan. Dilarang menyentuh `supabase/`, `src/services/`, `src/lib/offline*`, RLS, atau logika `AppContext` (kecuali T-UI.B.1).
- Aturan lengkap: `AGENTS.md` §7A. Spesifikasi: `DESIGN.md` §2.6, §2.7, §3, §13.
- **DoD tiap task UI:** `typecheck` + `lint` + `build` + `npm test` lulus · e2e/visual dibandingkan baseline · 375/768/1280px, light & dark · `prefers-reduced-motion` diuji · screenshot sebelum/sesudah · `TASK.md` diperbarui.

## FASE UI-0 — Persiapan

- [x] **T-UI.0.1** Buat branch; tambahkan baseline screenshot Playwright (375/768/1280, light/dark) untuk setiap tab di `NAVIGATION_MODULES` (mode demo). — 2026-10-26 — Branch redesign sudah aktif; baseline 15 tab (90 screenshot) dan `npm run e2e:visual` lulus dua kali berturut-turut. Typecheck, lint, build, 198 unit test, dan 5 e2e lulus.
- [x] **T-UI.0.2** Audit shadcn-admin v2.x: clone referensi `v2.2.1` di luar repo; rekam interaksi desktop/mobile; dokumentasikan perilaku, timing, kelas dan batasan source di `docs/ui/shadcn-admin-parity.md`; isi temuan *Audit* di DESIGN §13 dan nilai motion §2.6. — 2026-10-26 — Rekaman dan source tag dipertahankan di luar repo; semua baris Audit terisi.
- [x] **T-UI.0.3** Keputusan pengguna D-UI-1 dan persetujuan D-UI-2…4 dicatat di Decision Log. — 2026-10-26 — Semua keputusan disetujui; D-UI-1 memilih identitas netral seperti template.

## FASE UI-A — Fondasi (tampilan tidak boleh berubah)

- [x] **T-UI.A.1** Tabrakan token `muted`: tambahkan `--color-muted-foreground`, migrasikan kelas teks lama, lalu petakan `--color-muted` ke `--surface-2`. — 2026-10-26 — 594 kelas di 131 file; tidak ada sisa kelas lama atau perubahan baseline visual.
- [x] **T-UI.A.2** Pasang `tw-animate-css` (import di `index.css`) dan `class-variance-authority`. — 2026-10-26 — Dialog memakai fade + zoom; animasi masuk/keluar diverifikasi di browser (konten 200ms, overlay 150ms); typecheck, lint, build, unit test, e2e, dan baseline visual lulus.
- [x] **T-UI.A.3** Token bridge di `index.css` sesuai DESIGN §2.7 (`@theme inline`, light + `.dark`), tanpa menambah warna atau menimpa radius. — 2026-10-26 — Primary dark (`#E8EDF5` pada `#0B1220`) kontras 15.93:1; typecheck, lint, build, unit test, dan 15 baseline visual lulus.
- [x] **T-UI.A.4** Konfigurasikan `components.json` (`ui` → `@/components/shadcn`, CSS `src/index.css`, `cssVariables: true`). — 2026-10-27 — `shadcn info` memvalidasi alias; `add separator` membuat file hanya di `components/shadcn`, lalu dihapus. Tidak ada file di `components/ui/` yang berubah; typecheck, lint, build, unit test, e2e, dan 15 baseline visual lulus.
- [x] **T-UI.A.5** Terapkan aturan global `prefers-reduced-motion` dan putuskan nasib paket `motion`. — 2026-10-27 — Motion dibuang karena tidak memiliki import source; durasi animasi/transisi dipersingkat global dan diuji di browser dengan `reduce`.

## FASE UI-B — Router (adapter)

- [x] **T-UI.B.1** Route 1:1 dari tab (PRD §5.1) dengan React Router v7. `activeTab` diturunkan dari URL, `setActiveTab` memanggil `navigate`; `/?tab=` diarahkan; detail proyek ke `/projects/:projectId`. *Selesai bila:* 198 referensi `activeTab` tidak perlu diubah dan semua alur lama tetap jalan. — 2026-10-27 — Adapter terhubung ke 15 route, shortcut lama diarahkan, detail proyek dapat dibuka langsung/di-refresh; 18 tes visual (termasuk route refresh) lulus.
- [x] **T-UI.B.2** Guard izin per route, halaman 403/404, gate auth/onboarding tetap di luar router, cek `navigateFallback` PWA offline + rewrite Vercel. *Selesai bila:* refresh di setiap route berhasil, termasuk offline. — 2026-10-27 — Guard memakai izin modul yang sudah ada; auth/onboarding tetap sebelum route view. 403/404 responsif dengan snapshot light/dark; Workbox offline fallback dan rewrite Vercel terverifikasi. Unit, 8 e2e, 21 visual, PWA offline, typecheck, lint, build lulus.
- [x] **T-UI.B.3** Perilaku Back/Forward dan restorasi scroll. *Selesai bila:* gestur Back di PWA Android terpasang kembali ke halaman sebelumnya, tidak menutup app. — 2026-10-27 — Shell memakai scroll viewport; navigasi baru mulai dari atas dan Back/Forward memulihkan posisi per entri history. Browser test lulus; swipe pada perangkat Android terpasang tetap perlu verifikasi perangkat.

## FASE UI-C — Shell

- [x] **T-UI.C.1** `shadcn add` untuk sidebar, sheet, tooltip, separator, collapsible, scroll-area, avatar, breadcrumb, dropdown-menu, skeleton. *Selesai bila:* tidak ada file di `components/ui/` yang tertimpa. — 2026-10-27 — CLI membuat 10 komponen dan Button/Input pendukung di `components/shadcn`; memakai helper `cn` dan token warna yang tersedia. Baseline visual tidak berubah; tidak ada file `components/ui/` tertimpa.
- [x] **T-UI.C.2** `AppSidebar` baru: grup menu dari konfigurasi yang ada, filter `<Can>`, `collapsible="icon"`, Rail, `Ctrl/Cmd+B`, status tersimpan, link via router. — 2026-10-27 — Sidebar shadcn menggantikan navigasi desktop/tablet; mobile lama dipertahankan untuk C.4. Preferensi tersimpan di cookie, default tablet ikon, navigasi dan filter izin diuji. Baseline visual diperbarui; typecheck, lint, build, 198 unit, 8 e2e, 23 visual lulus.
- [x] **T-UI.C.3** Header: breadcrumb berbasis route, org switcher, pemilih proyek, notifikasi, toggle tema (kunci `indotek_theme` dipertahankan), tombol command palette, bayangan saat scroll. — 2026-10-27 — Breadcrumb mengikuti route termasuk detail proyek; selector organisasi/proyek, notifikasi dan toggle tema tetap berfungsi; tombol command palette tersedia di mobile dan desktop; bayangan aktif setelah konten digulir >10px. Typecheck, lint, build, 198 unit, 8 e2e, 24 visual lulus pada 375/768/1280 light/dark.
- [x] **T-UI.C.4** Mobile: pertahankan bottom nav + FAB; sidebar sebagai sheet lewat "Menu"; safe-area; target sentuh ≥ 44px. — 2026-10-27 — Menu membuka shadcn Sidebar Sheet dengan pemilih proyek dan tautan navigasi; sidebar lama dilepas dari shell, tombol keluar tetap tersedia di sheet untuk sesi live. Header diringkas (65px pada viewport uji), safe-area tetap diterapkan, target sentuh diuji, breakpoint 639/640 diverifikasi. Typecheck, lint, build, 198 unit, 8 e2e, 25 visual lulus.
- [x] **T-UI.C.5** Hapus `Sidebar`/`TopNavbar` lama **setelah** paritas dikonfirmasi pengguna. — 2026-10-27 — `Sidebar.tsx` lama dihapus; header aktif dipindahkan menjadi `AppHeader` tanpa perubahan perilaku. Tidak ada referensi tersisa ke `TopNavbar`/`Sidebar` lama. Typecheck, lint, build, unit test, 8 e2e, dan 25 visual lulus; baseline visual tetap cocok.

## FASE UI-D — Lapisan animasi

- [ ] **T-UI.D.1** Dialog, AlertDialog, Sheet (3 sisi), Tooltip, Select, Dropdown, Popover sesuai DESIGN §2.6 (Sheet dan Tooltip saat ini tanpa animasi).
- [ ] **T-UI.D.2** Toast dan Command Palette beranimasi; keputusan Sonner vs Toast kustom dicatat.
- [ ] **T-UI.D.3** Grup menu (chevron + tinggi), Tabs, hover/fokus baris dan tombol, fallback skeleton antar route; progress bar navigasi bila terbukti ada di audit.
- [ ] **T-UI.D.4** QA motion: reduced-motion, tanpa layout shift, uji di HP Android kelas menengah. Catat temuan jank terkait `AppContext` ke Backlog (jangan direfaktor di sini).

## FASE UI-E — Komponen & halaman

- [ ] **T-UI.E.1** Ganti implementasi di balik barrel, **satu komponen per commit**, dengan wrapper kompatibel (`primary`→`default`, `md`→default, prop `loading`): Button, Card, Badge, Input, Select, Checkbox, Switch, Tabs, Dialog, Sheet, Tooltip, Toast. *Selesai bila:* 81 file konsumen lolos `typecheck` tanpa diubah.
- [ ] **T-UI.E.2** Pola halaman: `PageHeader`/`PageShell`, empty/loading/error/offline/403 (DESIGN §5), pola tabel `@tanstack/react-table` (state di URL, filter facet, toolbar aksi massal, kartu di mobile).
- [ ] **T-UI.E.3** Dashboard (ikut perbaiki chart yang melebihi 360px).
- [ ] **T-UI.E.4** Daftar & detail proyek.
- [ ] **T-UI.E.5** Approval dan Dokumen.
- [ ] **T-UI.E.6** Pengadaan, Gudang, Subkontraktor, Peralatan.
- [ ] **T-UI.E.7** Laporan Lapangan, SDM/Absensi, K3/Mutu — **offline-kritis**, uji ulang mode offline.
- [ ] **T-UI.E.8** Keuangan.
- [ ] **T-UI.E.9** RAB/BOQ/AHSP — **paling akhir**, paling sensitif; bandingkan angka sebelum/sesudah untuk data uji yang sama.
- [ ] **T-UI.E.10** Laporan, Pengaturan, Auth, onboarding organisasi.

## FASE UI-F — Pengerasan

- [ ] **T-UI.F.1** Codemod ±749 kelas warna hard-coded ke token; daftar pengecualian bila ada.
- [ ] **T-UI.F.2** Aksesibilitas, Lighthouse PWA, ukuran bundle sebelum/sesudah (peringatan chunk >500 kB tidak boleh bertambah).
- [ ] **T-UI.F.3** Hapus kode mati (Sidebar lama, `DataTable` lama bila tak dipakai, paket Radix tak terpakai); finalisasi DESIGN §13.
- [ ] **T-UI.F.4** Uji PWA terpasang di HP asli (safe-area, bottom nav, Back); siapkan rilis menunggu persetujuan merge.

## Decision Log — Fase UI

| ID | Keputusan | Status |
|---|---|---|
| D-UI-1 | Identitas visual: netral seperti template shadcn-admin | Disetujui — 2026-10-26 |
| D-UI-2 | Router: React Router v7 + adapter (bukan TanStack Router) | Disetujui — 2026-10-26 |
| D-UI-3 | Dependensi UI: `tw-animate-css`, `class-variance-authority`, `@tanstack/react-table`, paket Radix tambahan; Sonner opsional | Disetujui — 2026-10-26 |
| D-UI-4 | Komponen shadcn di `src/components/shadcn/`; barrel `components/ui` sebagai satu-satunya titik impor | Disetujui — 2026-10-26 |
| D-UI-5 | Paket `motion` dihapus; tidak ada import source, animasi memakai CSS dan `tw-animate-css` | Disetujui — 2026-10-27 |

## Backlog / Temuan (Fase UI)

- `AppContext.tsx` (±1.425 baris) me-render ulang seluruh app per perubahan state; pecah setelah redesign selesai (task terpisah).
