# PRD — Indotek Pro

> Product Requirements Document. Sumber kebenaran untuk **apa** yang dibangun. Perubahan scope harus dicatat di bagian *Changelog* bawah.

## 1. Ringkasan

**Indotek Pro** adalah platform manajemen konstruksi berbasis web (PWA) untuk kontraktor di Indonesia: dari estimasi RAB/BOQ, jadwal & progres, laporan lapangan, pengadaan, gudang, subkontraktor, keuangan proyek, SDM, K3/QC, hingga dokumen dan approval — dalam satu sistem yang rapi, cepat, dan nyaman dipakai di lapangan lewat HP.

- **Fase bisnis 1:** siap pakai internal PT. Indotek Karya Nusantara.
- **Fase bisnis 2:** SaaS multi-tenant untuk perusahaan konstruksi lain.

## 2. Tujuan & Non-Tujuan

### Tujuan
1. Satu sumber data proyek yang akurat (anggaran, progres, biaya, dokumen).
2. Mempercepat pelaporan lapangan dan mengurangi pekerjaan manual di Excel/WhatsApp.
3. Kontrol biaya: anggaran (RAB) vs realisasi, per proyek.
4. Proses approval yang jelas dan terlacak (audit trail).
5. Arsitektur multi-tenant sejak awal agar bisa dijual tanpa rewrite.
6. Pengalaman setara aplikasi SaaS modern di desktop **dan** mobile, bisa di-install (PWA).

### Non-Tujuan (di luar scope saat ini)
- Integrasi pembayaran/langganan (hanya siapkan struktur `plans`/`subscriptions`/feature flag).
- Aplikasi native (Play Store/App Store). PWA saja.
- Akuntansi penuh (jurnal umum, pajak lengkap). Hanya keuangan proyek.
- Fitur BIM/3D viewer.
- Integrasi pihak ketiga (e-faktur, bank) pada rilis awal.

## 3. Pengguna & Role

| Role | Fokus | Akses utama |
|---|---|---|
| `owner` | Pemilik/Direktur | Semua, termasuk pengaturan organisasi & laporan eksekutif |
| `admin` | Admin sistem | Pengguna, master data, pengaturan |
| `project_manager` | PM | Proyek, jadwal, progres, approval, biaya proyek |
| `site_manager` | Pelaksana/Site Manager | Laporan harian, progres, permintaan material, absensi, K3 |
| `estimator` | QS/Estimator | RAB/BOQ, AHSP, master harga |
| `procurement` | Purchasing | Vendor, PR/PO, penawaran |
| `finance` | Keuangan | Termin, invoice, kas, hutang/piutang |
| `warehouse` | Logistik/Gudang | Stok, penerimaan, pengeluaran material |
| `safety_officer` | K3 | Inspeksi, insiden, toolbox meeting |
| `subcontractor` | Subkon (terbatas) | Lihat SPK & opname miliknya |
| `client_viewer` | Owner/Klien (read-only) | Progres, dokumen terpilih |

Izin per modul: `view / create / edit / approve / delete`, disimpan di tabel konfigurasi sehingga bisa disesuaikan per organisasi.

## 4. Prinsip Produk

- **Lapangan dulu:** alur penting harus bisa selesai < 1 menit di HP, dengan sinyal buruk.
- **Satu klik ke tindakan:** dashboard menampilkan yang perlu dilakukan (approval, tugas, risiko).
- **Data konsisten:** BOQ → progres → termin → biaya saling terhubung, bukan input ganda.
- **Aman secara default:** isolasi tenant lewat RLS, audit log, hak akses per role.
- **Lokal Indonesia:** istilah RAB, BOQ, AHSP, SPK, termin, opname, retensi, PPN 11%, format Rupiah.

## 5. Arsitektur Tingkat Tinggi

- **Frontend:** React + TypeScript + Vite + Tailwind + shadcn/ui, PWA.
- **Backend:** Supabase (Postgres + Auth + Storage + Realtime + RLS + Edge Functions).
- **Deploy:** Vercel (SPA).
- **Multi-tenant:** shared database, shared schema, kolom `organization_id` di semua tabel bisnis + RLS.

