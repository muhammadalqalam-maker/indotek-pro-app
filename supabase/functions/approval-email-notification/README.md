# Email notifikasi approval via Gmail

Integrasi ini memakai Google Apps Script sebagai jembatan pengiriman Gmail pribadi, tanpa domain khusus. Cakupan email hanya:

- Permintaan approval baru kepada approver.
- Keputusan approval (disetujui/ditolak) kepada pemohon.

Google saat ini mencantumkan kuota 100 penerima email per hari untuk akun Apps Script konsumen; batas dapat berubah. Gunakan untuk volume rendah/internal, bukan email massal atau layanan dengan SLA ([kuota resmi](https://developers.google.com/apps-script/guides/services/quotas)).

## Persiapan Google Apps Script

1. Buat project baru di [Google Apps Script](https://script.google.com/), lalu salin `apps-script.gs` ke editor.
2. Di **Project Settings → Script Properties**, tambahkan `APPROVAL_EMAIL_SHARED_SECRET` berisi token acak minimal 32 karakter. Simpan nilai yang sama sebagai `GOOGLE_APPS_SCRIPT_TOKEN` di Supabase Functions Secrets; jangan taruh di source control.
3. Deploy sebagai **Web app**, jalankan sebagai akun Gmail pemilik script, dan batasi akses ke **Anyone**. Endpoint publik dilindungi token bersama; jangan membagikan URL/token.
4. Salin URL Web app berakhiran `/exec`.

## Konfigurasi Supabase staging

Sebelum menjalankan migrasi, buka **Database → Vault** di project staging dan buat dua rahasia berikut melalui Dashboard UI ([dokumentasi Vault](https://supabase.com/docs/guides/database/vault)):

- Nama `approval_email_project_url`, nilai `https://<STAGING_PROJECT_REF>.supabase.co`.
- Nama `approval_email_webhook_secret`, nilai token webhook acak.

Token webhook harus sama dengan `APPROVAL_EMAIL_WEBHOOK_SECRET` di Edge Function Secrets dan minimal 32 karakter. Gunakan token acak yang berbeda dari token Apps Script. Jangan menaruh nilai nyata di migrasi, saved SQL, atau chat. Jika salah satu nama sudah ada, perbarui rahasia tersebut; jangan membuat duplikat. Jangan lakukan ini di project Production.

Atur Function Secrets melalui **Supabase Dashboard staging → Project Settings → Edge Functions → Secrets**:

- `APPROVAL_EMAIL_WEBHOOK_SECRET`
- `GOOGLE_APPS_SCRIPT_URL` (URL `/exec` tadi)
- `GOOGLE_APPS_SCRIPT_TOKEN`
- `APP_URL` (URL HTTPS aplikasi Vercel Preview)

`SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` disediakan sebagai environment Supabase Function; jangan pernah menaruh service role key di frontend atau repo.

Supabase CLI juga membutuhkan password database staging untuk memeriksa/menerapkan migrasi. Simpan dan masukkan hanya melalui prompt CLI atau environment lokal terlindungi; jangan kirim ke chat. Project ref staging saat ini adalah `fsbhhduquevlzpxcjlun`.

Deploy function dengan verifikasi JWT bawaan dinonaktifkan karena pemanggilnya adalah database webhook. Function tetap mewajibkan `x-approval-email-secret` yang hanya disimpan di Vault dan Function Secrets:

```powershell
supabase functions deploy approval-email-notification --project-ref <STAGING_PROJECT_REF> --no-verify-jwt
```

Setelah Vault dan Function Secrets diverifikasi, terapkan migrasi
`20261023000025_approval_email_notifications.sql` hanya ke staging. Trigger memakai `pg_net` secara asynchronous, sehingga transaksi approval tidak menunggu Gmail menyelesaikan pengiriman. Secret yang masuk antrean `pg_net` dapat terlihat oleh role database yang dapat membaca antrean; token webhook harus khusus, acak, dan tidak boleh digunakan ulang.

## Uji penerimaan

Gunakan dua akun anggota staging dengan email yang dapat diakses:

1. Ajukan approval dan pastikan approver menerima satu email sementara notifikasi in-app tetap ada.
2. Setujui lalu tolak permintaan lain dan pastikan pemohon menerima email yang sesuai.
3. Pastikan delegasi tidak memicu email dan pemohon tidak menerima email untuk permintaannya sendiri.
4. Periksa log Function dan Apps Script saat pengiriman gagal; jangan menganggap respons sukses bila email gagal.
5. Pastikan kuota Gmail memadai dan tidak ada email uji tersisa sebelum go-live.

Task tidak dianggap selesai sebelum migrasi, Function, dan script diuji pada staging terautentikasi. Production tetap tidak disentuh tanpa persetujuan terpisah.
