# Audit paritas shadcn-admin

## Referensi dan metode

- Versi sumber: `v2.2.1`, commit `0217f8cb73af66f3cbf4141d5e0d00e1c5c30434`.
- Repositori: [satnaing/shadcn-admin](https://github.com/satnaing/shadcn-admin), lisensi MIT; clone referensi berada di `D:\Aplikasi 2\shadcn-admin-reference` dan tidak termasuk repo aplikasi.
- Demo yang diuji: [shadcn-admin.netlify.app](https://shadcn-admin.netlify.app/). Commit deploy demo tidak dapat diverifikasi, jadi perilaku yang terlihat di demo tidak dijamin identik dengan tag sumber.
- Rekaman Chromium: desktop (sidebar, tema, konfigurasi, command palette) dan mobile (sheet navigasi) dihasilkan dari dua uji Playwright yang lulus. Viewport mobile rekaman 390px; baseline aplikasi Indotek 375/768/1280px berada di rangkaian visual terpisah.
- Durasi dan kelas di bawah diverifikasi dari source tag. Kelas animasi yang tidak menetapkan durasi/easing menggunakan default `tw-animate-css` 1.4.0 (`150ms`, `ease`).

Rekaman tersimpan di luar repo aplikasi:

- `D:\Aplikasi 2\shadcn-admin-reference\audit-recordings\desktop-sidebar-theme-command.webm`
- `D:\Aplikasi 2\shadcn-admin-reference\audit-recordings\mobile-sidebar-sheet.webm`

## Temuan

| Elemen | Perilaku yang diamati | Durasi / easing | Kelas atau source |
|---|---|---|---|
| Sidebar desktop | Lebar penuh 16rem, mode ikon 3rem. `Ctrl/Cmd+B` toggle; pilihan disimpan pada cookie `sidebar_state` selama 7 hari. Varian inset/floating menambah ruang di sekitar rail. | 200ms, `ease-linear` | `src/components/ui/sidebar.tsx`: `transition-[width]`, `transition-[inset-inline,width]`, `duration-200 ease-linear`; `SidebarProvider` |
| Navigasi mobile | Sidebar tampil sebagai Sheet dari kiri; memilih tautan menutup sheet. Lebar mobile default 18rem. | Panel masuk 500ms, keluar 300ms, `ease-in-out`; overlay memakai default 150ms `ease` | `src/components/ui/sidebar.tsx`; `src/components/ui/sheet.tsx`: `slide-in-from-start`, `slide-out-to-start`, `data-[state=open]:duration-500`, `data-[state=closed]:duration-300` |
| Grup navigasi | Grup bertingkat dapat dibuka/tutup; grup yang memuat tautan aktif terbuka. Chevron berputar terpisah dari animasi tinggi konten. | Tinggi 300ms `ease-out`; chevron 200ms dengan easing transisi standar | `src/styles/index.css`; `src/components/layout/nav-group.tsx` |
| Command palette | `Ctrl/Cmd+K` membuka/menutup palette; input mencari perintah/navigasi. Demo diuji bersama perubahan tema dan navigasi desktop. | Durasi/transisi tidak ditetapkan oleh provider; tidak ada nilai lokal untuk dicatat | `src/context/search-provider.tsx`; `src/components/command-menu.tsx` |
| Dialog / AlertDialog | Overlay fade; konten fade dan zoom 95%→100%. | Konten masuk/keluar 200ms; overlay default 150ms; `ease` default | `src/components/ui/dialog.tsx`, `src/components/ui/alert-dialog.tsx`: `animate-in/out`, `fade-in/out`, `zoom-in/out-95`, `duration-200`; overlay mengikuti default animasi |
| Sheet | Mendukung arah kiri, kanan, atas, bawah; overlay terpisah dari panel. | Panel masuk 500ms / keluar 300ms, `ease-in-out`; overlay 150ms `ease` | `src/components/ui/sheet.tsx`: arah `slide-*`, `transition ease-in-out`, durasi state terbuka/tertutup |
| Dropdown / Popover / Select / Tooltip | Fade + zoom dengan slide kecil sesuai sisi pembukaan. Akhiran `-2` pada kelas slide berarti skala spacing Tailwind 2 (8px), bukan 2px. | 150ms masuk/keluar, `ease` default | `src/components/ui/dropdown-menu.tsx`, `popover.tsx`, `select.tsx`, `tooltip.tsx`: `animate-in/out`, `fade-*`, `zoom-*`, `slide-*-2` |
| Toast | Sonner dipasang di root dengan masa tampil 5000ms; source aplikasi tidak menetapkan kurva atau waktu animasi masuk/keluar. Masa tampil bukan durasi animasi. | Dikelola Sonner; tidak ada durasi/easing lokal | `src/routes/__root.tsx`; `src/components/ui/sonner.tsx` |
| Tema | Light/dark/system; tema disimpan pada cookie `vite-ui-theme` selama satu tahun. Toggle tema diuji di demo. | Tidak ada transisi tema eksplisit yang ditetapkan provider | `src/context/theme-provider.tsx`; `src/components/theme-switch.tsx` |
| Header | Header halaman dapat sticky/fixed; bayangan dan blur diterapkan setelah scroll melewati 10px. Breadcrumb adalah komponen terpisah, bukan progress navigasi otomatis. | Tidak menetapkan durasi/easing khusus | `src/components/layout/header.tsx`; `src/components/ui/breadcrumb.tsx` |
| Progress navigasi | Bar 2px ditampilkan saat TanStack Router sedang memuat route; bukan indikator upload/sinkron data. | Durasi/easing tidak dinyatakan pada komponen | `src/components/navigation-progress.tsx`; `src/routes/__root.tsx` |
| Tabel | Filter teks/facet dan pagination tersinkron ke URL pada tabel Tasks/Users. Sorting, visibilitas kolom, dan seleksi baris lokal. | Tidak ada animasi tabel khusus | `src/features/tasks/components/tasks-table.tsx`, `src/features/users/components/users-table.tsx`, `src/hooks/use-table-url-state.ts` |
| Skeleton | Placeholder memakai pulse Tailwind standar. | 2s berulang, `cubic-bezier(0.4, 0, 0.6, 1)` | `src/components/ui/skeleton.tsx`; `animate-pulse` |
| Transisi kontrol umum | Kelas `transition` tanpa nilai khusus memakai default Tailwind. | 150ms, `cubic-bezier(0.4, 0, 0.2, 1)` | Kelas `transition` di komponen; default Tailwind |

## Hasil untuk paritas Indotek

- Cocok untuk dipelajari: kontrol sidebar desktop, Sheet sebagai pola navigasi tambahan di mobile, dukungan `Ctrl/Cmd+B`, grup navigasi, dan state filter/pagination tabel di URL.
- Perbedaan yang perlu dipertahankan sebagai keputusan produk: rail sumber berukuran 48px (ditambah gap pada varian tertentu), sementara spesifikasi Indotek menetapkan rail 72px; template hanya menyediakan Sheet di mobile, sedangkan Indotek tetap memerlukan bottom nav, FAB, dan alur offline lapangan.
- Durasi motion di `DESIGN.md` §2.6 diperbarui agar mengacu pada source yang dipin, bukan perkiraan. Pilihan desain Indotek yang sengaja berbeda tetap memerlukan keputusan yang tercatat.
- Progress navigasi sumber hanya mencerminkan status router. Jangan gunakan sebagai pengganti indikator koneksi atau sinkronisasi offline Indotek.
- Pencarian source yang diaudit tidak menemukan `prefers-reduced-motion` atau kelas `motion-reduce`; kewajiban reduced-motion Indotek tetap berlaku dan tidak boleh dianggap terpenuhi hanya karena memakai komponen template.