### Entitas inti (ringkas)
`organizations`, `profiles`, `organization_members`, `roles_permissions`, `plans`, `subscriptions`, `feature_flags`,
`projects`, `project_members`, `project_addenda`, `wbs_tasks`, `task_dependencies`,
`price_items` (bahan/upah/alat), `ahsp`, `ahsp_components`, `boq_versions`, `boq_items`,
`daily_reports`, `daily_report_manpower`, `daily_report_equipment`, `daily_report_materials`, `progress_entries`,
`vendors`, `purchase_requests`, `purchase_orders`, `po_items`, `goods_receipts`, `quotations`,
`inventory_items`, `stock_movements`, `material_requests`,
`subcontractors`, `subcontracts`, `subcontract_opnames`,
`client_invoices` (termin), `project_costs`, `cash_ledger`, `payables`, `receivables`,
`workers`, `attendance`, `wage_payments`,
`equipment`, `equipment_usage`, `maintenance_logs`,
`safety_inspections`, `incidents`, `qc_checklists`, `punch_list_items`,
`documents`, `document_versions`,
`approval_flows`, `approval_requests`, `approval_steps`,
`notifications`, `audit_log`, `doc_number_sequences`.

## 6. Kebutuhan Fungsional per Modul

Setiap modul punya prioritas: **P0** = wajib untuk go-live internal, **P1** = penting, **P2** = nanti.

### 6.1 Autentikasi & Organisasi (P0)
- Daftar, masuk, lupa/reset password, sesi aman, keluar.
- Onboarding: buat organisasi (nama, logo, NPWP, alamat), jadi `owner`.
- Undang anggota via email, atur role; pemilih organisasi bila pengguna tergabung di >1 organisasi.
- **Acceptance:** pengguna organisasi A tidak dapat melihat data organisasi B (diuji).

### 6.2 Dashboard (P0)
- Kartu ringkasan: total proyek aktif, nilai kontrak, progres vs rencana, realisasi biaya, sisa anggaran, cash flow.
- Widget: tugas saya, approval menunggu, proyek terlambat/berisiko, dokumen kedaluwarsa, aktivitas terbaru.
- Filter periode dan proyek.
- **Acceptance:** semua angka berasal dari database, bukan hard-coded.

### 6.3 Manajemen Proyek (P0)
- CRUD proyek: kode, nama, klien, lokasi (+peta), nilai kontrak, no. kontrak/SPK, tanggal mulai-selesai, masa pemeliharaan, persen retensi, status, tim proyek.
- Addendum/Variation Order mengubah nilai & durasi kontrak (dengan approval).
- Halaman detail proyek dengan tab: Ringkasan, Jadwal, BOQ, Progres, Biaya, Dokumen, Tim, Laporan.
- **Acceptance:** nilai kontrak efektif = kontrak awal + total VO ter-approve.

### 6.4 Jadwal & Kurva S (P1)
- WBS/task hierarkis, durasi, dependensi, milestone, tampilan Gantt.
- Kurva S rencana vs realisasi dihitung dari bobot item BOQ dan progres.

### 6.5 RAB, BOQ & AHSP (P0 — modul inti)
- Master harga satuan (bahan, upah, alat) dengan wilayah/tanggal berlaku.
- AHSP: komponen × koefisien × harga → harga satuan pekerjaan.
- BOQ per proyek: hierarki divisi > pekerjaan, volume, satuan, harga satuan, jumlah, overhead & profit, PPN (default 11%).
- **Versioning** (Rev 0, Rev 1, …) dan perbandingan antar revisi; kunci (lock) revisi ter-approve.
- Import/ekspor Excel dan ekspor PDF.
- Budget vs actual per item/divisi.
- **Acceptance:** total BOQ = Σ jumlah item + overhead/profit + PPN, akurat sampai sen; perubahan tercatat di audit log.

### 6.6 Progres & Laporan Lapangan (P0)
- Laporan harian: tanggal, cuaca, tenaga kerja, alat, material masuk, pekerjaan, kendala, foto multi, tanda tangan digital; status draft → submitted → approved.
- Progres per item BOQ (volume terpasang kumulatif) → memperbarui Kurva S & dasar penagihan termin.
- Laporan mingguan/bulanan otomatis dari laporan harian (PDF).
- **Offline-first** untuk laporan harian dan foto.
- **Acceptance:** laporan dibuat offline otomatis tersinkron saat online tanpa duplikasi.

