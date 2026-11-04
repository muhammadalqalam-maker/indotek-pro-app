# TASK — Indotek Pro

> Fase 0–6 dan seluruh Decision Log/Backlog lama ada di `docs/archive/TASK-fase0-6.md` (jangan dibaca kecuali diminta).
> File ini dijaga **≤ 10 KB**. Selesai satu fase UI → pindahkan baris selesainya ke arsip, sisakan satu baris ringkasan.
> Legenda: `[ ]` belum · `[~]` berjalan · `[x]` selesai · `[!]` ditunda/terblokir.

## Carry-over (bukan bagian redesign)

- [x] **T-DB.1 Audit dan optimasi Supabase staging.** — 2026-11-02 — 46/46 migrasi sinkron; RLS/policy/grant, constraint, index, locks dan endpoint diverifikasi. Tidak ada error DB yang terkonfirmasi; migrasi `20261102000000` mengoptimasi evaluasi fungsi auth pada policy RLS di staging sesuai Advisor, tanpa mengubah cakupan akses.
- [x] **T-DB.2 Perbaiki gagal soft-delete proyek.** — 2026-11-02 — Akar masalah: policy SELECT menyembunyikan tuple sesudah `deleted_at` terisi, sehingga UPDATE ditolak. Migration `20261102000001` menambah RPC SECURITY DEFINER dengan verifikasi owner/admin dan `search_path` terkunci; service memakainya. Migration diterapkan ke Supabase `fsbhh...`; uji owner lolos dalam rollback, akses tanpa izin ditolak. Frontend Production Ready (`dpl_Fb6U8CBJSV6tGnaCMA5ARHo3MGi1`). Production menunjukkan `Pembangunan Parit` soft-deleted (updated 2026-11-02 06:04 UTC); UI owner menunjukkan 0 proyek aktif di Malcon Studio. Pengguna mengonfirmasi status soft-deleted memang dipertahankan.
- [~] **T-DB.3 Audit kesiapan Supabase Production.** — 2026-11-02 — Target Vercel Production tetap `fsbhhduquevlzpxcjlun`; nama dashboard `indotekpro-production`, cipp `indotekpro-dev`. Data cipp berbeda dan dua migrasi tertinggal; tak disinkronkan. Uji RLS rollback dengan claim authenticated simulasi: owner fsbhh melihat 2 proyek tenant sendiri, 0 tenant lain, update lintas-tenant 0. Di cipp akun uji tak punya proyek sendiri (positive control belum tersedia); tak ada visibilitas/update lintas-tenant. `anon` tak membaca organisasi/proyek atau mengubah baris. Password DB Production dirotasi dan koneksi dengan nilai baru diverifikasi. Dump `public` schema+data terenkripsi DPAPI: `D:\Desktop\Indotek Pro Backups\indotekpro-production-20261102-182251.dpapi` (97,286 byte), dekripsi/hash lolos. Uji restore lokal: 77 tabel, 4 proyek, 3 organisasi; memakai stub `auth.jwt()` dan menonaktifkan trigger/FK saat memuat, jadi bukan validasi constraints/pemulihan Auth/Storage; `pg_dump` memberi peringatan circular FK BOQ/WBS. Storage memiliki 5 objek privat, belum diekspor; Production hanya menyimpan URL+anon key. Dump lokal terlindungi DPAPI tetapi belum off-site/portable; pengguna belum memberi tujuan salinan portabel. Dashboard app login berhasil; akun saat ini hanya melihat Malcon Studio (1 soft-deleted project, 0 aktif), cocok dengan DB; dua organisasi bertanda UAT berisi 3 proyek aktif tetapi tidak terlihat oleh akun ini dan pengguna memilih membiarkannya terpisah. Satu reload direct-route sempat menampilkan offline fallback saat `navigator.onLine=true`; navigasi root lalu client-side ke daftar proyek bekerja dan memuat empty state. Snapshot backup tak tercantum, PITR nonaktif, paket/billing tak diubah. Kesiapan penuh menunggu backup Storage/Auth portable, tujuan off-site, dan UAT alur lain.
  Reload deep-link PWA saat online diperbaiki secara lokal: Workbox fallback kini menuju `/index.html`; tes PWA membuktikan app shell termuat pada route langsung online dan offline. Belum dideploy ke Production.
  Pembaruan backup: arsip `D:\Aplikasi 2\Backup\indotekpro-production-20261102-190336.dpapi` memuat dump `public` sebelumnya, 5 objek Storage privat, serta metadata 6 akun Auth (ID/email/timestamp, tanpa password hash); dekripsi, isi arsip, jumlah file, dan checksum diverifikasi. Arsip dilindungi DPAPI `CurrentUser` sehingga hanya dapat dibuka dari profil Windows ini; path yang dipilih berada pada disk NVMe boot lokal yang sama, bukan off-site/portable. Metadata Auth bukan backup kredensial yang dapat memulihkan sesi/password; backup penuh dan salinan off-site tetap belum terpenuhi.
  Pembaruan 2026-11-03: staging tanpa DPAPI sempat disiapkan (SQL `public` fresh, 77 tabel; 5 objek Storage; metadata 6 akun Auth tanpa hash). Pengguna mengonfirmasi RAR terenkripsi sudah diunggah ke Google Drive dan arsip hasil unduhan berhasil diuji. Folder staging plaintext dan RAR lokal sudah tidak ada saat diperiksa; backup lama DPAPI tetap tersimpan. Paket bukan backup lengkap Supabase.
  UAT baca-saja Production melalui akun Malcon memuat 15 route dan main state selesai tanpa error inline; halaman proyek menunjukkan 0 proyek aktif. Dengan persetujuan eksplisit pengguna (2026-11-03), dibuat fixture `UAT Rilis TEMP 2026-11-03 12:31` (`PRJ-M20-2026-PROJECT-00002`) hanya di Malcon; create, update, soft-delete, audit `INSERT` + 2 `UPDATE`, dan `deleted_at` terverifikasi. Daftar aktif kembali 0; organisasi lain tidak disentuh. Absensi, dokumen, approval, dan transaksi tetap belum divalidasi.
  Validasi rilis lokal 2026-11-03: typecheck/build/unit (198/198)/E2E (15/15)/visual (41/41)/PWA (1/1) lulus. Build tetap memberi warning chunk ExcelJS >500 kB. Perbaikan scroll restoration dan PWA belum dideploy. Production memiliki 3 proyek aktif lintas organisasi dan 1 soft-deleted; Malcon tetap 0 aktif setelah cleanup fixture. Pengguna memilih mempertahankan bundle terenkripsi yang sudah di Drive dan tidak mengubah plan; PITR tetap nonaktif dan backup tersebut bukan backup Supabase lengkap. Rilis masih menunggu UAT alur lain serta commit/deploy sesuai keputusan hold; tidak ada perubahan billing, push, merge, atau deploy.
