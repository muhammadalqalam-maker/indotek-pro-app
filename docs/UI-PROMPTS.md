# Prompt Pack — Redesign shadcn-admin

Tempel **satu prompt per sesi agent**. Satu sesi = satu task (ID dari `TASK.md`). Jangan gabungkan fase.

## Prompt induk (dipakai di setiap sesi)

```
Baca AGENTS.md (terutama §7A), bagian aktif TASK.md, dan DESIGN.md (§2.6, §2.7, §3, §13).
Jangan membaca docs/archive/.

Kerjakan HANYA task: <ID>.

Batasan:
- Hanya tampilan. Jangan ubah supabase/, src/services/, src/lib/offline*, RLS, atau logika AppContext
  (kecuali task menyebut adapter router).
- Komponen shadcn hanya lewat `npx shadcn@latest add`, alias src/components/shadcn.
  Jangan menimpa file di src/components/ui/ (Windows: button.tsx menimpa Button.tsx).
- Kode fitur mengimpor UI hanya lewat barrel components/ui.
- Warna hanya lewat token. Tanpa dependensi baru di luar Decision Log.
- Jangan scope creep; temuan lain dicatat di Backlog TASK.md.

Selesai bila memenuhi "Selesai bila" task dan DoD Fase UI. Jalankan typecheck, lint, build, npm test,
lalu bandingkan visual dengan baseline. Perbarui TASK.md, commit kecil (Conventional Commits),
lalu laporkan: yang selesai, file berubah, cara uji, risiko. Berhenti setelah task ini.
```

## Fase UI-0

**T-UI.0.1**
```
Task: T-UI.0.1. Buat branch redesign/shadcn-admin. Tambahkan spec Playwright visual di e2e/visual/
yang membuka setiap tab di NAVIGATION_MODULES (mode demo), ambil screenshot 375/768/1280px, light & dark.
Tambah script `e2e:visual`. Jalankan dua kali berturut-turut; baseline harus stabil (nonaktifkan animasi
dan data acak saat screenshot). Jangan ubah kode aplikasi.
```

**T-UI.0.2** (kerjakan bersama saya/pengguna; agent membantu membaca source)
```
Task: T-UI.0.2. Clone satnaing/shadcn-admin ke folder DI LUAR repo (hanya referensi, jangan disalin ke repo).
Baca source layout, sidebar, header, dialog/sheet/dropdown, tabel, toast, dan CSS/tailwind terkait animasi.
Tulis docs/ui/shadcn-admin-parity.md: tabel elemen | perilaku | durasi/easing | kelas/sumber kode.
Perbarui kolom "Audit" di DESIGN.md §13 dan nilai tabel motion §2.6 dengan hasil nyata.
Jangan mengubah kode aplikasi.
```

## Fase UI-A

**T-UI.A.1**
```
Task: T-UI.A.1 (tabrakan token muted). Urutan wajib:
1) Tambah --color-muted-foreground: var(--text-muted) di @theme.
2) Tulis skrip scripts/codemod-muted.mjs: ganti kelas `text-muted` (termasuk dengan prefix varian seperti
   dark:, hover:, group-hover:, focus:, dan dengan modifier opasitas) menjadi `text-muted-foreground`.
   Jangan menyentuh `text-muted-foreground` yang sudah ada. Cetak laporan jumlah penggantian per file.
3) Jalankan skrip, lalu baru ubah --color-muted menjadi nilai --surface-2.
Verifikasi: 0 sisa `text-muted` lama (grep), build lulus, diff visual nol terhadap baseline.
```

**T-UI.A.2 – A.3**
```
Task: T-UI.A.2 lalu (sesi terpisah) T-UI.A.3. A.2: npm i tw-animate-css class-variance-authority;
tambahkan @import "tw-animate-css" di src/index.css; verifikasi di browser bahwa Dialog yang ada beranimasi
dan tidak ada regresi. A.3: tambahkan token semantik shadcn di index.css sesuai tabel DESIGN §2.7
(@theme inline, light + .dark). Jangan menambah warna baru, jangan menimpa radius. Catat kontras
primary dark (≥ 4.5:1) di DESIGN §13.
```

**T-UI.A.4 – A.5**
```
Task: T-UI.A.4 lalu (sesi terpisah) T-UI.A.5. A.4: buat components.json (alias ui -> @/components/shadcn,
css src/index.css, cssVariables true). Uji `npx shadcn@latest add separator`, pastikan file masuk
src/components/shadcn/ dan TIDAK ada file di src/components/ui/ yang berubah (git status), lalu hapus
bila tidak dipakai. A.5: tambahkan aturan global prefers-reduced-motion di index.css; periksa pemakaian
paket `motion` (0 import) dan usulkan hapus/pakai di Decision Log (jangan putuskan sendiri).
```

## Fase UI-B

**T-UI.B.1**
```
Task: T-UI.B.1 (adapter router; satu-satunya task yang boleh menyentuh AppContext, hanya bagian navigasi).
Gunakan react-router-dom v7 yang sudah terpasang. Buat src/routes/ berisi tabel route 1:1 dari tab
(PRD §5.1: id tab dengan "_" menjadi "-"). activeTab diturunkan dari pathname; setActiveTab memanggil
navigate. /?tab=<id> (shortcut PWA) diarahkan ke route baru. Detail proyek -> /projects/:projectId.
Jangan ubah 198 pemakai activeTab. Gate auth/onboarding tetap di luar router.
Uji: semua tab, refresh di tiap route, shortcut PWA, alur login.
```