### 6.7 Pengadaan / Procurement (P1)
- Master vendor + evaluasi.
- Alur: PR → perbandingan penawaran → PO → penerimaan barang (GRN) → pencocokan invoice.
- Approval berjenjang berdasarkan nilai; cetak PO PDF dengan kop perusahaan; penomoran otomatis.

### 6.8 Material & Gudang (P1)
- Stok per lokasi/proyek, barang masuk/keluar, transfer antar proyek, stok minimum + peringatan.
- Permintaan material dari lapangan + persetujuan.

### 6.9 Subkontraktor & Mandor (P1)
- Data subkon, SPK, nilai kontrak, opname periodik, retensi, potongan, pembayaran termin.

### 6.10 Keuangan Proyek (P1)
- Termin penagihan klien (invoice, status, jatuh tempo), uang muka, retensi.
- Biaya proyek, kasbon/reimbursement, buku kas proyek.
- Hutang (vendor/subkon) & piutang (klien) dengan aging.
- Cash flow forecast dan laba/rugi per proyek.

### 6.11 SDM & Absensi (P1)
- Data pekerja, absensi harian (opsional lokasi/foto), upah harian/borongan, rekap upah mingguan.

### 6.12 Peralatan & Aset (P2)
- Daftar alat, pemakaian per proyek, jadwal maintenance, biaya sewa/operasional.

### 6.13 K3, QC & Punch List (P1)
- Laporan insiden/near-miss, inspeksi K3, toolbox meeting, checklist QC, temuan (punch list) dengan foto, PIC, tenggat, status penutupan.

### 6.14 Dokumen & Gambar (P1)
- Folder per proyek, kategori (kontrak, gambar kerja, shop drawing, RFI, berita acara), versi dokumen, kontrol akses per role, pratinjau PDF/gambar, penanda kedaluwarsa.

### 6.15 Approval Engine (P0 sebagai fondasi)
- Mesin generik bertingkat: pending/approved/rejected, komentar, delegasi; dipakai PR, PO, VO, pembayaran, laporan, BOQ revisi.

### 6.16 Notifikasi (P1)
- Notifikasi in-app realtime + pusat notifikasi; opsi email untuk event penting.

### 6.17 Laporan & Analitik (P1)
- Laporan siap cetak/ekspor PDF & Excel: progres, keuangan, procurement, stok, absensi, K3; filter proyek/periode/status.

### 6.18 Pengaturan & Administrasi (P0)
- Profil perusahaan (logo, kop surat), pengguna & undangan, role/izin, master data, penomoran dokumen otomatis (mis. `PO/IND/2026/0001`), log aktivitas.

## 7. Kebutuhan Non-Fungsional

| Area | Target |
|---|---|
| Performa | LCP < 2,5 dtk di 4G; interaksi < 200 ms; list besar pakai pagination server-side |
| Responsif | 360px s/d layar lebar; tabel → card list di mobile |
| Offline | Laporan harian, absensi, foto: antrian lokal + sinkron otomatis |
| PWA | Lighthouse PWA lulus; dapat di-install di Android & iOS (A2HS) |
| Keamanan | RLS semua tabel; tanpa secret di klien; bucket privat; audit log |
| Aksesibilitas | Kontras WCAG AA, navigasi keyboard, label ARIA |
| Skalabilitas | Multi-tenant; index tepat; siap partisi/arsip data besar di masa depan |
| Lokalisasi | UI Bahasa Indonesia; struktur i18n siap bahasa Inggris |
| Keandalan | Penanganan error terpusat, retry otomatis untuk sinkron |
| Observabilitas | Audit log; hook untuk error tracking (mis. Sentry) |

## 8. Aturan Bisnis Penting

- Mata uang IDR; simpan `numeric(18,2)`; tampilkan `Rp 1.250.000`.
- PPN default 11%, dapat diubah per proyek/dokumen.
- Revisi BOQ yang sudah ter-approve **tidak boleh diubah**; perubahan = revisi baru.
- Realisasi progres per item tidak boleh melebihi volume BOQ + VO ter-approve (peringatan keras).
- Nomor dokumen unik per organisasi per tahun, tidak boleh loncat/duplikat.
- Hapus = soft delete; data keuangan ter-approve tidak dapat dihapus, hanya dibatalkan dengan jurnal koreksi/alasan.
- Setiap approval mencatat siapa, kapan, dan komentar.

## 9. Rilis & Prioritas

