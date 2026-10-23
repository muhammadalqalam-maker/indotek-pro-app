# Indotek Pro

Platform manajemen konstruksi untuk PT. Indotek Karya Nusantara. Frontend React, TypeScript, Vite, Tailwind CSS, dan PWA; backend Supabase.

## Prasyarat

- Node.js 22 atau lebih baru dan npm
- Project Supabase untuk lingkungan yang akan digunakan
- Akun Vercel untuk deployment

## Menjalankan aplikasi

1. Pasang dependensi dari lockfile:

   ```sh
   npm ci
   ```

2. Salin `.env.example` menjadi `.env.local`, lalu isi:

   ```dotenv
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-publishable-or-anon-key
   VITE_SENTRY_DSN=
   ```

   Ambil URL dan publishable/anon key dari **Supabase Dashboard → Project Settings → API**. `VITE_SENTRY_DSN` opsional; biarkan kosong untuk menonaktifkan pelaporan error. Semua variabel `VITE_*` masuk ke bundle browser. Jangan pernah mengisi `service_role` key, password database, token Supabase CLI, atau secret server ke variabel tersebut.

3. Siapkan skema Supabase sesuai bagian [Migrasi database](#migrasi-database) dan atur Email Auth serta URL redirect di Supabase.
4. Jalankan aplikasi:

   ```sh
   npm run dev
   ```

   Buka URL yang ditampilkan Vite (default `http://localhost:3000`). Jika Supabase belum dikonfigurasi, aplikasi development dapat berjalan dalam mode demo lokal; data demo bukan data operasional dan tidak disimpan ke tenant Supabase. Build production gagal tertutup dan tidak menampilkan data demo jika konfigurasi backend tidak tersedia. Jangan gunakan mode demo untuk data operasional.

## Migrasi database

File migrasi bernomor waktu berada di [`supabase/migrations/`](./supabase/migrations/). Terapkan file SQL sesuai urutan nama, dari yang paling lama ke terbaru, terlebih dahulu pada project Supabase non-production dan setelah meninjau isi migrasi. Pada Supabase Dashboard, buka **SQL Editor**, jalankan satu file pada satu waktu, lalu pastikan tiap eksekusi berhasil sebelum lanjut. Sebelum migrasi production, buat/konfirmasi backup dan lakukan deployment terencana.

Repository saat ini tidak menyertakan `supabase/config.toml`; migrasi dikelola sebagai file SQL dan proses penerapannya harus dicatat di luar migration history CLI. Karena itu, jangan jalankan `supabase db push` atau menganggap `supabase migration list` mewakili semua migrasi yang pernah diterapkan sebelum konfigurasi CLI dan riwayat database direkonsiliasi. Jangan menjalankan ulang file migrasi yang sudah sukses diterapkan.

[`supabase/seed.sql`](./supabase/seed.sql) berisi data demo termasuk organisasi/profil contoh. Gunakan hanya pada database non-production yang memang ditujukan untuk demo, setelah memeriksa isi file; jangan jalankan pada staging UAT atau production.

Setelah perubahan skema yang disetujui, regenerasi tipe dari project yang benar dan tinjau diff:

```sh
supabase link --project-ref <PROJECT_REF>
npm run db:types
```

Perintah ini memerlukan Supabase CLI dan kredensial akses lokal yang sesuai. Repository belum memiliki `supabase/config.toml`, sehingga alur `supabase link`/`db:types` belum siap digunakan dari checkout ini. Siapkan konfigurasi CLI dan rekonsiliasi migration history dalam perubahan terpisah sebelum menjalankan perintah migrasi CLI. Pastikan project ref yang ditautkan benar; hasil tipe mencerminkan database remote tersebut.

## Pemeriksaan

```sh
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

`lint` saat ini menjalankan pemeriksaan TypeScript yang sama dengan `typecheck`. E2E memakai Playwright; jalankan `npx playwright install` jika browser belum tersedia pada mesin pengembang.

## Deploy ke Vercel

1. Push repository ke Git provider dan import ke Vercel.
2. Pilih framework preset **Vite**, root directory repository, build command `npm run build`, dan output directory `dist`.
3. Atur `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` pada Environment Variables Vercel. Pisahkan nilainya untuk **Preview** dan **Production** sesuai project Supabase masing-masing; deployment Preview tidak otomatis berarti memakai staging.
4. Opsional: atur `VITE_SENTRY_DSN` pada environment yang memang disetujui untuk telemetry. Jangan menaruh secret di variabel `VITE_*`.
5. Periksa URL auth/redirect pada Supabase agar sesuai dengan URL aplikasi pada setiap environment, lalu deploy dan uji login, pemilihan organisasi, navigasi, serta akses data sesuai role.

[`vercel.json`](./vercel.json) mengarahkan rute SPA ke `index.html`; build juga menghasilkan aset PWA, manifest, dan service worker. Perubahan pada Production hanya dilakukan melalui rilis yang disengaja.

## Panduan operasional

- [Panduan pengguna singkat](./USER-GUIDE.md)
- [Runbook backup dan restore](./BACKUP-RESTORE.md)
- [Setup notifikasi email approval](./supabase/functions/approval-email-notification/README.md)

## Struktur penting

- `src/features/` — tampilan fitur
- `src/services/` — akses data
- `src/lib/supabase.ts` — klien Supabase
- `supabase/migrations/` — skema, RLS, dan migrasi fitur
- `public/` — aset PWA