**T-UI.B.2 – B.3**
```
Task: T-UI.B.2 lalu (sesi terpisah) T-UI.B.3. B.2: guard izin per route (pakai permission yang ada),
halaman 403/404, cek navigateFallback PWA dan rewrite Vercel; uji refresh tiap route termasuk offline.
B.3: pastikan Back/Forward bekerja (riwayat dibuat per pindah halaman), restorasi scroll; uji di PWA
terpasang Android bahwa gestur Back kembali ke halaman sebelumnya.
```

## Fase UI-C

**T-UI.C.1 – C.2**
```
Task: T-UI.C.1 lalu (sesi terpisah) T-UI.C.2. C.1: `npx shadcn@latest add sidebar sheet tooltip separator
collapsible scroll-area avatar breadcrumb dropdown-menu skeleton` (alias components/shadcn); cek
git status: tidak ada file di components/ui yang tertimpa. C.2: buat AppSidebar dari konfigurasi menu
yang ada, filter dengan <Can>, collapsible="icon" (256px / rail 72px), Rail, Ctrl/Cmd+B, status tersimpan,
link via router. Warna lewat --sidebar-* (D-UI-1). Jangan hapus Sidebar lama.
```

**T-UI.C.3 – C.5**
```
Task: T-UI.C.3, lalu C.4, lalu C.5 (sesi terpisah masing-masing). C.3: header baru (breadcrumb berbasis
route, org switcher, pemilih proyek, notifikasi, toggle tema dengan kunci indotek_theme, tombol command
palette, bayangan saat scroll). C.4: pertahankan MobileBottomNav + FAB, sidebar sebagai sheet lewat
"Menu", safe-area, target sentuh ≥ 44px; uji 360px. C.5: hapus Sidebar/TopNavbar lama HANYA setelah
pengguna mengonfirmasi paritas.
```

## Fase UI-D

**T-UI.D.1 – D.3**
```
Task: T-UI.D.1, lalu D.2, lalu D.3 (sesi terpisah). Terapkan animasi sesuai tabel DESIGN §2.6 dan
docs/ui/shadcn-admin-parity.md: Dialog/AlertDialog/Sheet(3 sisi)/Tooltip/Select/Dropdown/Popover (D.1);
Toast dan Command Palette (D.2); grup menu (chevron+tinggi), Tabs, hover/fokus, skeleton antar route,
progress bar navigasi bila ada di audit (D.3). Jangan menambah animasi di luar paritas.
Semua dimatikan/dipersingkat di bawah prefers-reduced-motion.
```

**T-UI.D.4**
```
Task: T-UI.D.4 (QA motion). Uji prefers-reduced-motion, pastikan tanpa layout shift, ukur kelancaran di
HP Android kelas menengah. Jika ada jank akibat re-render AppContext, CATAT di Backlog; jangan refaktor.
```

## Fase UI-E

**T-UI.E.1** (ulangi per komponen)
```
Task: T-UI.E.1, komponen: <Button|Card|Badge|...>. Ganti implementasi di balik barrel components/ui/index.ts
dengan versi shadcn dari components/shadcn, dibungkus wrapper kompatibel (API lama tetap: variant primary ->
default, size md -> default, prop loading, dst.). Satu komponen = satu commit. `npm run typecheck`
harus lulus tanpa mengubah file konsumen.
```

**T-UI.E.2**
```
Task: T-UI.E.2. Buat PageHeader/PageShell dan komponen state (empty/loading/error/offline/403) sesuai DESIGN §5.
Buat pola tabel dengan @tanstack/react-table: state filter/sort/paginasi di query string, filter facet,
toolbar aksi massal, tampilan kartu di mobile. Demonstrasikan pada satu halaman saja; halaman lain
dimigrasi di task masing-masing.
```

**T-UI.E.3 – E.10** (template per halaman)
```
Task: <ID halaman>. Migrasikan halaman <nama> ke pola E.2 dan komponen baru. Acuan visual:
docs/ui/reference/<halaman>.png (screenshot shadcn-admin) dan DESIGN.md. Pertahankan seluruh perilaku,
validasi, izin, dan alur data yang ada. Lampirkan screenshot sebelum/sesudah (375 & 1280px, light & dark).
Khusus halaman offline-kritis (E.7): uji ulang mode offline dan sinkron. Khusus RAB (E.9): bandingkan
angka sebelum/sesudah untuk data uji yang sama.
```

## Fase UI-F

```
Task: <T-UI.F.x>. F.1: skrip codemod warna hard-coded -> token (±749), lengkap dengan laporan dan
daftar pengecualian. F.2: audit aksesibilitas, Lighthouse PWA, bandingkan ukuran bundle sebelum/sesudah.
F.3: hapus kode mati (Sidebar lama, DataTable lama bila tak dipakai, paket tak terpakai) dan finalisasi
DESIGN §13. F.4: siapkan catatan rilis; JANGAN merge ke main tanpa persetujuan pengguna.
```