| Rilis | Isi | Sasaran |
|---|---|---|
| **R1 — Fondasi** | Auth, organisasi, multi-tenant RLS, design system, layout, dashboard, proyek, pengaturan | Dasar aman & siap |
| **R2 — Inti Estimasi & Lapangan** | RAB/BOQ/AHSP, progres/Kurva S, laporan harian (offline) | Mulai dipakai internal |
| **R3 — Operasional** | Procurement, gudang, subkon, approval engine penuh | Alur belanja & subkon |
| **R4 — Keuangan & SDM** | Termin, biaya, kas, hutang/piutang, absensi, upah, peralatan | Kontrol biaya penuh |
| **R5 — Mutu & Finalisasi** | K3/QC, dokumen, laporan & ekspor, notifikasi, hardening PWA/offline, QA, go-live | Siap produksi internal |
| **R6 — SaaS (nanti)** | Paket langganan, onboarding perusahaan baru, penagihan | Dijual ke perusahaan lain |

## 10. Metrik Keberhasilan

- 100% proyek internal baru dikelola di Indotek Pro dalam 1 bulan setelah go-live.
- Waktu membuat laporan harian < 3 menit di HP.
- 0 kebocoran data antar organisasi pada uji isolasi.
- Lighthouse: PWA lulus, Performance ≥ 85 (mobile), Accessibility ≥ 90.
- Skor kepuasan pengguna internal ≥ 4/5.

## 11. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Scope terlalu besar | Rilis bertahap; P0 dulu; kerja per task di `TASK.md` |
| Kebocoran data antar tenant | RLS di semua tabel + uji isolasi tiap rilis |
| Sinkron offline menimbulkan duplikat/konflik | ID klien (UUID) idempoten + aturan konflik eksplisit |
| Perhitungan uang tidak akurat | Hitung di SQL/numeric; test unit untuk rumus BOQ |
| Agent menyimpang dari desain | `AGENTS.md`, `DESIGN.md`, Definition of Done, review per task |
| Vendor lock-in | Skema SQL standar; logika bisnis berat di migrasi/fungsi yang terdokumentasi |

## 12. Glosarium

- **RAB:** Rencana Anggaran Biaya. **BOQ:** Bill of Quantities. **AHSP:** Analisa Harga Satuan Pekerjaan.
- **SPK:** Surat Perintah Kerja. **VO:** Variation Order/Addendum. **Termin:** tahap penagihan.
- **Opname:** pengukuran progres untuk dasar pembayaran. **Retensi:** dana tertahan hingga masa pemeliharaan selesai.
- **GRN:** Goods Receipt Note. **PR/PO:** Purchase Request/Order. **K3:** Keselamatan & Kesehatan Kerja. **QC:** Quality Control.

## 13. Changelog

| Tanggal | Perubahan | Oleh |
|---|---|---|
| — | Versi awal | — |
| 2026-10-19 | Implementasi Dashboard v1 dibatasi ke ringkasan dari data proyek tersimpan. Filter periode mencocokkan rentang jadwal proyek; progres dan biaya adalah snapshot terkini. KPI tugas dan approval ditunda sampai sumber data persisten tersedia; perubahan cakupan disetujui pengguna. | Pengguna |
| 2026-10-19 | Implementasi daftar dan CRUD proyek mencakup validasi form, pencarian/filter, penanggung jawab dari anggota organisasi, edit, soft-delete, serta tautan peta. Tidak ada migrasi; perbedaan izin policy UPDATE dan DELETE untuk soft-delete dicatat untuk peninjauan terpisah. | Pengguna |
| 2026-10-19 | Halaman fitur dimuat sesuai kebutuhan dan vendor utama dipisah agar tidak ada chunk JavaScript produksi di atas 500 kB; tidak mengubah perilaku atau cakupan fitur. | Pengguna |
| 2026-10-19 | Halaman detail proyek menyediakan Ringkasan dan Tim dari data proyek/penugasan organisasi; Dokumen memperlihatkan kategori tanpa mengklaim file tersimpan; Jadwal, BOQ, Progres, Biaya, dan Laporan tetap placeholder hingga modulnya tersedia. Sesuai persetujuan pengguna, akses Addendum/VO yang sebelumnya tersedia serta nilai kontrak efektif setelah VO ditangguhkan ke T-1.25. | Pengguna |