- [~] **T-5.12 UAT internal & go-live** (P0) — berjalan; **tidak boleh terblokir** oleh redesign.
- [x] **T-OPS.1 Arsip operasional dan koreksi beralasan.** — 2026-11-03 — Migrasi `20261103000000` diterapkan dan diverifikasi di Production `fsbhh...`; hanya migrasi ini yang tertinggal. 49 migrasi lolos di PostgreSQL disposable; tes rollback menguji izin default/override, arsip absensi immutable, kas/koreksi, kasbon, PR, quote, dan cancel/archive PO. Offline attendance batch dites dengan IndexedDB cache/queue dan ID stabil. Typecheck/lint, 199 unit, 15 E2E, PWA offline 1/1, build lulus (warning chunk ExcelJS >500 kB tetap ada). Siap untuk commit/deploy; belum commit atau deploy.
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

## Riwayat Redesign UI

- [x] Fase UI-0–F selesai; detail tugas, Decision Log, dan Backlog tersimpan di [docs/archive/TASK-redesign-shadcn-admin.md](./docs/archive/TASK-redesign-shadcn-admin.md).

## FASE UI-G — Autentikasi

- [x] **T-UI.G.1** Perbarui tampilan login dan gunakan foto latar pilihan pengguna tanpa mengubah alur autentikasi. — 2026-11-04 — Layout dua panel responsif, teks brand dipertahankan.
- [x] **T-UI.G.2** Ganti logo pada header, login, halaman offline, favicon, dan ikon PWA/home screen. — 2026-11-04 — Ikon diregenerasi dari logo pilihan pengguna; app logo termasuk aset precache PWA. Typecheck/lint/build, unit 200/200, auth E2E 5/5, PWA 1/1, auth visual 1/1, dan visual 41/41 lulus.
