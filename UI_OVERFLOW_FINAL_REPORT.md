# Laporan Akhir Audit Overflow UI

## Hasil

- Satu masalah overflow vertikal onboarding ditemukan dan diperbaiki.
- Tidak ada horizontal overflow pada route yang diaudit.
- Scroll dokumen dan `body` tidak bergerak bersamaan dengan area konten aplikasi.
- Dialog dan primitive overlay tetap berada di dalam batas viewport yang diuji.
- Saat form onboarding lebih tinggi daripada layar, bagian akhirnya dapat dicapai dengan scroll internal pada `main`; `window.scrollY` tetap 0.

## Cakupan verifikasi

- 15 route navigasi dan detail proyek, delapan ukuran viewport, light/dark.
- Dialog pembuatan proyek dan alert dialog, tiga arah sheet, tooltip, select, dropdown, dan popover.
- Autentikasi dan onboarding, sepuluh ukuran viewport, light/dark.
- Route diuji dengan trafik eksternal diblokir; data produksi tidak dimutasi.

## Temuan yang ditutup

| ID | Temuan | Status |
|---|---|---|
| OV-01 | Form onboarding terpotong pada 1366 × 768 karena halaman tidak memiliki scroll internal. | Diperbaiki; test memastikan scroll internal mencapai bawah form tanpa scroll dokumen. |

## Screenshot

- Sebelum: [artifacts/ui-overflow/before](./artifacts/ui-overflow/before/)
- Sesudah: [artifacts/ui-overflow/after](./artifacts/ui-overflow/after/)
- Onboarding sebelum: [onboarding-before-1366-light.png](./artifacts/ui-overflow/before/onboarding-before-1366-light.png)
- Onboarding sesudah — atas: [onboarding-1366-light.png](./artifacts/ui-overflow/after/onboarding-1366-light.png)
- Onboarding sesudah — setelah scroll ke bawah: [onboarding-1366-light-bottom.png](./artifacts/ui-overflow/after/onboarding-1366-light-bottom.png)

## Catatan yang belum terverifikasi

HTTP 500 resource lokal yang pernah dilaporkan tidak terulang pada tes terisolasi dan tidak terkait overflow. URL serta penyebabnya belum diketahui; bila masih terjadi, perlu audit jaringan terpisah.

## Validasi

- `npm run e2e:visual`: 43/43 lulus.
- Auth dan onboarding: 2/2 lulus; matriks 10 ukuran viewport dan dua tema.
- `npm run typecheck` dan `npm run lint`: lulus.
- `npm test`: 200/200 lulus.
- `npm run build`: lulus. Vite masih memberi peringatan chunk ExcelJS 929.40 kB; ini tidak terkait perubahan audit.
