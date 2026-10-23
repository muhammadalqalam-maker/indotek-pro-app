# Runbook Backup dan Restore

Dokumen ini membedakan pemulihan database Supabase dari pemulihan berkas Storage. Backup database Supabase **tidak** menyimpan byte berkas Storage; database hanya menyimpan metadata objek. Backup database juga bukan backup lengkap konfigurasi deployment, environment Vercel, secrets Edge Function, atau antrean lokal offline.

## Batasan dan persiapan

- Periksa **Supabase Dashboard → Database → Backups** untuk memastikan jenis backup, waktu terbaru, retensi, dan opsi pemulihan yang benar-benar tersedia pada plan project. Ketersediaan backup terjadwal dan Point-in-Time Recovery (PITR) bergantung pada plan/add-on; jangan mengasumsikan RPO/RTO atau retensi tertentu.
- Supabase menyebut backup terjadwal harian untuk plan berbayar yang memenuhi syarat; retensi berbeda menurut plan. Project Free perlu melakukan ekspor manual dan menyimpan salinan di luar project. Lihat [dokumentasi backup Supabase](https://supabase.com/docs/guides/platform/backups) untuk kondisi saat ini.
- Tetapkan pemilik operasional, frekuensi backup, lokasi salinan terenkripsi, retensi, dan target pemulihan bersama pemilik produk. Catat project ref/environment yang diverifikasi sebelum setiap tindakan. Jangan menyalin kredensial ke tiket, chat, source control, atau command yang disimpan dalam skrip.
- Jangan menguji restore pertama kali pada Production. Gunakan project pemulihan terpisah, akses terbatas, dan jadwal pemeliharaan yang disetujui.

## Backup database

### Backup terkelola Supabase

1. Buka project Supabase yang benar, lalu **Database → Backups**.
2. Periksa waktu backup terakhir dan tanggal paling awal yang masih tersedia. Untuk kebutuhan sebelum perubahan berisiko, pastikan titik pemulihan yang diperlukan tersedia.
3. Jika PITR aktif, periksa rentang waktu yang dapat dipulihkan. Pemulihan PITR membuat project tidak dapat diakses selama proses; rencanakan downtime dan minta persetujuan sebelum memulai.
4. Catat timestamp/jenis backup dan project ref pada catatan perubahan internal yang memiliki akses terbatas.

### Ekspor logis manual (opsional)

Ekspor logis bukan pengganti backup terkelola penuh. Supabase CLI memerlukan Docker Desktop, akses database, dan koneksi database yang sesuai. Simpan hasil di drive backup terenkripsi di luar repository. URI koneksi mengandung password database; jangan memasukkannya ke source control, riwayat terminal bersama, log CI, atau command yang dibagikan.

Contoh berikut hanya mengekspor skema dan data pada schema `public`; sesuaikan folder lokal yang aman. CLI menggunakan connection string dari **Supabase Dashboard → Connect**:

```powershell
supabase db dump --db-url "<CONNECTION_STRING>" --schema public --file "D:\secure-backups\indotek-pro\public-schema-YYYYMMDD.sql"
supabase db dump --db-url "<CONNECTION_STRING>" --schema public --data-only --use-copy --file "D:\secure-backups\indotek-pro\public-data-YYYYMMDD.sql"
```

Jangan memasukkan file ekspor ke Git. Ekspor `public` ini tidak mencakup Auth, objek Storage, konfigurasi project, secrets, atau service lain; jangan menganggapnya cukup untuk disaster recovery seluruh project. Ikuti [panduan resmi backup/restore CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) jika membutuhkan backup logis lintas schema. Repository saat ini belum memiliki `supabase/config.toml` atau proses backup otomatis.

## Backup berkas Storage

1. Inventarisasi bucket dan prefix object yang digunakan pada project, termasuk dokumen proyek, logo organisasi, dan bukti QC. Verifikasi daftar bucket di Dashboard karena migrasi fitur dapat menambah bucket baru.
2. Salin byte objek secara terpisah melalui Storage API atau alat yang disetujui organisasi; pertahankan path object dan catat metadata yang diperlukan untuk pemetaan kembali. Gunakan salinan terenkripsi dengan akses terbatas.
3. Verifikasi bahwa jumlah/ukuran file yang disalin sesuai inventaris dan lakukan uji baca pada beberapa file di lokasi backup.
4. Atur retensi dan jadwalnya sebagai prosedur operasional terpisah. Repository ini belum menyediakan job otomatis untuk mengekspor byte Storage.

Jangan membuat bucket publik untuk memudahkan backup. Policy Storage dan kerahasiaan file harus tetap dibatasi oleh organisasi.

## Restore

### Pemulihan project melalui Supabase

1. Pastikan insiden, project ref, timestamp target, dampak downtime, dan persetujuan pemilik sudah dicatat.
2. Jika pemulihan hanya untuk investigasi, gunakan project baru/terpisah bila opsi Supabase yang tersedia mendukungnya. Untuk restore pada project yang sama, pastikan dampak penggantian data dan downtime dipahami semua pihak.
3. Pada **Database → Backups** atau **Point in Time**, pilih titik yang benar, tinjau konfirmasi Dashboard, lalu mulai restore hanya setelah persetujuan. Project tidak tersedia selama pemulihan PITR.
4. Pulihkan byte Storage secara terpisah dari salinan yang cocok dengan timestamp database. Database restore tidak mengembalikan objek yang telah dihapus dari Storage setelah titik backup.
5. Jangan mengarahkan Vercel Production ke project pemulihan sebelum verifikasi dan persetujuan rilis.

### Ekspor logis manual

Untuk uji pemulihan ekspor `public` saja, siapkan project database baru/non-production yang dibuang setelah uji. Instal `psql`, lalu ikuti urutan restore, konfigurasi extension, dan langkah khusus Vault/enkripsi dari [panduan resmi Supabase](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore). Panduan resmi tersebut mencakup pemulihan lintas schema yang lebih luas; jangan menjalankan contoh restore penuh pada project yang berisi data karena operasi itu dapat mengganti skema dan data. Untuk pemulihan disaster recovery, utamakan mekanisme restore project Supabase yang sesuai daripada menganggap dua file `public` sebagai backup lengkap.

Vault atau kolom terenkripsi memerlukan perhatian khusus terhadap root encryption key lama. Jangan menimpa key atau menghapus project sumber sebelum mengikuti instruksi resmi dan memastikan rahasia tetap dapat didekripsi.

## Verifikasi setelah restore

- Pastikan restore selesai dan catat timestamp titik pemulihan.
- Periksa schema, extension, migration history, dan data inti tanpa membuka akses publik.
- Verifikasi pengguna/keanggotaan dan jalankan uji isolasi tenant pada project pemulihan: akun organisasi A tidak boleh membaca atau menulis data organisasi B.
- Periksa bucket tetap privat, object path tersedia, dan policy Storage menolak akses lintas organisasi.
- Verifikasi konfigurasi Supabase Auth, URL redirect, secrets/Vault, Edge Functions, serta environment Vercel secara terpisah; database restore tidak membuktikan semua layanan itu pulih.
- Jalankan smoke test aplikasi pada URL non-production dengan akun uji yang sesuai. Pastikan log tidak memuat secret atau data sensitif.
- Catat hasil uji, langkah yang gagal, waktu yang diperlukan, serta tindak lanjut. Jangan menyatakan target RPO/RTO tercapai sebelum diukur melalui latihan pemulihan.
