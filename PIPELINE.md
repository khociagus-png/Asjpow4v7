# PIPELINE — Pedoman Alur Kerja ASJ (Jangan Diubah!)

Dokumen ini adalah **sumber kebenaran alur kerja lapangan** PT Amanah Sakura Japan (ASJ).
Setiap fitur/update portal ke depannya **wajib mengikuti pipeline ini** — portal hanya boleh
**mendigitalkan & mengotomasi pencatatan**, **TIDAK BOLEH mengubah urutan/sifat alur lapangan**.

> Baca sebelum mengerjakan fitur apa pun. Kalau ragu apakah fitur mengubah pipeline → tanya dulu.

---

## 1. Ringkasan alur bisnis

```
TSK kirim JO ke ASJ (format & syarat)
        │
        ▼
ASJ bikin pamflet → share ke grup & saluran WA
        │
        ▼
Kandidat yang minat DM ke ASJ
        │
        ▼
ASJ cek CV & dokumen pendukung → upload ke Drive → kirim ke TSK
        │
        ▼
┌───────────── SELEKSI (Fase A) ─────────────┐
│  list-check → kaiwa → mendan → mensetsu    │
│  → LOLOS USER                              │
└────────────────────────────────────────────┘
        │  (hanya yang lolos lanjut)
        ▼
┌─────────── PENDOKUMENAN (Fase B) ───────────┐
│  MCU → paspor → TTD kontrak → proses COE    │
│  → siskop → e-ID → visa → flight            │
└────────────────────────────────────────────┘
```

**Satu-satunya penghenti alur:** perusahaan **cancel** → proses dihentikan, kandidat
di-handling sesuai SOP lapangan (bukan otomatis sistem).

---

## 2. Fase A — Rekrutmen & Seleksi

Urutan tahapan (umum; perusahaan tertentu bisa minta alur khusus — sistem harus
mendukung penyimpangan, bukan memaksa linear):

| # | Tahapan | Arti lapangan |
|---|---|---|
| 1 | **list-check** | Daftar kandidat dari hasil share dipilah & diverifikasi (umur, gender, dokumen awal) |
| 2 | **kaiwa** | Tes percakapan / kemampuan dasar bahasa Jepang |
| 3 | **mendan** | Wawancara pendahuluan (ASJ ↔ kandidat) |
| 4 | **mensetsu** | Wawancara formal (dengan pihak Jepang / user / TSK) |
| 5 | **lolos user** | Kandidat dinyatakan lulus seleksi oleh user |

**Sifat filter berjenjang (corong):** jumlah kandidat menyusut di tiap tahapan.
Contoh nyata: list 30 → lolos kaiwa hanya **7** → lolos mendan **5** → lolos user **3**.
Sistem harus mencatat **jumlah awal & jumlah yang lolos di tiap tahap** (bukan cuma status akhir).

---

## 3. Fase B — Pendokumenan (setelah lolos user)

Urutan tetap, hanya kandidat yang sudah **lolos user** yang masuk fase ini:

| # | Tahapan | Arti lapangan |
|---|---|---|
| 1 | **MCU** | Medical check-up (kesehatan) |
| 2 | **paspor** | Pengurusan / perpanjangan paspor |
| 3 | **TTD kontrak** | Penandatanganan kontrak kerja |
| 4 | **proses COE** | Pengajuan Certificate of Eligibility |
| 5 | **siskop** | Siskop / pengurusan izin & data ketenagakerjaan |
| 6 | **e-ID** | Kartu identitas elektronik / data identitas resmi |
| 7 | **visa** | Pengurusan visa kerja |
| 8 | **flight** | Tiket & keberangkatan |

> Pengecualian: jika perusahaan **cancel** di tengah fase ini, pipeline berhenti —
> sistem menandai kandidat **gagal/batal + alasan cancel**, bukan melanjutkan otomatis.

---

## 4. Aturan WAJIB untuk semua fitur portal (HARD RULES)

1. **Pipeline lapangan tidak boleh berubah.** Fitur portal = alat catat/otomasi, bukan
   pengganti alur. Urutan tahapan tetap milik tim lapangan.
2. **Status hanya diubah admin/lapangan.** Sistem tidak pernah melewati tahap sendiri
   (misal auto-"lolos") tanpa aksi manusia.
3. **Dukung penyimpangan**: skip tahap, tahapan khusus perusahaan, dan cancel
   (dengan alasan) — sistem tidak boleh memaksa kandidat lewat semua tahap linear.
4. **Catat corong seleksi**: jumlah awal + jumlah lolos per tahap (Fase A) dan
   tanggal/status tiap dokumen (Fase B). Data ini untuk laporan profesional.
5. **Berkas pendukung tetap di Drive** (alur: cek CV/dokumen → upload Drive → kirim ke TSK).
   Portal boleh menautkan/link file, bukan mengganti Drive.
6. **Komunikasi WA (share, pamflet, info tahapan) memakai kanal yang sudah ada**
   (grup & saluran WA; Fonnte untuk blast) — portal tidak membuat kanal baru sendiri.
7. **Lolos user = gerbang fase** — kandidat belum lolos user tidak boleh masuk Fase B.

---

## 5. Pemetaan ke sistem saat ini (buat developer)

| Konsep pipeline | Di sistem |
|---|---|
| JO dari TSK | Tabel `db_job` (loker: kode job, judul, syarat, kuota, tahapan) |
| Daftar tahapan (Fase A+B) | Config `list_tahapan` (sys_config) — urutannya harus = pipeline di atas |
| Posisi kandidat di pipeline | Kolom `tahapan` / `status` di `database_candidate` |
| Progres dashboard kandidat | `evaluasiTahapanKandidat()` — menghitung posisi vs `list_tahapan` |
| Filter berjenjang (corong) | Hitung dari data kandidat per tahap (perlu laporan agregat) |
| Dokumen pendukung (CV, berkas) | Pemberkasan kandidat + link ke Drive (tidak menggantikan Drive) |
| Pamflet / share WA | Share link loker (`share.html`) + blast WA (Fonnte) |
| Cancel perusahaan | Status kandidat **batal/gagal** + alasan — bukan lanjut otomatis |

---

## 6. Checklist sebelum menambah fitur

Sebelum fitur baru disetujui, jawab:

- [ ] Fitur ini **mencatat/mengotomasi** alur yang sudah ada — bukan mengubah urutannya?
- [ ] Apakah admin/lapangan tetap yang mengubah status tahapan?
- [ ] Kalau perusahaan minta alur khusus, fitur tetap jalan (tidak hardcode linear)?
- [ ] Apakah alur **cancel** tetap dihormati (berhenti + alasan)?
- [ ] Apakah berkas tetap di Drive (portal hanya menautkan)?
- [ ] Apakah komunikasi tetap lewat kanal WA yang ada?

> Semua jawaban harus "ya". Kalau ada yang "tidak" → fitur kemungkinan mengubah
> pipeline lapangan → bahas dulu sebelum dikerjakan.
