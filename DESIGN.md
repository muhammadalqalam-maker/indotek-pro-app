# DESIGN.md — Design System Indotek Pro

Sumber kebenaran **tampilan & interaksi**. Semua UI wajib memakai token dan pola di sini. Dilarang menulis warna/ukuran/bayangan ad-hoc di komponen fitur.

> **Referensi visual & interaksi:** [shadcn-admin](https://shadcn-admin.netlify.app/) (v2.x). Paritasnya dilacak di §13; penyimpangan yang disengaja (identitas brand, mobile lapangan, offline) tercatat di sana.

## 1. Karakter Visual

**Modern, bersih, elegan, tepercaya** — seperti SaaS premium dengan identitas netral ala shadcn-admin, whitespace lega, hierarki jelas, dan data padat yang tetap terbaca. Tidak ramai, tidak norak, tanpa gradien berlebihan.

Prinsip:
1. **Kejelasan > dekorasi.** Setiap elemen punya fungsi.
2. **Konsisten.** Pola sama untuk hal sama.
3. **Mobile-first.** Dirancang dari 360px, lalu diperluas.
4. **Cepat dipindai.** Angka penting besar, label kecil & redup.
5. **Ramah lapangan.** Target sentuh besar, kontras tinggi, bisa dipakai satu tangan.

## 2. Design Tokens

Implementasi sebagai CSS variables di `:root` dan `.dark`, dipetakan ke Tailwind v4 lewat `@theme inline` di `src/index.css` (CSS-first, tanpa `tailwind.config`). Komponen hanya memakai token semantik (mis. `bg-surface`, `text-muted-foreground`), bukan hex.

### 2.1 Warna Kontekstual yang Tersedia
| Token | Light | Dark | Pemakaian |
|---|---|---|---|
| `--primary-50` | `#EFF4FB` | — | tint untuk visualisasi/konteks domain |
| `--primary-100` | `#DCE7F6` | — | hover pada visualisasi/konteks domain |
| `--primary-500` | `#2B5C9E` | `#5B8FD6` | seri grafik atau konteks domain |
| `--primary-600` | `#1E4A85` | `#4A7DC4` | variasi warna visualisasi |
| `--primary-700` | `#163A6A` | — | variasi warna visualisasi |
| `--primary-900` | `#0F2A4A` | — | konteks brand lama; bukan warna sidebar/header |
| `--accent-400` | `#FBBF24` | `#FBBF24` | highlight visualisasi |
| `--accent-500` | `#F59E0B` | `#F59E0B` | seri grafik atau konteks domain |
| `--accent-600` | `#D97706` | `#D97706` | variasi warna visualisasi |

Palet kontekstual di atas tidak mendominasi shell dan kontrol umum; pemetaan visual netral untuk tombol primer dan sidebar mengikuti §2.7. Token warna tersebut tetap tersedia untuk visualisasi atau konteks domain yang memerlukannya.

### 2.2 Netral & Permukaan
| Token | Light | Dark |
|---|---|---|
| `--bg` (latar halaman) | `#F6F7F9` | `#0B1220` |
| `--surface` (kartu) | `#FFFFFF` | `#111A2B` |
| `--surface-2` (nested/hover) | `#F1F3F6` | `#17223A` |
| `--border` | `#E3E7ED` | `#243049` |
| `--border-strong` | `#CBD2DC` | `#33425F` |
| `--text` | `#0F172A` | `#E8EDF5` |
| `--text-muted` | `#5B6676` | `#9AA7BD` |
| `--text-subtle` | `#8A94A6` | `#6F7C93` |

### 2.3 Warna Semantik
| Status | Fg | Bg tint (light) |
|---|---|---|
| Success | `#15803D` | `#E8F6EC` |
| Warning | `#B45309` | `#FEF3C7` |
| Danger | `#B91C1C` | `#FDECEC` |
| Info | `#1D4ED8` | `#E6EEFF` |
| Neutral | `#475569` | `#EEF1F5` |

Di dark mode gunakan tint transparan (`color/15`) di atas surface. Status **tidak boleh** hanya dibedakan warna: sertakan ikon atau teks.

### 2.4 Tipografi
- Font: **Plus Jakarta Sans** (utama) dengan fallback **Inter**, `system-ui`, sans-serif. Self-host / bundle via npm (`@fontsource`), **bukan CDN**.
- Angka tabular (`font-variant-numeric: tabular-nums`) untuk semua angka uang/volume di tabel.

| Peran | Ukuran / Line-height | Berat |
|---|---|---|
| Display (angka KPI) | 28–32 / 1.2 | 700 |
| H1 halaman | 24 / 1.3 | 700 |
| H2 seksi | 18 / 1.35 | 600 |
| H3 kartu | 16 / 1.4 | 600 |
| Body | 14 / 1.5 | 400 |
| Body-lg (mobile input) | 16 / 1.5 | 400 |
| Caption/label | 12 / 1.4 | 500 |

Input di mobile minimal 16px (mencegah zoom otomatis iOS).

### 2.5 Spasi, Radius, Bayangan
- Skala spasi: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 (kelipatan 4).
- Radius: `sm 6` (badge/input kecil), `md 10` (input/tombol), `lg 14` (kartu), `xl 20` (modal/sheet), `full` (avatar/pill).
- Bayangan (halus): `shadow-xs` (kartu), `shadow-sm` (dropdown), `shadow-md` (modal), `shadow-lg` (sheet mobile). Di dark mode kurangi bayangan, andalkan border.
- Container konten maks `1440px`; padding halaman 16 (mobile) / 24 (tablet) / 32 (desktop).

### 2.6 Z-index & Motion
- Z-index: base 0 · sticky 20 · sidebar 30 · dropdown 40 · modal 50 · toast 60.
- Default transisi Tailwind: 150ms, `cubic-bezier(.4,0,.2,1)`; gunakan nilai khusus per komponen sesuai tabel. Durasi 150ms untuk kelas animasi `tw-animate-css` tanpa modifier, easing `ease`.
- Hormati `prefers-reduced-motion`: persingkat animasi/transisi non-esensial dan nonaktifkan scroll halus.

**Spesifikasi motion** (diaudit terhadap source shadcn-admin v2.2.1; detail dan batasan ada di [laporan paritas](docs/ui/shadcn-admin-parity.md)):

| Elemen | Efek | Masuk / Keluar | Easing |
|---|---|---|---|
| Dialog, AlertDialog | overlay fade; konten fade + zoom 95→100 | konten masuk/keluar 200ms; overlay default 150ms | `ease` default |
| Sheet (kiri/kanan/atas/bawah) | slide dari tepi; overlay fade | panel masuk 500ms / keluar 300ms; overlay default 150ms | `ease-in-out` panel; overlay `ease` |
| Dropdown, Popover, Select, Tooltip | fade + zoom + slide 8px (`slide-*-2`) | 150ms / 150ms | `ease` default |
| Sidebar collapse/expand | lebar 16rem↔3rem (gap varian inset/floating terpisah) | 200ms | `linear` |
| Grup menu (Collapsible) | tinggi; chevron berputar terpisah | tinggi 300ms; chevron 200ms | tinggi `ease-out`; chevron default transisi |
| Toast | opacity + translateY dari/ke atas | 400ms masuk/keluar | `ease`; 0.01ms saat reduced-motion |
| Command Palette | instan; tidak dianimasikan karena shortcut Ctrl/Cmd+K berfrekuensi tinggi | 0ms | — |
| Progress navigasi route | indikator indeterminate bergerak dengan `translateX` saat route chunk menampilkan Suspense fallback | 1000ms berulang; statis saat reduced-motion | `linear` |
| Hover/fokus (tombol, baris, tab) | transisi warna/bayangan bila kelas `transition` digunakan | default 150ms | `cubic-bezier(.4,0,.2,1)` |
| Skeleton | pulse | 2s berulang | `cubic-bezier(.4,0,.6,1)` |

Tanpa animasi pada properti layout berat (`width`/`height` pada daftar panjang) selain yang di tabel. Di bawah `prefers-reduced-motion: reduce`, durasi animasi/transisi dibatasi menjadi `0.01ms`, delay dihapus, iterasi dibatasi satu kali, dan scroll halus dinonaktifkan.

Sidebar mempertahankan transisi lebar sesuai tabel; rail hanya mentransisikan posisi/transform yang dipakai. Shell konten tidak memakai `transition-all` atau tween margin tambahan saat breakpoint berubah.

### 2.7 Pemetaan Token shadcn ↔ Indotek

Komponen shadcn memakai token semantik. Token itu **dipetakan ke token Indotek yang sudah ada**, tidak menambah warna baru.

| Token shadcn | Sumber (light / dark mengikuti token §2) |
|---|---|
| `--background` / `--foreground` | `--bg` / `--text` |
| `--card`, `--popover` (+ `-foreground`) | `--surface` / `--text` |
| `--primary` (+ `-foreground`) | `--text` + `--bg` (netral pada light dan dark) |
| `--secondary`, `--muted`, `--accent` | `--surface-2` (`accent` shadcn = latar hover, **bukan** amber brand) |
| `--muted-foreground` | `--text-muted` |
| `--destructive` | `--danger` |
| `--border` / `--input` / `--ring` | `--border` / `--border-strong` / `--text-muted` |
| `--sidebar*` | light/dark: latar `--surface`, teks `--text`, item aktif `--surface-2` + `--text`; tanpa penanda amber (D-UI-1) |
| `--chart-1..5` | `primary-500`, `accent-500`, `success`, `danger`, `neutral` |

Implementasi bridge di `src/index.css` memetakan token ini lewat `@theme inline`; sumber warna tetap variabel yang sama pada `:root` dan `.dark`. Untuk primary dark, foreground `--text` (`#E8EDF5`) pada background `--bg` (`#0B1220`) memiliki kontras **15.93:1** (WCAG), di atas ambang 4.5:1. Amber brand tetap `accent-400/500/600` (bernomor), berdampingan dengan `accent` shadcn (tanpa nomor). Radius tetap §2.5 (`sm 6 / md 10 / lg 14 / xl 20`); jangan menimpa lewat `--radius`. Gunakan `text-muted-foreground` untuk teks sekunder; `bg-muted` dipetakan ke `--surface-2`.

## 3. Layout & Navigasi

### 3.1 Desktop (≥ 1024px)
- **Sidebar kiri** (`AppSidebar`, komponen shadcn `Sidebar`, `collapsible="icon"`): 256px expanded, 72px rail ikon, grup menu bisa dilipat, `Ctrl/Cmd+B` untuk toggle, status tersimpan. Latar netral `--surface`, teks `--text`, item aktif `--surface-2` (D-UI-1).
- **Top bar** (`AppHeader`) 64px (bayangan tipis saat konten di-scroll): breadcrumb berbasis route, **pemilih proyek**, pencarian global (`Ctrl/Cmd+K` command palette), notifikasi, toggle tema, menu profil.
- Area konten dengan header halaman (judul, deskripsi singkat, aksi utama di kanan).

### 3.2 Tablet (640–1023px)
- Sidebar collapsed (ikon) default; konten 2 kolom bila perlu.

### 3.3 Mobile (< 640px)
- **Bottom navigation** 5 item maks: Beranda, Proyek, + (aksi cepat), Tugas/Approval, Menu. Tinggi 64px + safe-area.
- **FAB / aksi cepat** (warna aksen): Laporan Harian, Foto, Permintaan Material, Absensi.
- **Drawer/sheet** untuk menu lengkap, filter, dan pemilih proyek.
- Header ringkas 56px dengan judul, tombol kembali, aksi utama.
- Tabel → **card list**; aksi sekunder via menu titik tiga atau swipe.
- Hormati safe-area (`env(safe-area-inset-*)`).

## 4. Komponen Inti (di `components/ui`)

Semua berbasis Radix + Tailwind, varian lewat `cva`. Komponen baru berasal dari shadcn CLI ke `components/shadcn/`; kode fitur mengimpor lewat barrel `components/ui/index.ts` (AGENTS §7A).

- **Button:** `primary`, `secondary`, `outline`, `ghost`, `destructive`, `accent`; ukuran `sm 32 / md 40 / lg 48`; state loading (spinner, disable). Mobile target ≥ 44px.
- **Input/Textarea/Select/Combobox/DatePicker/NumberInput/CurrencyInput (Rp):** label di atas, helper text, error inline berwarna danger + ikon, prefix/suffix.
- **Checkbox, Radio, Switch, Tabs, Accordion, Tooltip, Popover, Dropdown Menu.**
- **Sidebar, Breadcrumb, Collapsible, Command, Sheet (kiri/kanan/bawah)** dari shadcn.
- **Dialog/Modal** (desktop) & **Bottom Sheet** (mobile) dengan komponen adaptif yang sama.
- **Card:** padding 16/20, border `--border`, radius `lg`, `shadow-xs`.
- **Badge/StatusPill:** warna semantik + ikon kecil.
- **Avatar & AvatarGroup**, **Progress bar**, **Stepper** (alur approval), **Timeline** (aktivitas).
- **Toast** (sukses/error/info) — posisi kanan-atas desktop, atas tengah mobile.
- **Skeleton, EmptyState, ErrorState, ConfirmDialog.**
- **DataTable:** sort, filter, pencarian, pagination server-side, pilih kolom, density, ekspor, baris dapat dipilih; header sticky; di mobile jadi `CardList`.
- **KPI Card:** label kecil, angka Display, delta (▲/▼ + warna), sparkline opsional.
- **Chart (Recharts):** palet dari token (primary, accent, success, danger, neutral), sumbu halus, tooltip konsisten, legenda jelas; skema warna ramah buta warna.
- **FileUploader:** drag & drop, preview, progres, kompres gambar, status antrian offline.
- **SignaturePad**, **PhotoGrid** (galeri laporan lapangan), **GanttView**, **KurvaSChart**.
- **OfflineBanner & SyncIndicator:** pill status `Online`, `Offline`, `Menyinkronkan (n)`, `Gagal sinkron`.
- **InstallPrompt** PWA (Android) & panduan A2HS (iOS).

## 5. Pola Halaman

### 5.1 Struktur halaman standar
`PageHeader` (judul + deskripsi + aksi) → filter bar → konten (KPI / tabel / kartu) → footer aksi (bila form).

### 5.2 Daftar (List)
Pencarian + filter chip di atas, tabel/card list, pagination, aksi massal bila perlu. Empty state menyertakan ilustrasi ringan + CTA ("Buat proyek pertama").

### 5.3 Detail
Header entitas (nama, status pill, metadata utama, aksi), lalu **Tabs** untuk seksi. Di mobile tab bisa scroll horizontal.

### 5.4 Form
- Satu kolom di mobile; 2 kolom di desktop untuk form panjang, dikelompokkan dalam kartu bertajuk.
- Validasi inline saat blur & saat submit; ringkasan error bila banyak.
- Tombol aksi sticky di bawah pada mobile.
- **Autosave draft** untuk form panjang (laporan harian).
- Konfirmasi sebelum meninggalkan halaman bila ada perubahan belum disimpan.

### 5.5 State wajib di setiap halaman
1. **Loading:** skeleton yang meniru bentuk konten (bukan spinner penuh layar).
2. **Empty:** pesan membantu + CTA.
3. **Error:** pesan manusiawi + tombol "Coba lagi".
4. **Offline:** banner + fungsi yang tetap tersedia.
5. **Tidak berizin:** halaman 403 yang ramah, bukan layar kosong.

## 6. Konten & Microcopy (Bahasa Indonesia)

- Nada: jelas, sopan, singkat, aktif. Hindari jargon berlebih; pakai istilah industri yang umum (RAB, BOQ, SPK, termin, opname).
- Tombol berupa kata kerja: "Simpan", "Ajukan Approval", "Tambah Proyek", bukan "OK".
- Pesan error: apa yang terjadi + apa yang bisa dilakukan. Contoh: "Gagal menyimpan laporan. Periksa koneksi lalu coba lagi."
- Format:
  - Uang: `Rp 1.250.000` (titik ribuan); ringkas di KPI: `Rp 1,25 M`, `Rp 350 Jt`.
  - Persen: `42,5%`. Tanggal: `18 Okt 2026`; lengkap `Minggu, 18 Oktober 2026`. Waktu 24 jam `14:30` + zona (WIB/WITA/WIT).
  - Volume: angka + satuan (`125,50 m³`).

## 7. Status & Warna Domain

| Domain | Status → warna |
|---|---|
| Proyek | Perencanaan (info) · Berjalan (primary) · Selesai (success) · Ditunda (warning) · Dibatalkan (neutral) |
| Approval | Menunggu (warning) · Disetujui (success) · Ditolak (danger) · Draf (neutral) |
| Progres vs rencana | Di depan/sesuai (success) · Terlambat ringan (warning) · Terlambat berat (danger) |
| Prioritas | Rendah (neutral) · Sedang (info) · Tinggi (warning) · Kritis (danger) |

## 8. Dark Mode

- Ikuti preferensi sistem + toggle manual (tersimpan).
- Gunakan token dark di §2; hindari hitam murni (`#000`) dan putih murni besar.
- Periksa kontras grafik, badge, dan border di kedua tema.

## 9. Aksesibilitas

- Kontras teks ≥ 4.5:1 (besar ≥ 3:1). Indikator fokus terlihat (ring `primary-500` 2px + offset).
- Semua kontrol dapat dioperasikan dengan keyboard; urutan tab logis; `Esc` menutup modal.
- Label ARIA untuk ikon-saja; `aria-live` untuk toast & status sinkron.
- Target sentuh ≥ 44×44px di mobile. Jangan mengandalkan warna saja.
- Dukung zoom teks hingga 200% tanpa layout rusak.

## 10. PWA Visual

- `theme_color`: `#0F2A4A`; `background_color`: `#F6F7F9`; `display: standalone`.
- Ikon: 192, 512, **maskable** 512; Apple touch icon 180. Logo: huruf "I" / monogram "IP" di atas navy dengan aksen amber.
- Splash: logo di tengah, latar navy.
- Halaman `offline` bermerek, dengan tombol "Coba lagi".

## 11. Do & Don't

**Do**
- Gunakan komponen & token yang ada; buat komponen baru bila pola berulang ≥ 3 kali.
- Rata kanan angka di tabel, tabular-nums, header kolom jelas.
- Beri umpan balik instan (optimistic UI, toast).
- Uji di 360px, 768px, 1280px+ dan kedua tema.

**Don't**
- Hex/pixel ad-hoc di komponen fitur; font/ikon dari CDN.
- Modal bertumpuk; tabel lebar yang memaksa scroll horizontal tanpa kontainer.
- Warna sebagai satu-satunya pembeda status.
- Animasi berat atau memblokir interaksi.
- Menampilkan angka mentah tanpa format (`1250000`).

## 12. Checklist Review UI (per halaman)

- [ ] Memakai token & komponen design system
- [ ] Loading / empty / error / offline / 403 tersedia
- [ ] Mobile (360px) dan desktop (≥1280px) rapi
- [ ] Dark mode benar
- [ ] Format Rupiah/tanggal/volume benar
- [ ] Keyboard & fokus baik; kontras lulus
- [ ] Microcopy Bahasa Indonesia, tombol berupa kata kerja

## 13. Paritas dengan shadcn-admin

Status: **Rencana** (dikerjakan di fase tertera) · **Disengaja** (beda dari template, dengan alasan) · **Audit** (isi dari T-UI.0.2, lalu ubah statusnya).

| Elemen | shadcn-admin | Indotek Pro | Status |
|---|---|---|---|
| Sidebar collapsible ke ikon | Ya | shadcn `Sidebar` | Selesai (UI-C.2) |
| Sidebar di mobile | Sheet | shadcn `Sidebar` sebagai Sheet **+ bottom nav + FAB** | Selesai (UI-C.4); bottom nav untuk akses lapangan |
| Grup menu bisa dilipat | Ya | Ya, dengan chevron | Selesai (UI-D.3) |
| Command palette ⌘K | Ya | Ada (kustom), instan | Disengaja (UI-D.2; shortcut berfrekuensi tinggi) |
| Animasi Dialog/Sheet/Dropdown/Popover/Select/Tooltip | Ya (`tw-animate-css`) | Belum efektif | Rencana (UI-A/D) |
| Toast | Sonner, masa tampil 5000ms; source tidak menetapkan timing animasi lokal | Toast kustom, masa tampil 5000ms, transisi opacity + translateY 400ms | Disengaja: pertahankan API yang sudah dipakai luas tanpa dependensi baru; animasi lokal sesuai §2.6 |
| Toggle tema | Ya | Ya (kunci `indotek_theme`) | Selesai (UI-C.3; kunci tetap dipertahankan) |
| Header: bayangan saat scroll, breadcrumb | Bayangan + blur setelah scroll >10px; breadcrumb komponen navigasi halaman | Breadcrumb route, pemilih organisasi/proyek, notifikasi, toggle tema, pencarian perintah, bayangan saat scroll >10px | Selesai (UI-C.3); perilaku referensi: [laporan](docs/ui/shadcn-admin-parity.md) |
| Progress bar saat pindah route | Bar 2px saat TanStack Router pending | Indikator indeterminate 2px hanya saat chunk route memunculkan Suspense fallback; skeleton tetap tampil | Selesai (UI-D.3); bukan indikator sinkronisasi |
| Tabel: state di URL, filter facet, toolbar aksi massal | Ya | Rencana | Rencana (UI-E) |
| Config drawer (varian layout/sidebar) | Ya | Tidak | Disengaja (di luar scope) |
| RTL | Ya | Tidak | Disengaja |
| Router | TanStack Router | React Router v7 | Disengaja (AGENTS §2) |
| Auth | Clerk (sebagian) | Supabase Auth | Disengaja |
| Ikon | Lucide | Lucide | Sama |
| Warna | Netral | Netral seperti template | Disetujui (D-UI-1) |
| Indikator offline/sinkron, FAB, target sentuh 44px | Tidak ada | Ada | Disengaja |

Komponen shadcn yang dimodifikasi dari versi CLI wajib dicatat di bawah tabel ini (nama, alasan, tanggal).

- Shell aktif menggunakan `AppSidebar` dan `AppHeader`; `Sidebar.tsx` legacy dihapus, sedangkan header aktif dipindahkan dari `TopNavbar.tsx` setelah paritas dikonfirmasi. — 2026-10-27
- Dialog, Sheet, dan Tooltip di balik barrel UI memakai animasi sesuai §2.6; AlertDialog, Popover, dan Select shadcn ditambahkan melalui CLI dengan timing motion yang sama. Tooltip memakai state Radix `delayed-open`/`instant-open`; native Select lama tetap memakai menu sistem hingga integrasi E.1. — 2026-10-27
- Komponen shell hasil `shadcn add` (Sidebar, Sheet, Tooltip, Separator, Collapsible, ScrollArea, Avatar, Breadcrumb, DropdownMenu, Skeleton, serta Button/Input pendukung) memakai helper `cn` yang sudah ada di `components/ui/utils`; import helper dan komponen saudara memakai path relatif agar Vite tetap menyelesaikannya di Windows dengan path workspace ber-spasi. Variabel warna sidebar bawaan generator dihapus agar seluruhnya mengikuti token §2.7. Sidebar memakai breakpoint `sm` (640px) agar konsisten dengan bottom nav; konten mobile meneruskan atribut aksesibilitas dan class aman-area ke Sheet. — 2026-10-27
- AppSidebar memakai Collapsible untuk grup navigasi (tinggi 300ms dan chevron 200ms); grup tetap terbuka pada mode rail ikon agar tautan tetap dapat diakses. `SidebarMenuButton` menambahkan transisi warna tanpa melepas transisi ukuran. Tabs, tombol, dan baris DataTable memakai transisi hover/fokus 150ms. Suspense route memakai skeleton token dan progress bar indeterminate berdasarkan temuan audit; bar hanya tampil saat pemuatan chunk, tidak saat sinkronisasi/offline. — 2026-10-29
- Button di balik barrel memakai primitive shadcn; wrapper menjaga varian `primary`/`accent`, ukuran `md`, dan prop `loading` agar konsumen lama tidak perlu diubah. — 2026-10-29
- Card di balik barrel memakai primitive shadcn; wrapper menjaga API `CardSection`, pilihan heading `CardTitle`, elemen paragraf `CardDescription`, dan padding desain lama. `CardTitle` shadcn menerima prop `as` untuk mempertahankan heading semantik. — 2026-10-29
- QA motion mengganti `transition-all` pada Button menjadi `transition-colors`, membatasi transisi SidebarRail ke posisi/transform, dan menghapus tween margin tak terpakai pada shell konten. — 2026-10-29
