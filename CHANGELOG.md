# CHANGELOG — ASJ Portal

> Riwayat fitur & perbaikan per commit, paling lama di atas. Update terakhir: (i18n lengkap teks Undang Grup Kelas id+jp).

---

## 2026-08-17 — `baa653d` 🌐 i18n lengkap teks Undang Grup Kelas — placeholder & deskripsi panel WA tidak lagi literal

### Ringkasan

- Key `invite_class_*` & teman-temannya sudah ada di `i18n/locales/{id,jp}.js` sejak fitur dibuat; yang masih literal di HTML: placeholder textarea daftar ortu, placeholder input link grup, dan deskripsi section baru di panel WA Pintar.
- **Key baru ditambahkan** (id + jp): `ui.invite_class_wa_desc` (deskripsi panel WA), `ui.paste_list_placeholder`, `ui.group_link_placeholder`.
- **HTML di-wire**: `data-lang-placeholder` di 2 input modal + `data-lang` di deskripsi section WA → semua teks kini ikut bahasa (ID/JP) via `renderLanguage`.
- **Verifikasi**: preview ID & JP — deskripsi, placeholder, judul modal berganti bahasa dengan benar; lint bersih (tanpa duplikat baru), test 148/148.

## 2026-08-17 — `94f097f` 🎨 Tombol "Undang Grup Kelas" dipindah ke panel WA Pintar (admin-wa)

### Ringkasan

- Tombol Undang Grup Kelas (undangan WA ke Orang Tua/Wali) sebelumnya ada di card Penerimaan Siswa; kini dipindah ke **tab WA Pintar** (`admin-wa`) sebagai section tersendiri dengan deskripsi + tombol "Mulai Kirim Undangan" — semua alat WhatsApp admin jadi satu tempat.
- Modal & logika tidak berubah (`bukaModalUndanganKelas` → `kirimTawaranMassal`); verifikasi preview: 1 tombol di panel WA, klik membuka modal, 0 error.

## 2026-08-17 — `2e9d78a` 🐛 Fix: `Aksi tidak dikenal: hapusTugas` — action hapusTugas tidak terdaftar di api-client.js

### Ringkasan

- **Gejala**: Papan Tugas Tim Admin (admin.html) memanggil `hapusTugasAdmin` → `callAPI('hapusTugas', ...)` → api-client mengembalikan "Aksi tidak dikenal" karena `hapusTugas` **tidak ada** di `ADMIN_ACTIONS` maupun `NETLIFY_FUNCTIONS` (backend `handleHapusTugas` sudah ada di `actions-schedule.js` + `action-registry.js` sejak lama).
- **Fix**: daftarkan `hapusTugas` di `ADMIN_ACTIONS` (kirim session admin) + `NETLIFY_FUNCTIONS` (`schedule-reminders`) — sejajar `tambahTugasBaru`/`setTugasStatus`.
- **Verifikasi**: preview — `callAPI('hapusTugas', ['fake-id'])` kini sampai backend (respons "Tugas tidak ditemukan."), bukan error client; console 0 error. Test 148/148.

## 2026-08-17 — `650098d` 🛡️ Audit TDZ (let/const) seluruh js/* + fix TDZ `timer` di bacaFileBase64

### Ringkasan

- **Audit diperluas** (`.freebuff/audit-hoisting.mjs`): selain hoisting `var`, kini mendeteksi **temporal dead zone** — pemakaian `let`/`const` sebelum deklarasi di blok yang sama/lebih dalam. Tokenizer char-level menangani string, comment, template literal (termasuk tokenisasi penuh ekspresi `${...}`: string/regex/comment — memperbaiki false-positive flag regex `g`), regex literal, CRLF/lone-CR, arrow function (paren + single-param), function expression, dan loop `for`/`for-of`/`for-in`. Tervalidasi menangkap bug `esc` lama + 3 kasus TDZ sintetik.
- **Bug nyata ditemukan & diperbaiki**: `js/03_candidate.js` `bacaFileBase64` — `done()` memakai `clearTimeout(timer)` sebelum `const timer` di-deklarasi; `done(null)` dipanggil sinkron untuk input kosong → ReferenceError TDZ. Deklarasi `timer` dipindah ke atas `done` + komentar penjelas. Verifikasi: jalur input kosong di preview kini resolve `null` (sebelumnya crash).
- **Hasil audit akhir: 0 temuan** di seluruh `js/*` (hoisting + TDZ). Test 148/148, lint bersih, build idempoten.

## 2026-08-17 — `ec61aa5` 🛡️ Audit pola hoisting js/render + js/engine + unit test renderFormInbox (jalur f.docs)

### Ringkasan

- **Audit hoisting otomatis** (`.freebuff/audit-hoisting.mjs`, tokenizer char-level yang menangani string/comment/template/regex literal) memindai semua modul `js/render/*`, `js/engine/*`, dan seluruh `js/*` — **0 temuan** pola "fungsi dipanggil sebelum deklarasi `var`" pasca-fix `esc` (tervalidasi: skrip menangkap bug `esc` di versi lama `3c1e493`).
- **Guard defensif** di `renderFormInbox`: `esc` lokal kini fallback ke `window.esc` bila undefined (mis. deklarasi dipindah lagi oleh refactor) → inbox tidak mati total.
- **Unit test baru** `js/render/mail.test.js` (3 test): render dengan `f.docs` non-kosong (jalur bug) tidak throw, nama dokumen di-escape (payload HTML dinetralkan), baris tanpa docs normal. Total suite **148/148**.

## 2026-08-17 — `0b3edbe` 🐛 Fix: Error Render "f is not a function" di Mail Inbox (renderFormInbox)

### Ringkasan

- **Bug pre-existing** (ada sejak sebelum sesi ini): `renderFormInbox` memanggil `esc(...)` di `forEach(f.docs)` sebelum `var esc` di-assign → hoisting membuat `esc` undefined → TypeError. Muncul hanya saat ada lamaran ber-dokumen tambahan.
- **Fix**: deklarasi `var esc` dipindah ke atas fungsi; duplikat di loop dihapus.
- **Verifikasi**: lint 0/12 · test 145/145 · build (`app-45f0576074.js`) · smoke renderFormInbox + simulasi data docs OK, 0 error.

---

## 2026-08-17 — `4135421` 🔧 Refactor: registry seam lengkap — non-fungsi eksplisit, guard tabrakan nama, dispatcher delegasi `data-action`

### Ringkasan

- **`registerSeamAliases` terima non-fungsi eksplisit** (`{ allowNonFunction: true, source }`) — `THEMES` & `urlFotoJeklin` masuk registry (210 alias); `helpers_cv.js` tetap pengecualian (vitest).
- **Guard tabrakan nama seam** — re-registrasi nilai beda → `console.warn` + label `source`; nilai sama = idempotent.
- **Dispatcher `data-action`** (bridge.js) — 1 listener document (click/change), resolve via SEAM_ALIASES → fallback window, argumen JSON `data-action-arg`, `false` → preventDefault; HTML lepas dari `window.fn` untuk handler polos.
- **131 handler dipindah** di admin.html/index.html (`changePage`, `adminSwitchTab`, `filterPublicData`, `bukaModal*`, `setSortDb`, `openRincianBuilder`, ...); ~50 tetap inline (ekspresi/multi/`this`).
- **Test** `js/core/bridge.test.js` (6 test, dynamic import + stub global).

### Verifikasi

- no-undef 0 · lint 0/12 · unit test **145/145** · build idempoten (`app-6cd19287b4.js`) · audit HIGH=0 · smoke preview: 210 alias, semua data-action ter-resolve, klik delegasi bekerja, 0 error JS.

---

## 2026-08-17 — `58340e4` 🔧 Refactor: sentralisasi alias seam modul bundel — 208 self-alias `window.X = X` → `registerSeamAliases` via bridge

### Ringkasan

- **208 self-alias fungsi di 39 modul bundel dipindah ke `registerSeamAliases`** (`render/*`, `admin_ops/*`, `admin_modal/*`, `api/*`, `ai_copilot/*`, `engine/*`, `init/*`, esign, rincian builder, cv, upload-guard) — tiap modul import bridge + 1 panggilan registrasi; alias HTML↔JS kini terpusat di registry `SEAM_ALIASES` (audit `getSeamAliases()`).
- **`js/apply-docs.js`** (standalone apply-full) ikut via bridge — `applyDocsPlan` terdaftar + tetap `window.applyDocsPlan` untuk pemakai classic.
- **Tetap `window.X = X` (sengaja)**: non-fungsi (`THEMES`, `urlFotoJeklin`) & `helpers_cv.js` (guard `typeof window` untuk vitest).
- **Skrip migrasi** `.freebuff/sentralisasi-alias.mjs` EOL-preserving — repo campuran CRLF/LF/lone-CR; menulis LF murni membuat `git diff` churn penuh (bug yang ditemukan & diperbaiki di sesi ini).

### Verifikasi

- no-undef 0 error · lint 0/12 · unit test **139/139** · build idempoten (`app-5a15730349.js`) · audit HIGH=0 · smoke preview: admin **208 alias** di registry, index/share/apply-full OK, 0 error JS.

---

## 2026-08-17 — `ee3e44d` 🔧 Refactor: Fase 3.5 L2-6 tuntas — jembatan `window.*` → import nyata + sentralisasi alias seam via bridge

### Ringkasan

- **Sentralisasi PortalBridge (jalur unblock)** — `js/pages/*` jadi entry ESM (import core via `js/core/bridge.js`; tag core HTML standalone dihapus, `?v=esm14`); `bridge.js` masuk STACK bundel (index/admin punya `window.PortalBridge` + `registerSeamAliases`, hanya import core → aman); alias seam HTML↔JS di 5 halaman standalone diregistrasikan terpusat via `registerSeamAliases({...})` (`SEAM_ALIASES` registry private + `getSeamAliases()` untuk audit) menggantikan blok `window.X = X`.
- **Fase 3.5 L2-6** — state accessor, render/api lintas domain, helper classic → import binding; 89 alias mati dihapus (337→236).
- **Merge Undang Grup Kelas (`10a45bc`)** — modal tempel daftar `Nama|WA` + link grup + template pesan multi-varian (`---`) bergilir anti-ban; reuse `kirimTawaranMassal`.
- **🐛 Fix** — alias `window.normalizeWaInput`/`isValidWaInput` dipulihkan di `04_auth.js` (hilang saat pembersihan L6 → `parseDaftarOrtu` menolak `0xx/8xx`; smoke E2E menangkap).
- **Test** — `buildPesanTawaranMassal` diekstrak (murni, perilaku sama) + `actions-wa.test.js` 8 test rotasi varian/placeholder/fallback; `e2e/undang-grup-kelas.mjs` Playwright (stub `callAPI` → tidak mengirim WA beneran).

### Verifikasi

- Unit test **139/139** (131 + 8) · lint 0 error / 12 warning baseline · build idempoten (`app-7bc915049b.js`, 46 file, 0 kolisi) · smoke preview: parse ortu (2 valid + 1 invalid), preview varian, payload `kirimTawaranMassal` tertangkap dengan WA ternormalisasi `628…` · E2E Playwright butuh Node ≥22 (macet di Bun/Windows).

---

## 2026-08-17 — `4fa4114` 🔧 Refactor arsitektur: WA rules satu sumber, registry action/build, harness E2E, dedupe rules murni, i18n split (Fase 4) + import nyata core (Fase 3.5 L1)

### Ringkasan

- **`shared/wa-rules.js`** (baru) — satu-satunya sumber `normalizeWa`/`isValidWaFormat`, dipakai frontend (`js/04_auth.js`) + backend (`db/client.js` re-export ke 19 pemakai). Drift nyata diperbaiki: frontend menerima `8xx…` sedangkan backend menolak.
- **`scripts/module-registry.mjs`** (baru) — STACK 45 file / halaman / partial modal satu sumber untuk `build-js`, `build-html`, `check-globals`, `module-map`. Bonus: hash VERSION modals dihitung atas konten LF → stabil di mesin CRLF (fix root-cause `sw.js` selalu dirty setelah build).
- **`netlify/functions/_lib/action-registry.js`** (baru) — dispatcher tabel 60+ action + grup rate limit; `handlers.js` −195 baris. Test kontrak: setiap `callAPI('x')` frontend wajib terdaftar di registry.
- **`e2e/harness.mjs`** (baru) — `check`/`waitFor`/`launchBrowser`/`finish` satu tempat untuk 4 skrip E2E (login, upload, biodata, share).
- **`scripts/dedupe-rules.mjs`** (baru) — aturan merge dedupe (pickKeeper, fuzzyCluster, deep-merge `ai_data_json`) jadi fungsi murni testable; skrip CLI tinggal orkestrasi.
- **i18n** — `i18n.test.js` paritas id↔jp (1.125 key) + fix `ui.toast_wa_format` jp (user JP sebelumnya melihat key mentah). Fase 4: `i18n.js` dipecah jadi `i18n/core.js` + `i18n/locales/{id,jp}.js`; `i18n.js` tetap agregat re-export + alias `window.*`.
- **Fase 3.5 Langkah 1** — `callAPI`/`tr`/`showToast`/`safeSet` jadi import nyata di 9 file (`04_auth`, `engine/*`, `render/*`); `window.*` hanya di seam HTML onclick.

### Verifikasi

- Unit test **131/131** (sebelumnya 91) · lint 0 error / 12 warning baseline · build idempoten (`app-4c52ddca9f.js`, VERSION `-mb4f9dc47` stabil) · **4 E2E SEMUA LULUS** (via Node.js v24.19.0 portable — Playwright tidak kompatibel di Bun/Windows) · preview live render + toggle bahasa JP/ID bekerja.

---

## 2026-08-16 — `f10c98a` 🛠️ L/P siswa baru, auto-fill AI form, biaya magang 5,5 Jt, lock naitei by LULUS

### Gejala

- Kolom **L/P** di modal "Pendaftaran Siswa Baru" selalu `-`.
- **AI form lamar**: setelah chat nama lengkap dijawab benar, tabel/form tidak terisi langsung.
- Biaya magang pendidikan tampil **5 Jt** (harus 5,5 Jt).
- **E-Sign & Data Naitei** terbuka padahal kandidat belum lulus (lock terlalu longgar).

### Akar masalah

- `processSiswaAIChat` & `processAIChat` cuma mengembalikan **teks balasan** — tidak pernah `data` terstruktur, padahal frontend (`siswa_baru.js`/`ai_form.js`) sudah punya jalur `res.data` → `updateFormUI()`. Akibatnya `respon_siswa_baru.jenis_kelamin` null → L/P `-`, dan form AI tidak pernah terisi otomatis.
- Normalisasi gender ada banyak varian (backend `PRIA/WANITA`, frontend inline, situs lama `LAKI-LAKI/PEREMPUAN`).
- `bukaModalTtd` memakai regex tahapan (LOLOS..NAITEI) yang terlalu longgar — kebuka sebelum kandidat LULUS.

### Perbaikan

- `ai/chat.js`: `processAIChat` + `processSiswaAIChat` kini meminta Gemini balas **JSON `{reply, data}`** (parse `parseJsonLoose`, fallback teks). Skema data persis `fieldPaths` ai_form / key form siswa; gender dinormalisasi `LAKI-LAKI`/`PEREMPUAN`. `res.data` → form auto-fill langsung.
- `db/client.js` `normalizeGender` → satu-satunya normalisasi, kanonikal `LAKI-LAKI`/`PEREMPUAN`; `actions-register.js` mapping → `L`/`P`; render modal siswa pakai nilai kanonikal (varian inline dihapus); `client.test.js` diperbarui.
- `i18n.js` (id `5,5 Jt`, jp `550万ルピア`) + fallback `index.html`/`admin.html` — biaya magang pendidikan 5 → 5,5 Jt.
- `js/12_esign_match.js` `bukaModalTtd`: lock naitei hanya untuk kandidat **SUDAH LULUS** (`LULUS`/`LOLOS`/`APPROVED`/`APPROVE`), admin bebas.
- `AGENTS.md` §6 baru: aturan lock fitur kandidat + satu normalisasi gender (biar AI tidak bingung).

### Verifikasi

- Unit test **91/91**; `bun run build` sukses (`app-0464d48a8c.js`).
- Diag live: submit siswa `laki-laki` → L; AI siswa → `{data:{gender:'LAKI-LAKI', nama:'Budi Santoso'}}`; AI master → `{data:{identitas:{nama_lengkap:'Siti Aminah', gender:'PEREMPUAN'}, fisik:{tb:'160'}}}`.
- E2E: standalone-smoke 15/15, login-check, modal-runtime-check, upload-check, biodata-check — semua lulus.
- Lock naitei browser: AGUS (MENUNGGU) ditolak + toast; ANGGUN (LULUS) modal terbuka.

---

## 2026-08-16 — `89a1f03` 🔍 Reload-loop ai_form + anti-duplikat lamaran (database_asj_form)

### Gejala

- Halaman **ai_form** (AI form / CV AI) reload berulang tak berujung (14× load/detik), chatBox kosong.
- Duplikat lamaran di mail inbox: WA `6285692313050` + job `UMUM` ada 2 baris (#143 LULUS + #229 MENUNGGU) — "lamar loker dobel".

### Akar masalah

- `ai_form`: guard VIP memanggil `getAppData('kandidat')` tanpa sesi kandidat → backend `sessionInvalid` → `callAPI` reload halaman → loop.
- `database_asj_form` **tanpa constraint unik `(no_wa, code_job)`** + semua jalur simpan GET-then-POST → race paralel bisa bikin baris dobel. Baris #229 dibuat situs lama (`asjportal.netlify.app`, DB sama) — `timestamp` null, bukan lewat `submitApply` baru.

### Perbaikan

- `js/pages/ai_form.js`: tanpa sesi kandidat, dibiarkan masuk (keputusan final di server).
- `db/forms.js`: helper `upsertFormRow` — POST `on_conflict=(no_wa,code_job)` + `Prefer: resolution=merge-duplicates`, fallback INSERT bila constraint belum ada (42P10). Dipakai `submitApply`, `simpanKandidatDanUpload`, `syncFormMailDariUpload`.
- Dedupe data: `bun run dedupe:apply` → gabung ke #143 (LULUS, deep-merge `ai_data_json`), hapus #229; koreksi `tgl_lahir` kembali ISO `2001-08-01` + trim `tempat_lahir`. Dry-run kini 0.
- `e2e/standalone-smoke.mjs` baru (15 cek standalone).

### ⚠️ Perlu aksi di Supabase (jaminan anti-dobel permanen)

```sql
ALTER TABLE database_asj_form
ADD CONSTRAINT database_asj_form_no_wa_code_job_key UNIQUE (no_wa, code_job);
```

### Verifikasi

Test 91/91 · lint 0 error · `node --check` ✓ · dedupe dry-run 0 ✓ · live: 3× submitApply WA+job sama → 1 baris (usia terbaru menang) · E2E 8 suite lulus (saat preview hidup).

---

## 2026-08-16 — 🐛 Fix CV Master: simpan gagal total + kenalan/auto-fill kosong

### Gejala (laporan user)

- "Tadi saya tes CV master, kok data saya ada yang kosong perasaan sudah terisi." (Netlify lama = pembanding; bedanya hanya modular vs global.)
- Simpan Form Master Lengkap selalu error `Gagal simpan Master: Could not find the 'keluarga_1_gaji' column` (HTTP 400 PGRST204) — **setiap** simpan master-full gagal total.
- Auto-fill Form Master: kolom "Alamat di Jepang" (kenalan) kosong padahal terisi (TOKYO) di Netlify lama.
- Simpan CV AI (ai_form) menghapus data kenalan dari master.

### Akar masalah

- `handleSubmitMasterForm` menulis **30 kolom yang tidak ada** di tabel `master_database_candidate` (skema 154 kolom; diverifikasi via `getSchema`): `keluarga_N_gaji` (semua), `keluarga_2..5_*`, `pendidikan_{1,2,4,5}_jurusan_id`, `pekerjaan_{2,3}_gaji`, `kenalan_di_jepang_{pekerjaan,usia,alamat}`. Satu kolom salah → Supabase 400 → seluruh simpan dibatalkan.
- `getMasterDataByWa`/`buildMasterNested` hanya membaca kolom → kenalan pekerjaan/usia/alamat & versi JP (yang cuma ada di `ai_data_json`) tampil kosong.
- `submitDataAsj` menimpa `ai_data_json` dengan 8 seksi form AI → `kenalan_jepang`/`context`/file hilang.
- `ai/cv.js` punya salinan `buildMasterNested` tanpa merge ai_data_json → konteks admin AI copilot tidak lengkap.

### Perbaikan (`netlify/functions/_lib/actions-master.js`, `netlify/functions/_lib/ai/cv.js`)

- `MASTER_COLUMN_MISSING` (30 kolom) → dibuang dari body simpan; nilai non-kosong disimpan ke `ai_data_json` lewat `buildAiOverflow` + `mergeAiOverflow` (deep-merge newest-wins) → simpan berhasil + round-trip utuh.
- `buildMasterNested.kenalan_jepang` merge `ai_data_json.kenalan_jepang` (fill-if-empty) → preview CV & auto-fill ai_form lengkap.
- `handleGetMasterDataByWa` fallback kenalan ke ai + key JP parity (parity dengan Netlify lama).
- `submitDataAsj` pertahankan kunci non-managed (kenalan_jepang, context, fotoFile/jftFile/sswFile).
- `ai/cv.js` pakai `buildMasterNested` shared dari actions-master.js (satu sumber, tanpa drift).

### Verifikasi

- Test **91/91** (10 baru: `actions-master.test.js` — set kolom tak-ada, buildAiOverflow, mergeAiOverflow) · lint 0 error · `node --check` ✓.
- Diag live (backup+restore penuh, WA AGUS KHOCI): simpan master-full `success:true` (dulu selalu 400) · round-trip kenalan OK (simpan OSAKA → baca flat+nested terisi, JP dari ai) · submitDataAsj tidak menghapus kenalan_jepang · getDrafCvMaster/getMasterDataByWa vs Netlify lama: sisa perbedaan hanya alias key (nilai sama).

---

## 2026-08-16 — ⚡ Fix: AI lambat & 502 — pakai model Gemini LITE (sama dengan Netlify lama)

### Gejala (laporan user)

- "Check semua AI, keknya lemot bgt dan setelah balasan pertama gak bales eror."
- Di Netlify baru (`asjportal-379`) respons AI bisa **30 dtk → HTTP 502** (timeout fungsi Netlify); di Netlify lama (`asjportal.netlify.app`) AI jalan **±1 dtk**.

### Akar masalah

- Urutan model di `netlify/functions/_lib/ai/providers.js` memakai flash penuh yang tidak cocok untuk key saat ini (dibuktikan dgn tes langsung ke API Gemini, key sama):
  - `gemini-flash-latest` → **503 "high demand"** (tiap request buang 3–9 dtk),
  - `gemini-3.5-flash` → **200 tapi 7–29 dtk** (sering kena limit waktu fungsi Netlify → 502),
  - `gemini-2.5-flash` → **404** (tidak tersedia untuk key baru).
- Netlify lama respons ±1,0–1,4 dtk → dia pakai model **LITE** (`gemini-flash-lite-latest` / `gemini-3.5-flash-lite`), yang dites stabil **0,4–1,7 dtk**.
- Bonus: panggilan dengan history berakhiran giliran model (asinkron di frontend) kena **Gemini 400 "Requests ending with a model turn are not supported"** → balasan "AI sedang sibuk" setelah chat pertama.

### Perbaikan (`netlify/functions/_lib/ai/providers.js`)

- Urutan model → `['gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.5-flash']` — LITE pin yang paling stabil dulu, lalu alias LITE terbaru, flash penuh hanya fallback terakhir.
- **Timeout per-model 7 dtk** (`AbortSignal.timeout`) — model menggantung tidak lagi menghabiskan budget fungsi Netlify.
- **Trim giliran model di akhir history** sebelum dikirim — mencegah error 400 & balasan "AI sibuk" palsu di chat multi-putaran.

### Verifikasi

- Handler `processAIChat` 3 panggilan (kosong → user+assistant → history penuh): **1,1 dtk / 0,8 dtk / 0,7 dtk** (sebelum: 72 dtk / 14 dtk / 29 dtk).
- Test **81/81** ✓ · lint 0 error ✓ · `node --check` ✓ · `bun run build` ✓.

---

## 2026-08-16 — 🐛 Fix: teks JFT/SSW & pendidikan di modal CV Mini (kandidat) tidak tersimpan

### Gejala (laporan user)

- Di modal **Update CV Mini** (dashboard kandidat): ganti usia/TB/BB/gender
  tersimpan, tapi ganti **teks JFT/JLPT** & **Bidang SSW** tidak tersimpan
  (setelah refresh kembali ke nilai lama). Field Pendidikan Terakhir ikut
  bermasalah (kelas bug yang sama).

### Akar masalah

- `prosesSimpanCvMini` (`js/03_candidate.js`) mengirim key `jft_text` /
  `ssw_text` ke action `simpanUpdateMaster` → `handleSubmitMasterForm`
  (`netlify/functions/_lib/actions-master.js`).
- Handler hanya mengenal `nilai`/`lisensi` (MASTER_COLUMN_MAP → kolom
  `jft`/`bidangssw`) dan `jftText`/`sswText` (jalur admin
  `updateKandidatSuper`) — key CV mini **diabaikan diam-diam**, jadi kolom
  `nilai_jft_text`/`bidang_ssw_text` (database_candidate) & `jft`/
  `bidangssw` (master) tidak pernah di-update. `pendidikan` string dari CV
  mini juga tidak dipetakan (master-full kirim array slot).

### Perbaikan (additif, tidak mengubah kontrak jalur lain)

- `actions-master.js` — `handleSubmitMasterForm`: normalisasi key
  `jft_text`/`jftText` → `nilai`, `ssw_text`/`sswText` → `lisensi` sebelum
  loop MASTER_COLUMN_MAP (guard `d[to] === undefined` → jalur
  master-full/AI form yang sudah kirim `nilai`/`lisensi` tidak tersentuh).
  Pendidikan string (CV mini) → `pendidikan_1_tingkat` (master) +
  `pendidikan` (database_candidate) via sync kandidat.
- `js/03_candidate.js` — bersihkan artefak double-prefix
  `window.window.safeSetVal('um-usia',` → `window.safeSetVal('um-usia',`
  (baris korup dari konversi ESM; selama ini jalan karena `window.window`
  valid, tapi berantakan).

### Verifikasi

- Unit test **81/81** ✓ · lint 0 error ✓ · `bun run build` ✓ (bundel
  `app-ddf857242b.js`).
- E2E CV Mini (Playwright, preview lokal): login kandidat → ubah teks
  JFT/SSW → simpan → **nilai tampil kembali setelah refresh** (terbukti
  tersimpan di database_candidate) → nilai asli dipulihkan. ✓
- Regresi: `login-check` ✓ · `biodata-check` (jalur `simpanUpdateMaster`
  yang sama) ✓.

---

## 2026-08-16 — Fase 3.18 lanjutan: pembersihan index redundan (perf)

### Index redundan dibuktikan dari pg_indexes

- `idx_cand_no_wa` redundant dengan `idx_dc_no_wa_loker`
  (btree (no_wa, id_loker_pilihan) — prefix no_wa melayani lookup WA).
- `idx_master_no_wa` redundant dengan constraint unik
  `master_database_candidate_no_wa_key` (UNIQUE btree no_wa).

### Revisi file migrasi

- `2026-08-16-index-perf.sql`: CREATE idx_cand_no_wa & idx_master_no_wa
  dihapus; section 4 baru berisi DROP INDEX IF EXISTS keduanya (idempotent)
  + catatan opsional verifikasi idx_berkas_wa. File aman ditempel ulang utuh.
- Aksi DB (user, SQL Editor): tempel ulang seluruh file → index redundan
  ter-drop, sisanya tetap. Tanpa perubahan kode backend/frontend.

---

## 2026-08-16 — Fase 3.18: optimasi paralel tarikan data backend (perf)

### Paralelkan query independen (dulu serial)

- `actions-public.js` handleGetAppData: validasi sesi dipindah paling awal
  (lokal, tanpa query); tarikan publik + data kandidat/admin diparalelkan
  via Promise.all (1 gelombang RTT, bukan serial).
- `actions-candidate.js` getCandidatesPage: attachBerkasBio & findFormsByWaList
  paralel (dulu berurutan).
- `db/candidates.js` findCandidateByWaFiltered: probe kolom WA
  (no_wa/wa/whatsapp) via Promise.allSettled paralel; prioritas hasil tetap.
- `db/berkas.js` attachBerkasBio: fetch pemberkasan & master light paralel.

### Hasil terukur (dingin, scripts/verify-index-perf.mjs)

- getAppData kandidat: 2.482–3.043 ms → **1.631 ms** (−45%)
- getCandidatesPage: 1.898–1.965 ms → **832 ms** (−57%)
- getAppData admin: 1.673–1.693 ms → **1.379 ms** (−18%)
- Integritas handler = DB tetap cocok; verifikasi: node --check, lint 0
  error, test 81/81, E2E (backend-fast-path/login/upload/biodata) SEMUA
  LULUS.

---

## 2026-08-16 — Verifikasi Fase 3.17: migrasi index + script ukur performa + E2E penuh (test)

### Script verifikasi read-only

- `scripts/verify-index-perf.mjs` (BARU): cek koneksi Supabase + bukti
  pg_trgm (rpc/show_trgm), timing query REST persis backend (3 ronde),
  timing semua tarikan data handler (dingin → cache), integritas hitung
  handler vs DB count. Jalankan: `node scripts/verify-index-perf.mjs`.

### Migrasi index — konfirmasi terpasang

- 8/8 index dari `2026-08-16-index-perf.sql` terkonfirmasi di `pg_indexes`
  (termasuk `idx_cand_loker_trgm` GIN pg_trgm); extension pg_trgm terbukti
  terpasang via `rpc/show_trgm`.

### Hasil ukur & verifikasi

- Query REST ±260–290 ms (batas latensi; tabel kecil → index belum dipakai,
  tidak ada regresi); cache server-side: getAppData admin 1.690 → 1.096 ms.
- Integritas handler = DB (kandidat 223, inbox 12, loker 132, tugas 2,
  template WA 2, master 225, berkas 5).
- E2E penuh SEMUA LULUS: login 19/19, upload, biodata, modal 8/8, photo 3/3,
  probe-cleanup bersih, share-view, backend-fast-path 12/12 · test 81/81 ·
  lint 0 error.

---

## 2026-08-16 — Fase 3 langkah 17: optimasi query backend — index SQL + cache server-side kandidat (perf)

### Migrasi index SQL (Supabase/PostgreSQL)

- `netlify/migrations/2026-08-16-index-perf.sql`: index utk query tersibuk
  getAppData — `database_asj_form(timestamp DESC / no_wa / code_job)`,
  `database_candidate(updated_at DESC / no_wa)` + GIN pg_trgm
  `(id_loker_pilihan)`, `pemberkasan_checklist(wa)`,
  `master_database_candidate(no_wa)`. Semua idempotent; termasuk query
  verifikasi (pg_stat_user_tables + EXPLAIN ANALYZE).

### Cache server-side kandidat

- `loadCandidatesUnik` (halaman admin) di-cache in-memory TTL 25 dtk →
  getAppData berulang tidak lagi full-scan `database_candidate` tiap kali.
- Invalidasi `cacheClear()` di SEMUA jalur mutasi kandidat: updateCatatan,
  updateKandidatSuper, formStatus, deleteForm, submitMasterForm,
  submitDaftarSiswa, submitApply, simpanKandidatDanUpload,
  simpanBerkasTahapan, simpanRevisiKandidat + (sesi ini) daftarKandidat,
  tandaiGagalJob, uploadDriveReplacement.

### Verifikasi

- node --check semua file backend ✓ · lint 0/12 ✓ · test 81/81 ✓ ·
  E2E login/upload/biodata SEMUA LULUS ✓.

---

## 2026-08-16 — Fase 3 langkah 16: performa tarikan data — SWR-lite cache + auto-refresh pintar (perf)

### SWR-lite cache di api-client.js

- `getAppData` + `getAppConfig` (tarikan data utama) di-cache in-memory TTL
  10 dtk → navigasi antar-tab SPA render instan tanpa jaringan; siklus
  auto-refresh memvalidasi ulang di background (stale-while-revalidate
  sederhana). Semua action non-pembaca (mutasi/login/logout) meng-invalidate
  cache; sessionInvalid tidak di-cache. Cache in-memory saja (response
  getAppData ratusan KB — tidak aman utk kuota localStorage 5 MB).

### Auto-refresh pintar (js/engine/init.js)

- Interval 60 → 120 dtk; skip total saat `document.hidden` (tab dibuka
  user lain); refresh sekali segera saat tab kembali terlihat
  (`visibilitychange`). Guard lama (modal terbuka / scroll aktif) tetap.

### Verifikasi

- lint 0/12 · test 81/81 · build idempoten (`app-18222bfae2.js`, 420.2 KB)
  · check:globals nol kolisi (408 simbol) · E2E login/upload/biodata SEMUA
  LULUS ✓ + smoke cache: 2× getAppData dalam TTL → delta 1 request (kedua
  dari cache); action non-pembaca → invalidate → fetch ulang; 0 error JS ✓.

---

## 2026-08-16 — Fase 3 langkah 15: aktifkan no-undef permanen + fix 2 bug latent master-full (refactor & bugfix)

### Refactor: no-undef aktif untuk frontend ESM

- `eslint.config.js`: `no-undef: error` utk `js/**/*.js` + `api-client.js` +
  `i18n.js` + `pwa.js` (semua ESM sejak langkah 13). .mjs & netlify functions
  (CommonJS) tetap tanpa no-undef.

### 🐛 Bugfix: 2 bug latent di js/pages/master_full.js (ketahuan scan no-undef)

- 30× `tr(` + 2× `callAPI(` + 1× `cekUploadFile(` bare → di-window-kan
  (sebelumnya ReferenceError saat render box pendidikan/pekerjaan/keluarga
  langkah 3-5 & simpan/upload).
- Bridge alias hilang total (konversi langkah 13): `changeStep`/
  `submitMaster`/`handleFile` tidak di-export & 0 alias window → HTML
  onclick/onchange bakal ReferenceError. Fix: export 3 fungsi + bridge 8
  alias (toggleImaMade/gateLogin/onSswSelect/onPekerjaanSelect/
  onFamPekerjaanSelect/handleFile/changeStep/submitMaster).

### Verifikasi

- lint 0/12 (no-undef aktif) · test 81/81 · build idempoten (app-f90fc61af6.js)
  · E2E login/upload/biodata SEMUA LULUS ✓ + smoke master-full step 1→5
  (edu_tk_1/job_nm_1/fam_nm_1 render, 0 error JS) ✓.

---

## 2026-08-16 — Fase 3 langkah 14: entry js/main.js + esbuild bundle mode (concat → bundle) (refactor)

### Refactor: build bundel admin/index pakai esbuild bundle

- `js/main.js` (BARU): entry side-effect `import` semua modul domain sesuai
  urutan STACK; boot tetap lewat `boot.js` DOMContentLoaded → `initApp`.
- `scripts/build-js.mjs`: concat + ESM_CORE dihapus → `esbuild.build({
  entryPoints: ['js/main.js'], bundle: true, format: 'iife', treeShaking:
  false, minify: true })`. STACK dipertahankan untuk check-globals + validasi.
- Hasil: bundel `app-f90fc61af6.js` (419.8 KB, 45 file via entry), idempoten,
  0 export bocor.

### Verifikasi

- lint 0/12 ✓ · test 81/81 ✓ · check:globals nol kolisi (405 simbol) ·
  audit HIGH=0 · E2E login/upload/biodata SEMUA LULUS ✓.

### Catatan

- `treeShaking: false` wajib (import side-effect + alias window.* harus
  dipertahankan). Halaman standalone tetap `<script type="module">` per
  halaman — bundel hanya untuk admin/index.

---

## 2026-08-16 — Fase 3 langkah 13 (TERAKHIR): semua file halaman standalone jadi ESM (8 file) + HTML type=module — konversi ESM Fase 3 TUNTAS (refactor)

### Refactor: upload-guard, apply-docs, pwa, js/pages/* jadi ES Modules

- `js/upload-guard.js` (cekUploadFile) · `js/apply-docs.js` (applyDocsPlan) ·
  `pwa.js` (cobaInstallApp/bersihkanDraftLamaBase64 + listener top-level +
  migrasi jalan saat evaluasi) · `js/pages/{siswa_baru,share,apply_full,
  master_full,ai_form}.js` — `export` + alias window.* (HTML onclick/onchange/
  onload + string onclick dinamis); state UI (chatHistory/latestCandidateData/
  *Base64/*File) jadi PRIVATE modul.
- 5 halaman standalone (ai_form, apply-full, master-full, share, siswa-baru):
  tag upload-guard/pages/*/pwa.js (+ apply-docs di apply-full) →
  `<script type="module">` — urutan dokumen dipertahankan, inline theme
  classic tetap jalan duluan.
- Build: ESM_CORE + upload-guard + pwa (wajib — keduanya juga di bundel
  admin/index) → bundel `app-cff3e89658.js` (419.5 KB, 45 file, 0 export
  bocor, idempoten). check:globals nol kolisi (405 simbol).

### Verifikasi

- node --check ESM semua file ✓ · no-undef 0 error ✓ · lint 0/12 ✓ ·
  test 81/81 ✓ · E2E login/upload/biodata SEMUA LULUS ✓ + smoke halaman
  standalone (ai_form initApp + sapaan chat + konteks URL, apply-full
  applyDocsPlan, master-full nama terisi, share/siswa-baru render,
  upload-guard & pwa ter-expose, 0 error JS) ✓.

### Catatan

- **Fase 3 TUNTAS** — tidak ada file classic tersisa di frontend. Roadmap
  berikutnya (optimasi, bukan konversi): entry `js/main.js` + esbuild bundle
  mode, lalu evaluasi halaman standalone jadi entry ESM per halaman.

---

## 2026-08-16 — Fase 3 langkah 12: sisa file classic bundle-only jadi ESM (8 file) + fix CURRENT_LANG accessor (refactor & bugfix)

### Refactor: 8 file classic terakhir (bundle-only) jadi ES Modules

- `01_public` (9 fn: tab publik, bahasa, detail loker) · `03_candidate` (22:
  CV mini, bridge form, guard upload, pemberkasan) · `08_wa_pintar` (15:
  WA pintar/template, riwayat kandidat, lightbox) · `10_cv_rirekisho` (5) +
  `10b_cv_builders` (5 builder) + `helpers_cv` (6 helper; UMD → export murni,
  vitest tetap jalan) · `12_esign_match` (16: e-sign canvas, student card,
  matchmaking) · `13_rincian_builder` (24: editor rincian biaya).
  Total ±119 deklarasi → `export` + ±100 alias `window.*`. State internal
  murni jadi PRIVATE modul (`_riwayatLokerAktif`, `fsCanvas`, `signData`,
  `matchedCandidates`, `RB_*` dll); state yang di-reassign tetap accessor
  (`CURRENT_WA_KANDIDAT`, `ACTIVE_PEMBERKASAN_WA/NAMA`).

### Bugfix: toggle bahasa ID/JP diam-diam tidak bekerja (latent sejak Fase 3 langkah 2)

- `CURRENT_LANG` di i18n.js hanya alias data property satu arah —
  `setLanguage` menulis `window.CURRENT_LANG` tapi binding modul i18n basi,
  jadi `tr()`/`trOption()` tetap membalas bahasa lama. Ganti dengan accessor
  `Object.defineProperty(window,'CURRENT_LANG',{get,set})` yang mendelegasikan
  ke binding modul (pola accessor bridge state.js). Diverifikasi di browser:
  toggle id→jp membuat `tr('ui.tab_loker')` = `求人情報` dan DOM ikut berubah,
  balik ke id bersih, 0 error JS.

### Catatan refactor

- 13_rincian_builder: guard `typeof callAPI` di modul scope selalu 'undefined'
  tanpa `window.` prefix → koleksi DB preset tidak pernah dimuat (dicegah).
- helpers_cv: alias window.* dibungkus guard `typeof window !== 'undefined'`
  supaya aman di vitest/node.
- Build: `app-5718b3d669.js` (419.5 KB, 45 file, 0 export bocor, idempoten) ·
  check:globals nol kolisi (401 simbol) · audit 403 simbol HIGH=0 · lint 0/12
  · test 81/81 (helpers_cv 24/24) · E2E login/upload/biodata/backend lulus.

---

## 2026-08-16 — Fase 3 langkah 11: init js/init/{theme,preview,nav,boot} ESM + fix window.THEMES (refactor & bugfix)

### Refactor: theme, preview, nav, boot jadi ES Modules

- **Tidak ada perubahan perilaku** — zero regression (test 81/81, E2E login/upload/biodata SEMUA LULUS).
- 4 file (18 deklarasi) → export + 22 alias window.*; `VENDOR_V`/`_vendorPromises` jadi PRIVATE modul (tanpa pemakai eksternal).
- Referensi global implisit di-window-kan eksplisit (no-undef 0 error): state via accessor (CURRENT_THEME/ASSETS/isAdmin/current*/AUTO_REFRESH_TIMER/PREV_MAIL_COUNT), util/render/core via window, classic injectModalWaPintar, vendor XLSX.
- Bundel `app-ad18b34535.js` (418.6 KB, 0 export bocor, nol kolisi, idempoten). Audit 52 file / 396 simbol, HIGH=0.

### 🐛 Bugfix: `window.THEMES` undefined — crash dashboard admin KHOCI

- E2E login-check gagal: `Cannot read properties of undefined (reading 'INTER_VIP')` di dashboard admin — `render/public.js:217` memakai `window.THEMES[window.CURRENT_THEME]`, tapi setelah THEMES jadi scoped modul `window.THEMES` undefined (dulu global `var THEMES`).
- Fix: alias `window.THEMES` + `window.DEFAULT_ASSETS` di bridge theme.js. Pelajaran dicatat: konstanta lintas-file yang dipakai via `window.X` wajib di-alias juga (bukan cuma fungsi).

---

## 2026-08-16 — Fase 3 langkah 10: ai_copilot js/ai_copilot/* ESM (refactor)

### Refactor: admin, interview, parse, results jadi ES Modules

- **Tidak ada perubahan perilaku** — zero regression (test 81/81, E2E login/upload/biodata SEMUA LULUS).
- 4 file (21 deklarasi + 4 state) → export + 14 alias window.*; `currentAiCandidateId` pakai **accessor bridge** (di-reassign admin.js, dibaca parse/results — alias biasa basi); `urlFotoJeklin` alias biasa.
- Panggilan lintas modul di-window-kan eksplisit (§3.3): `window.pastikanBarParseAdminAi`, `window.tambahPesanAdminAi`, `window.currentAiCandidateId`; referensi global implisit lain (no-undef 0 error): state accessor + classic `isVipCatatan`.
- Bundel `app-5b7f5a3192.js` (418.4 KB, 0 export bocor, nol kolisi, idempoten). Audit 52 file / 396 simbol, HIGH=0.
- Verifikasi tambahan di browser: modal AI copilot terbuka, bar parse ter-inject, saran AI tampil, accessor live, klik Hasil Wawancara tanpa error JS.

---

## 2026-08-16 — Fase 3 langkah 9: admin_ops js/admin_ops/* ESM (refactor)

### Refactor: schedule, candidates, sysconfig, loading, migration, drive jadi ES Modules

- **Tidak ada perubahan perilaku** — zero regression (test 81/81, E2E login/upload/biodata SEMUA LULUS).
- 6 file (27 deklarasi) → export + 26 alias window.*; `DRIVE_CANDIDATES` di-export tanpa alias (internal, tanpa pemakai eksternal).
- Referensi global implisit di-window-kan eksplisit (no-undef 0 error): state via accessor (isAdmin/isKandidat/ALL_SCHEDULES/limitJad/currentCopyListTxt/DROPDOWNS), core/util via window, api/forms.js ESM (upsertCandidateMemory/patchFormMail), helper classic (cekEkstensiFile), `event` → `window.event` (strict mode).
- Bundel `app-079a607684.js` (418.5 KB, 0 export bocor, nol kolisi, idempoten). Audit 52 file / 396 simbol, HIGH=0.
- Verifikasi tambahan di browser: tab Pengaturan render (11 kategori dropdown), tabel Jadwal, modal list kandidat terbuka + terisi, 0 error JS.

---

## 2026-08-16 — Fase 3 langkah 8: admin_modal js/admin_modal/* ESM (refactor)

### Refactor: dbfilter, cv, job jadi ES Modules

- **Tidak ada perubahan perilaku** — zero regression (test 81/81, E2E login/upload/biodata SEMUA LULUS).
- 3 file (14 deklarasi) → export + 14 alias window.*; `toDateInputValue` (definisi di cv.js) tetap tersedia via `window.toDateInputValue` untuk api/candidates.js.
- Referensi global implisit di-window-kan eksplisit (no-undef 0 error): state via accessor (dbFilter*/DROPDOWNS/ALL_CANDIDATES/ALL_DB_JOBS/ASSETS/isAdmin), helper classic (jobTutupUntukLamar, bukaFormBridge, bukaPreviewDokumen, normalizeGenderValue, previewFileInFrame).
- Bundel `app-1057be7ccc.js` (417.7 KB, 0 export bocor, nol kolisi, idempoten). Audit 52 file / 396 simbol, HIGH=0.
- Verifikasi tambahan: modal CV digital dibuka via `window.bukaDigitalCV` (ESM) di browser — render nama kandidat + tombol Edit Cepat, 0 error JS.

---

## 2026-08-16 — Fase 3 langkah 7: api js/api/* ESM + fix artefak `<window.tr>` (refactor & bugfix)

### Refactor: forms, jobs, candidates, wa jadi ES Modules

- **Tidak ada perubahan perilaku** — zero regression (test 81/81, E2E login/upload/biodata + backend-fast-path SEMUA LULUS).
- 4 file api (65 deklarasi) → export + 59 alias window.*; `window.X = async function(){}` → `export async function` + alias (submitRejectForm, ensureAllCandidates, muatLebihKandidat).
- Referensi global implisit di-window-kan eksplisit (no-undef 0 error): state via accessor, `window.MAIL_SELECTED` via accessor, helper classic (cekUkuranFile/bacaFileBase64/normalizeGenderValue/toDateInputValue), vendor `window.qrcode`.
- Bundel `app-ee4db83e37.js` (416.8 KB, 0 export bocor, nol kolisi, idempoten). Audit 52 file / 396 simbol, HIGH=0.

### 🐛 Bugfix: tabel render memakai elemen `<window.tr>` (artefak blanket replace langkah 6)

- 4 file render (public/admin/candidate/mail) punya `'<window.tr class="rt-row...'` + `'</window.tr>'` — blanket `tr(` → `window.tr(` ikut mengubah literal `<tr` di template tabel → style baris (rt-row/border) hilang.
- `<window.tr` → `<tr`, `</window.tr>` → `</tr>` (14 titik). Verifikasi DOM di browser: tabel Mail & DB Job (admin) + landing publik render `tr.rt-row` asli, 0 elemen `window.tr`, 0 error JS.

---

## 2026-08-16 — Fase 3 langkah 6: render js/render/* ESM + fix id kandidat (refactor & bugfix)

### Refactor: public, admin, candidate, share, mail jadi ES Modules

- **Tidak ada perubahan perilaku** — zero regression (test 81/81, E2E login/upload/biodata SEMUA LULUS).
- 5 file render (15 fungsi) → export + alias window.*; `MAIL_SELECTED` pakai accessor bridge (di-reassign `js/api/forms.js`).
- Referensi global implisit di-window-kan eksplisit (no-undef 0 error); 4 alias self-reference korup dari blanket replace diperbaiki (ketahuan E2E).
- Bundel `app-4c1c681c7c.js` (415.3 KB, 0 export bocor, nol kolisi).

### 🐛 Bugfix: simpan biodata 409 — nextCandidateId() tidak melihat master_database_candidate

- E2E biodata-check gagal (modal tidak tertutup, tanpa error JS) → diagnostik: `simpanBiodataLengkap` HTTP 409 `uq_master_id_kandidat` ASJ00226.
- `maxCandidateIdNumber()` kini scan `database_candidate` + `master_database_candidate` (fast path & fallback) — cegah bentrok id ASJ antar-tabel.
- Leftover E2E (2 baris wa 6281201154027) dibersihkan; biodata-check hijau kembali.

---

## 2026-08-16 — Fase 3 langkah 5: engine js/engine/* ESM (refactor)

### Refactor: pipeline, dashboard, guards, init jadi ES Modules

- **Tidak ada perubahan perilaku** — zero regression (test 81/81, E2E login/upload/biodata SEMUA LULUS).
- `pipeline.js` (4 fn), `dashboard.js` (6: BERKAS_17/BIO_FIELDS_19 + render progres), `guards.js` (3: guard auto-refresh + badge mail), `init.js` (2: refreshDataDinamis/initApp) → export + alias window.*.
- Referensi global implisit di-window-kan eksplisit; state writes via accessor bridge (state.js).
- 🐛 Fix phantom global `ALL_CANDIDATES_TOTAL` (dulu di-assign tanpa deklarasi — kini var resmi di state.js + accessor).
- Build `build-js.mjs`: ESM_CORE + 4 entri (bundel `app-a32c94c192.js`, 413.5 KB, 0 export bocor).
- Catatan: antar-file ESM memakai `window.*` eksplisit (belum `import`) sampai bundle jadi ESM — ESM_BRIDGE.md §3.3.

---

## 2026-08-16 — Fase 3 langkah 4: domain auth js/04_auth.js ESM (refactor)

### Refactor: `js/04_auth.js` jadi ES Module (domain per-domain pertama)

- **Tidak ada perubahan perilaku** — zero regression (test 81/81, E2E login/upload/biodata SEMUA LULUS).
- 14 fungsi auth jadi `export` + alias window.* (wajib: pemanggil utama HTML inline onclick + util.js/boot.js lintas file).
- Referensi global implisit di-window-kan eksplisit (`tr`, `callAPI`, `showToast`, `safeSet`, state writes via accessor, `refreshDataDinamis`, `changePage`, `applyInterMilanVibe`) — scan no-undef 0 error.
- Build `build-js.mjs`: ESM_CORE + 1 entri (bundel `app-23ec7d1632.js`, 412.2 KB, 0 export bocor).

---

## 2026-08-16 — Fase 3 langkah 3: state.js & util.js ESM + accessor bridge (refactor)

### Refactor: `js/init/state.js` + `js/init/util.js` jadi ES Modules

- **Tidak ada perubahan perilaku** — zero regression (test 81/81, E2E login/upload/biodata SEMUA LULUS).
- `state.js`: 33 var state jadi `export`; bridge window.* memakai **accessor get/set** yang mendelegasikan ke binding modul — bare reassignment classic (`ALL_JOBS = ...`, `isAdmin = true`, `CURRENT_THEME = theme`) tetap sinkron dengan import ESM berikutnya.
- `util.js`: 19 fungsi jadi `export` + alias window; referensi global implisit di-window-kan (`tr`, `trOption`, `trOptionId`, `esc`, `DROPDOWNS`, `toastWaFormat`) — scan no-undef 0 error.
- Build `build-js.mjs`: ESM_CORE + 2 entri (bundel `app-c06313605c.js`, 411.8 KB, 0 export bocor).
- Audit: 52 file · 395 simbol · HIGH=0 · MEDIUM=24 · LOW=371.
- Pola accessor bridge didokumentasikan di `ESM_BRIDGE.md` §3.2.

---

## 2026-08-16 — Fase 3 langkah 2: core layer ESM + bridge PortalBridge (refactor)

### Refactor: i18n.js & api-client.js jadi ES Modules + `window.PortalBridge`

- **Tidak ada perubahan perilaku** — konversi murni (zero regression; test 81/81, bundel idempoten).
- `i18n.js`: 8 deklarasi publik kini `export` (CURRENT_LANG, LANG, OPTION_TRANSLATIONS, trOption, trOptionId, tr, renderLanguageLight, toggleFormLanguage) + alias `window.*` tetap.
- `api-client.js`: export callAPI/esc/escJs/resolveSelfUrl + alias `window.callAPI` baru; **6 internal jadi private modul** (NETLIFY_API_BASE, CANDIDATE_ACTIONS, ADMIN_ACTIONS, NETLIFY_FUNCTIONS, getApiUrl, callNetlify) — tidak bocor ke global scope lagi.
- Referensi global implisit dalam modul di-window-kan eksplisit (`window.tr`, `window.showToast`, `window.render*`) karena modul strict tidak fallback ke global.
- `js/core/bridge.js`: namespace tunggal `window.PortalBridge` + `safeCallAPI` untuk kode legacy.
- Build `build-js.mjs`: file ESM di STACK concat di-IIFE-kan per file (export di-strip, alias jalan) — bundel admin/index tetap classic (`assets/app-7f821ddf7c.js`).
- Halaman standalone memuat core via `<script type="module">` (ai_form/master-full via bridge; apply-full/siswa-baru api-client; share i18n).
- Baru: `scripts/audit-globals.mjs` (audit global pollution & collision risk; 52 file · 394 simbol · HIGH=0) + dokumen `ESM_BRIDGE.md`.

---

## 2026-08-16 — Fix Simpan Final master-full: id duplikat `ktp` (NIK vs file KTP)

### Fix: rename file input KTP → `ktpFile` (master-full.html)
- **BUG (screenshot live):** klik **Simpan Final** di Form Master Lengkap → alert
  "Terjadi kesalahan sistem: Cannot read properties of null (reading 'length')".
- **Akar:** id `ktp` dipakai 2× — `<input id="ktp" type="number">` (NIK, step Data
  Diri, line 124) dan `<input type="file" id="ktp">` (upload KTP PDF, step
  Dokumen, line 308). `getEl('ktp')` selalu mengembalikan elemen PERTAMA → saat
  simpan, `getEl("ktp").files` = `null` (input number tidak punya FileList) →
  `.files.length` melempar TypeError. Efek samping lain: tombol **PILIH** KTP
  men-trigger input NIK sehingga dialog pilih file tidak pernah terbuka.
- Fix: file input KTP di-rename jadi `ktpFile` (input & tombol PILIH & pembaca
  `fileKtp` di `submitMaster`); NIK tetap `id="ktp"` (valSafe("ktp") tidak
  berubah). Cek id duplikat di halaman lain: bersih.
- Verifikasi: node --check inline script OK; hanya `ktp` yang duplikat sebelum
  fix, `NO_DUP` setelah.

---

## 2026-08-16 — Chat Jeklin tahu data kandidat (tidak tanya TB/BB yang sudah ada)

### Fix: processAIChat suntik ringkasan data kandidat ke prompt AI
- **BUG (screenshot live):** di ai_form.html, Jeklin bertanya "berapa TB & BB" padahal data sudah ada di master (TB 165, BB 57). Akar masalah: `handleProcessAIChat` menerima `payload.currentData` (hasil auto-fill `getDrafCvMaster`) tapi **tidak pernah membacanya** — system prompt hanya instruksi generik, jadi AI buta terhadap data yang sudah terisi.
- Fix: helper `buildRingkasData(cur)` merangkum data terisi (identitas, fisik TB/BB/ukuran, medis, sertifikasi, pendidikan, pekerjaan, keluarga, wawancara) → disuntik ke system prompt + aturan "JANGAN tanyakan ulang data yang sudah terisi / jangan mengaku data itu kosong". Data kosong tidak dilist.
- Bonus: sapaan awal (generateSmartWelcomeMessage) kini juga mendeteksi TB/BB kosong (key i18n `form.chat_missing_tb`/`_bb`, ID + JP) supaya konsisten.
- Verifikasi: unit test baru `buildRingkasData` (51/51), node --check bersih, build:js OK (bundle `app-d80b6b5088.js`).

---

## 2026-08-16 — Fix simpan AI form (CHECK constraint) + verifikasi auto-fill

### Commit `d0c1a71` — Fix: AI form gagal simpan (mode/status ditolak DB)
- **BUG:** `handleSubmitDataAsj` (alur `ai_form.html`) menulis
  `mode:'ai'` + `status:'SUBMITTED'` ke `ai_form_submissions` — tetapi
  tabel itu punya CHECK constraint yang hanya mengizinkan
  `mode='AI_MASTER'` + `status='MENUNGGU'` (HTTP 400, kode 23514).
  Akibatnya **semua simpan dari AI form gagal diam-diam** (toast error,
  tidak ada baris di Supabase) — kandidat bisa mengisi & chat selesai tapi
  datanya tidak pernah tersimpan.
- Fix: mode → `AI_MASTER`, status → `MENUNGGU`, discriminator tetap
  `submitted_via='ai_form'` (konsisten dengan `submitted_via='interview'`
  dari hasil wawancara). Dedup existing juga kini menyaring
  `submitted_via='ai_form'` supaya baris interview tidak tertimpa.
- Verifikasi: round-trip WA tes — 8 seksi (identitas/fisik/medis/wawancara/
  sertifikasi/pendidikan/pekerjaan/keluarga) **semua masuk** ke
  `ai_form_submissions` + `ai_data_json` master ikut ter-update; auto-fill
  browser dengan sesi kandidat asli mengisi semua field (nama, katakana,
  TTL, TB/BB, alamat, HP, email) — tanpa sesi hanya subset identitas
  (by design REVIEW M2); `getMasterDataByWa` (master-full) 140 kolom ✅.

## 2026-08-16 — Sesi: pesan jelas + auto-login kokoh

### `8874164` — Fix: pesan jelas saat sesi berakhir + auto-login lebih kokoh
- **callAPI:** saat backend membalas `sessionInvalid`, tampilkan toast
  "Sesi admin/kandidat sudah berakhir, silakan login lagi" sebelum
  membersihkan storage & reload (dulu diam-diam → data kosong / logout
  sendiri tanpa penjelasan).
- **refreshDataDinamis:** guard auto-login — kalau flag login 'sukses'
  tapi token sesi / WA hilang (localStorage terhapus sebagian), bersihkan
  + pesan jelas; tidak panggil API dengan token kosong (dulu berujung
  data kosong diam-diam).
- Auto-login sudah berjalan (restore localStorage saat app dibuka, token
  tanpa expiry). Diuji: login → reload → dashboard kembali ±3 dtk;
  token palsu → dibersihkan tanpa error JS; login-check & unit 49/49.

---

## 2026-08-16 — Form bridge paksa ke origin sendiri

### `ec24dba` — Fix: form bridge paksa ke origin sendiri (preview lokal & Netlify aktif)
- **Keluhan user:** di local preview "ga bisa check form" (AI master, master
  lengkap, lamaran, dll). Akar: backend `siteBase()` memakai env
  `NETLIFY_SITE_URL` (nilai lama `https://asjportal.netlify.app`) → tombol
  form melompat ke situs lain, bukan aplikasi yang sedang dibuka.
- Helper `resolveSelfUrl(url)` di api-client.js: kalau origin hasil bridge
  beda dengan `window.location.origin`, ganti origin (path/query tetap).
  Dipakai di `bukaFormBridge` (master-full/ai_form/apply-full) &
  `bukaFormSiswa` (siswa-baru.html).
- Bonus: memperbaiki juga kasus live asjportal-379 yang form-nya menunjuk
  situs lama karena NETLIFY_SITE_URL basi.
- Verifikasi: klik "Form Master Lengkap" di preview lokal → navigasi ke
  localhost:3000/master-full.html?wa=...; master-full & ai_form render
  normal tanpa error JS; login-check & unit 49/49.

---

## 2026-08-16 — Jadwal kandidat + selector loker card progres

### `0bd05a6` — Fix: jadwal muncul di kandidat + selector loker di card progres + riwayat lamaran
- **Jadwal kandidat:** getAppData mode kandidat kini membangun `mySchedules`
  (sebelumnya tidak pernah dikirim → panel "JADWAL ANDA" selalu kosong).
  Filter: WA kandidat ada di `daftar_kandidat` ATAU jadwal terkait loker yang
  kandidat lamar. Format objek disesuaikan dgn render (agenda/status/waktu/
  lokasi/link) + `loadSchedules` mengirim `status_jadwal`.
- **Riwayat lamaran:** `kandidatRiwayat` = daftar applications
  (code/status/timestamp), bukan objek kandidat — sebelumnya kode loker
  selalu "-" & card progres tidak bisa difilter per loker.
- **Card "Status Lamaran Terkini":** pill pilihan loker (chip per code_job,
  default loker LULUS/terbaru) — klik = progres tahapan loker itu saja,
  tidak menumpuk semua lamaran. Label kategori kosong tidak lagi "Umum"
  (fallback kode loker). Key i18n `ui.pilih_loker` (ID/JP).
- **Kode Fonnte diverifikasi (tanpa tes kirim):** `fonnteSend` POST
  api.fonnte.com/send dengan Authorization = FONNTE_TOKEN; tidak ada
  reminder otomatis (database_schedule = agenda; pengingat manual).
- Verifikasi: mySchedules via loker lamaran & daftar_kandidat; chips 2 loker
  → klik → 1 kartu; login-check & modal-runtime hijau; unit 49/49.

---

## 2026-08-15 — Wawancara AI jadi percakapan asli + hasil → admin → update biodata

### `7260b93` — Feat: wawancara AI jadi percakapan asli + hasil wawancara → admin → update biodata
- **Feedback user:** dokumen HERLINA cuma contoh; model sebelumnya "mesin cetak
  doc". User minta wawancara seperti **wawancara asli** (bukan nulis dokumen),
  dan hasilnya dikirim ke admin untuk update biodata.
- `processAiInterview` (actions-ai.js): prompt dirombak → **percakapan natural**
  (sapaan hangat → jikoshoukai → 1 pertanyaan per pesan, follow-up menggali,
  reaksi manusiawi, tanpa nomor/daftar). Bidang SSW tetap jadi konteks
  pertanyaan (kaigo/shokuhin/nougyou/kensetsu/jidousha/binbou/sougou).
- **Fix bug pra-ada:** `processAiInterview` tidak terdaftar di CANDIDATE_ACTIONS
  api-client → token sesi kandidat tidak pernah dikirim → wawancara gagal
  sesi. Kini + `selesaikanWawancara` & `simpanHasilWawancara` masuk
  CANDIDATE_ACTIONS.
- **Alur hasil wawancara (baru):** tombol **SELESAI** di simulator →
  `selesaikanWawancara` (Gemini rangkum transcript → JSON {score, nilai,
  rekomendasi, biodata, catatan}) → `simpanHasilWawancara`
  (ai_form_submissions, `submitted_via='interview'`; mode/status pakai
  AI_MASTER/MENUNGGU karena CHECK constraint tabel) → admin lihat via
  **Hasil Wawancara** & terapkan via **Update Biodata** (submitMasterForm
  admin). Fallback marker `===HASIL===` di chat tetap ada.
- Verifikasi in-process: Q1 natural tanpa nomor; selesaikanWawancara → hasil
  score 6/C + 5 field biodata; simpan OK; getHasilWawancara admin OK;
  cleanup OK. Unit test **49/49**.

---

## 2026-08-15 — Model wawancara AI per bidang SSW

### `59c6fed` — Feat: model wawancara AI per bidang SSW (14 pertanyaan gaya dokumen isian)
- Contoh dokumen user: jawaban wawancara kaigo HERLINA (14 pertanyaan: ID +
  romaji + panduan jawaban ID/romaji/kanji + instruksi isi di Drive).
- `processAiInterview` kini SSW-aware: resolve bidang dari master/kandidat
  (kaigo, shokuhin, nougyou, kensetsu, jidousha, binbou, sougou + default),
  14 pertanyaan berurutan, pertanyaan khusus bidang, evaluasi + skor akhir.
- Action admin `generateWawancaraModel`: dokumen model wawancara lengkap per
  kandidat (dukung kandidat belum terdaftar via override bidang) siap disalin.
- UI: simulator auto-start tanya Q1; tombol **Model Wawancara** + kolom
  Bidang di bar AI copilot admin.
- Verifikasi: Q1 format model OK; model Kaigo/Osaka 14 pertanyaan + romaji +
  kanji; unit test 49/49; build:js bersih (bundle `app-02d4835cb1.js`).

---

## 2026-08-15 — Admin parse dokumen biodata (upload CV/Excel/PDF → Gemini)

### `5081693` — Feat: admin parse dokumen biodata (upload CV/Excel/PDF → Gemini → update master)
- **Kebutuhan user:** admin tidak perlu ketik biodata manual — cukup upload file
  CV/biodata kandidat (doc/Excel/PDF) di panel AI copilot, sistem parse & update
  status biodata kandidat otomatis.
- Action baru `parseDokumenBiodata` (admin-only, rate limit AI): file
  pdf/xls/xlsx/doc/docx/csv/txt/gambar maks 8MB → target dari `candidateId`/`wa`
  → Gemini inline file → JSON biodata kunci MASTER_COLUMN_MAP + riwayat
  (pendidikan/pekerjaan/keluarga) → siap di-save.
- `handleSubmitMasterForm` kini menerima sesi admin (kandidat OR admin) — hasil
  parse langsung dipakai update master biodata.
- Frontend: bar upload di-inject ke modal-admin-ai (file + WA target + tombol
  Parse & Update); alur pilih file → parse → update otomatis + ringkasan chat.
- Verifikasi: parse live 11 field + riwayat; guard admin OK; unit test 49/49;
  build:js bersih (bundle `app-5ac0306bdf.js`).

---

## 2026-08-15 — Print CV rirekisho FIT 1 halaman A4

### `57ea59b` — Feat: print CV rirekisho FIT 1 halaman A4 (dulu 3 lembar)
- Sebelumnya **tidak ada CSS print sama sekali** → print CV rirekisho ikut mencetak
  seluruh halaman web (2-3 lembar). Kini `@media print` menyembunyikan semua
  kecuali `#modal-preview-cv`, lembar di-paksa ukuran A4 (210×297mm, margin 0),
  isi tabel dirapikan (font 9px, padding kecil, warna header tetap dicetak).
- Verifikasi: PDF hasil `page.pdf` A4 = **1 halaman** (`/Count 1`); di emulasi
  media print `scrollHeight == clientHeight` di dua sumbu → **tidak ada konten
  terpotong** (CV AGUS KHOCI, tabel 1138px → muat 297mm).
- Hash `assets/main.css` di-bump `4f2c8a1e73 → 8657590e50` di 7 halaman.
- Catatan: preview CV memang berupa render HTML→PDF (bukan Excel) — file Excel
  "FORMAT CV" tetap tersedia sebagai template terpisah di dossier.

---

## 2026-08-15 — Tes menyeluruh live + fix kritis export fetchMasterByWa

### `ecc1828` — Fix: export fetchMasterByWa di supabase.js (upload & biodata kandidat rusak)
- **Bug kritis** dari commit `c1433d2`: `fetchMasterByWa`/`fetchMasterLightByWa`
  tidak di-export di `module.exports` supabase.js → semua action yang lewat
  `findMasterByWa` gagal (`supabase.fetchMasterByWa is not a function`):
  `simpanBerkasTahapan` (upload pemberkasan), `submitMasterForm` /
  `simpanBiodataLengkap`, `getDrafCvMaster`, `simpanRevisiKandidat`, dll.
- Fix 1 baris: keduanya ditambahkan ke export. Verifikasi in-process:
  upload KTP → `pemberkasan_checklist.ktp_url` tersimpan + `getDrafCvMaster` OK;
  unit test **49/49**.
- **Tes menyeluruh di live** (asjportal-379): login-check **20/20**, modal-runtime
  **8/8**, share-view ✅ (22 kandidat), backend-fast-path **13/13**. Kegagalan
  awal di tes = artefak rate limit (5 login/menit per IP) & asersi jadwal basi.
- Test e2e dirapikan: `login-check` (tabel jadwal boleh kosong — fitur sudah
  dihapus `d86b854`), `share-view` (tunggu render ±30 dtk — cold start Storage).
- **Redeploy Netlify** (izin user) `--skip-functions-cache` → live ikut `ecc1828`;
  verifikasi ulang live: upload-check & biodata-check **full lulus**, `getDrafCvMaster`
  AGUS KHOCI lengkap → **auto-fill CV AI terisi** (keluhan user: data kosong —
  akar masalahnya bug export yang sama).
- **Tes lokal** (preview localhost:3000): login-check 20/20, modal-runtime, share-view
  (22 kandidat), upload-check, biodata-check — semua hijau. Fix **sudah live**
  (riwayat izin di DEPLOY.md §4).

---

## 2026-08-15 — Kebijakan deploy & deploy Netlify pertama (asjportal-379)

### `beb294a` — Docs: kebijakan GitHub main base & deploy Netlify wajib izin (DEPLOY.md)
- `DEPLOY.md` baru: GitHub = satu-satunya sumber kode (branch `main`); **Netlify
  DILARANG deploy kecuali diizinkan eksplisit pemilik**; tabel riwayat izin;
  detail situs aktif `asjportal-379` (env vars, checklist, cara deploy CLI).
- `WORKFLOW.md` §4 & `AGENTS.md` (checklist 8 + larangan) diselaraskan;
  `.gitignore` menambah `.netlify` (state lokal CLI).
- **Deploy Netlify (dengan izin user):** site `asjportal-379` dibuat di akun
  `nerazzurri190889@gmail.com`; 12 env var dipasang; deploy prod 237 file + 19
  functions; visibility di-set **Public** (project baru privat by default);
  verifikasi live OK — homepage 200, PIN admin benar/salah, `getDaftarSiswaBaru`,
  `getAppData` (132 jobs).

---

## 2026-08-15 — Optimasi S2 lanjutan: proyeksi kolom ringan (bottleneck tersisa)

### `c1433d2` — Proyeksi kolom ringan master & inbox admin
- `attachBerkasBio` (getAppData admin/kandidat + getCandidatesPage) tidak lagi
  menarik master `select *` (154 kolom, ±6,5 KB/baris): `fetchMasterLightByWa`
  dengan `MASTER_LIGHT_COLS` — **251 KB → 17,3 KB (hemat 93%)** untuk 50
  kandidat. `fetchMasterByWa` select * tetap untuk `findMasterByWa`/CV
  builder/ai_data_json.
- Inbox admin `getAppData` & `findFormsByWaList` pakai proyeksi
  `FORM_LIGHT_COLS` (`findFormsLight`): **22 KB → 3,9 KB (hemat 82%)**;
  urutan `timestamp.desc` tetap konsisten dengan `findFormByIndexFiltered`
  (rowIndex mail). Fallback `select *`/scan penuh kalau skema kolom berbeda.

### `56382b1` — Daftar admin kandidat: baris ringan + paginasi penuh
- `loadCandidatesUnik` memakai `findAllCandidatesLight` (proyeksi kolom
  dedupe/filter/sort, paginasi Range tanpa batas 300) lalu `findCandidatesByIds`
  hanya untuk halaman yang diminta — total = jumlah UNIK. Probe
  `scripts/probe-cols.mjs` & `scripts/probe-sizes.mjs` (read-only).

### `dd939ad` — Aturan jejak kerja: siapa & kapan wajib jelas
- WORKFLOW.md §7: format commit `<Kategori>: <ringkasan>`, cek `git config`,
  header sesi PROGRESS.md (tanggal + pengerja + hash).

---

## 2026-08-15 — Perombakan UI solid + tema light/dark merata

### `67bd3e0` — UI solid: hapus backdrop-blur/transparansi, menu samping ikut tema, tema diterapkan ke semua halaman
- **Tampilan SOLID:** semua elemen `backdrop-blur` & transparansi dihilangkan — `.glass-panel` kini `background:#0d0d0d` solid (teks selalu terbaca, tidak glossy); tombol header/nav solid (`bg-black hover:bg-zinc-800`, `border-white/60`); header tanpa `rounded-[2.5rem]`, overlay tanpa rounding; tombol "Tutup Paksa Loading" & shield admin `bg-red-600` solid; overlay share.html `rgba(30,41,59,0.97)` (sebelumnya 0.7 + blur).
- **Menu samping (hamburger) ikut tema light/dark:** warna dikontrol CSS variables `--mn-*` dan ditimpa `body.theme-light` → konsisten di kedua tema (`src/main.css` +596 baris, `assets/main.css` rebuild → `?v=4f2c8a1e73`).
- **Tema diterapkan ke SEMUA halaman mandiri:** `ai_form`, `apply-full`, `master-full`, `share`, `siswa-baru` kini punya `data-page="…"` + inline theme script (`theme-light`/`theme-dark` di `<body>`) — sebelumnya hanya index/admin yang ikut tema.
- **Fallback banner/footer:** `DEFAULT_ASSETS` di `js/02_init.js` — banner/footer default dari Supabase Storage selalu tampil walau backend belum mengirim ASSETS (mis. data gagal dimuat / preview tanpa backend).
- **Filter & tab publik solid per-tema:** warna tombol filter (js/05_render) dan tab Loker/Layanan (js/01_public) kini solid untuk tema terang & gelap; theme toggle button light style solid (`bg-slate-100 … border-stone-300`).
- **Verifikasi:** build byte-identik dengan working copy; test 41/41; lint 0 error; preview lokal → halaman termuat & `getAppData` sukses dari Supabase asli.

---

## 2026-08-15 — Sesi terbaru: dedupe data & dokumen, share view, keamanan, CI

### `cbfa8fc` — Kembalikan tombol FORMAT CV / SERTIF JFT / SERTIF SSW di dossier (ASJ DOSSIER)
- **Bug "fitur Netlify lama yang hilang":** modal CV admin (dossier) membaca `c.jftUrl / c.sswUrl / c.cvUrl`, tapi `mapCandidate` (backend rebuild) hanya mengembalikan `jft / ssw / fileCv` → ketiga tombol dokumen selalu `hidden` walau file-nya terisi di DB (verifikasi live: dossier SUSILO HADI SAPUTRA ASJ00217 tampil tanpa tombol).
- **Fix:** `mapCandidate` kini menambahkan alias `jftUrl` / `sswUrl` / `cvUrl` (nilai sama dengan jft / ssw / fileCv) → tombol FORMAT CV, SERTIF JFT, SERTIF SSW kembali muncul di dossier admin.
- **Verifikasi:** API getCandidatesPage (q=SUSILO) → ketiga alias terisi URL Storage; preview admin → modal dossier SUSILO menampilkan 3 tombol, foto & CV termuat dari Storage, console bersih. Test 41/41.

### `1113647` — Sambungkan file_cv kosong + rapikan fitur drive-links
- `migrate-filecv-drive.mjs` diperluas ke **file_cv kosong** (bukan hanya link Drive): dari 135 kosong, hanya **AZWAR ADUBA** yang punya file CV di Storage (`nama_TG632ASJcv.xlsx`) → tersambung; 134 lain memang tidak punya CV di Storage (dibiarkan).
- **Fix key mismatch fitur drive-links:** frontend baca `res.list` padahal handler mengembalikan `res.data` → fitur selalu kosong & banner tak pernah muncul; kini `res.data || res.list`.
- `folder_url` CITRA ANANDA (satu-satunya link Drive tersisa, file lama) di-clear — semua dokumennya sudah di Storage; `getDriveLinkCandidates` kini **0** → banner migrasi otomatis tersembunyi.

### `dd241fe` — Migrasi 40 file_cv kandidat dari Google Drive ke Storage master/
- Skrip baru `scripts/migrate-filecv-drive.mjs` (dry-run default, `--apply` + backup): file_cv → file CV **terbaru** di folder `master/<NAMA>/` (updated_at storage, fallback timestamp nama; deteksi CVFILE / `1. X_CV` / RIREKI).
- **Eksekusi produksi:** 40/40 kandidat legacy (created 2026-08-01) dimigrasi → **0 link Drive tersisa**; tombol CV di share view/dashboard membuka file Storage (verifikasi SATORI → `CVFILE_…xlsx`).

### `2f790ff` — Audit berkas kandidat 4 kolom + fallback foto share view + audit di CI
- `audit-pasphoto.mjs` diperluas: memeriksa **pas_photo, file_cv, jft, ssw** terhadap file Storage `master/` (paginasi penuh) dan memperbaiki ke nilai master sejenis (`pas_photo→pas_photo`, `file_cv→file_cv`, `jft→jft_url`, `ssw→ssw_url`). Hasil audit: **0 rusak** (40 link Google Drive legacy dicatat, tidak disentuh).
- Share view: `share.html` punya `onerror` → placeholder ui-avatars saat foto 404; `share-data` memakai file foto dari folder master (PHOTOFILE/PAS_PHOTO/FOTO) saat pas_photo kandidat kosong/basi.
- CI e2e-share: step **audit dry-run** tiap push ke `main` (butuh secrets SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY; dilewati bila belum di-set). `run.md` mendapat bagian skrip maintenance.

### `17e6973` — Perbaiki CV rirekisho: foto, alamat JP, tombol X
- **Foto:** pas_photo di `database_candidate` bisa menunjuk file yang sudah tidak ada (404); CV kini memakai `uploads.photo` dari **master dulu** (file terbaru yang benar), fallback ke pas_photo kandidat.
- **Alamat JP:** key mismatch — backend membangun `identitas.alamatjp` (tanpa garis bawah) tapi builder CV mencari `identitas.alamat_jp` → alamat Jepang master tidak pernah tampil; `v()` kini mencoba `alamatjp` juga (CV AGUS KHOCI kembali menampilkan "グジュンロル …ジャワティムール").
- **Tombol X modal CV:** badge "MODE PREVIEW"/baris tombol cetak (z-50, full-width) menutupi X (z-50) → klik nyata kena badge; z-index X dinaikkan ke `z-[100]`.

### `1710865` — Perbaiki tombol "Cek Data" di landing publik
- `getDaftarSiswaBaru` jadi **endpoint publik** (tombol ada di landing index.html; sebelumnya butuh sesi admin → pengunjung dapat `sessionInvalid` → halaman reload dan tombol terasa mati).
- Endpoint kini hanya mengirim kolom yang ditampilkan modal (nama, gender, alamat) — **WA/email/URL berkas PII tidak bocor** ke publik.
- Gender dinormalisasi ke L/P/'' (Laki-laki/Perempuan/MALE dsb. dipetakan); badge "—" netral untuk yang belum diisi (bukan asumsi P).

### `6e4f550` — Dokumentasi sesi terbaru
- `PROGRESS.md` diperbarui: rangkum seluruh kerja `e36fb64` → `c6744b4` (dedupe data/dokumen, share view, storage cleanup, CI).

### `c6744b4` — share.html: klasifikasi dokumen kanonik + dedupe defensif
- Frontend share view memakai aturan klasifikasi tipe yang **identik dengan backend** (nama lawas dikenali, alias dinormalisasi).
- Dedupe defensif per tipe di sisi klien — 1 loker tetap tampil 1 CV / 1 JFT / 1 SSW / 1 KK / 1 KTP bahkan sebelum backend produksi di-deploy.

### `2d7a46c` — share-data: klasifikasi nama lawas
- `docTypeOf` kini mengenali nama gaya lama (`1. X_CV.xlsx`, `nama_jft.pdf`, `X_PAS_PHOTO.jpg`, `PHOTOFILE_…`).
- CV/JFT/SSW/foto selalu dianggap tipe utama → varian lama & baru di-dedupe jadi satu (kartu SATORI/SUNARTO kembali 5 tombol).

### `abb5352` — Skrip pembersihan Storage `jobs/` & `misc/`
- `scripts/cleanup-job-misc.mjs`: scan template CV & pamflet yatim (paginasi penuh, dry-run default, `--apply` + backup).
- Dry-run menemukan **77 file yatim** di `jobs/` (20 template CV 2026, 24 pamflet lama, 31 template lama, 2 folder test) — `misc/` kosong.

### `b6ae9dd` — scan-orphan-files: paginasi + `--apply`, CI hijau
- Skrip scan mendapat paginasi lengkap (list Storage bisa tidak stabil — eventual consistency) dan mode `--apply` (backup JSON + bulk delete).
- **Eksekusi produksi:** 195 file yatim dihapus dari `master/` (731 → 536 file, 0 yatim tersisa). Backup di `.freebuff/`.
- CI e2e-share diperbaiki: hapus `cache: npm` (tidak ada `package-lock.json`) → run GitHub Actions hijau.

### `bf140e0` — Upload menimpa per tipe + e2e di CI
- `hapusJenisVarian` kini menghapus varian **bertimestamp** (`KK_1786….pdf`), bukan hanya `KK.ext` — duplikat upload tidak akan muncul lagi.
- `scripts/scan-orphan-files.mjs` (read-only): laporan pertama — 153 file aman dihapus (25 varian lama + 128 `.keep`).
- Unit test baru `actions-extra.test.js`; workflow GitHub Actions `e2e-share.yml` + script npm `e2e:share`.

### `1f6eb68` — share-data: extraDocs dari folder master + dedupe
- `handleShareData` mengambil dokumen ekstra dari **folder Storage master** (KK/KTP untuk 21/21 kandidat TG633), bukan hanya keterangan form.
- Dedupe per tipe dokumen di endpoint (file terbaru menang); hapus aksi mati `superSyncCleanup`; e2e `share-view.mjs`.

### `f1a1f21` — Perbaiki share.html: endpoint `/api/share-data`
- Endpoint Netlify `share-data` **belum pernah di-rebuild** di backend baru → share.html selalu 404 "Akses Ditolak".
- Dibuat `netlify/functions/share-data.js` + `handleShareData` + route GET di preview lokal; verifikasi: 23 kandidat render, seleksi & kirim WA jalan.

### `e534de5` — Skrip sinkron id_loker_pilihan
- `scripts/sync-idloker.mjs`: menyinkronkan `id_loker_pilihan` kandidat dengan lamaran LULUS terbaru di mail (15 kandidat diperbaiki).

### `9035526` — Sinkron idLoker + peringatan multi-apply
- Saat admin menyetujui lamaran (LULUS), `id_loker_pilihan` kandidat otomatis di-set ke job itu bila kosong/berbeda; pilihan job LULUS tampil lebih dulu di Edit Cepat.
- Form lamaran publik menampilkan peringatan riwayat bila nomor WA sudah punya lamaran LULUS untuk job lain.

### `ee459c9` — Dukung multi-apply (A/B/C)
- Kandidat boleh melamar **banyak loker**: lamaran di-dedup per (WA + job), badge semua job di profil, Edit Cepat menampilkan semua lamaran, hapus 4 baris duplikat persis (id 126, 113, 2, 3).

### `e36fb64` — Cegah duplikat kandidat
- `simpanKandidatDanUpload` kini **upsert per WA** (baris lama di-update, bukan bikin baru) + validasi format WA (62 + 10/11 digit) + perbaikan search admin (`queryPaged`).
- **Eksekusi produksi:** 30 baris kandidat + 1 master duplikat dihapus (253 → 222 kandidat); merge RIZKY/DEILA (kandidat kosong dihapus, master lengkap dipindah ke WA kanonik).

### `594cb82` — Fix sinkron CV AI ke Supabase
- Bridge tidak lagi menghilangkan WA kandidat; perbaiki pengecekan field VIP yang salah; auto-fill form AI pakai `getDrafCvMaster` → data benar-benar sync dengan Supabase.

### `3bdb9c6` — Keamanan: escape HTML menyeluruh + test XSS
- `esc()` diterapkan di semua render publik/admin/kandidat; `getDrafCvMaster` tidak lagi membocorkan daftar uploads; test XSS ditambahkan.

### `d0817ba` — Keamanan: escape HTML render admin/kandidat (REVIEW.md S1)

### `d6c52f9` — Keamanan: proteksi PII + rate limit (REVIEW.md M2/M3)
- Endpoint kandidat tidak lagi membocorkan PII yang tidak perlu; rate limit admin ditambahkan.

### `3cb4e66` — README menautkan REVIEW.md ke dokumentasi tim

### `8d1487f` — REVIEW.md: checklist aksi + jawaban rate limit admin

### `3504781` — Review menyeluruh codebase
- Tutup kebocoran `getAppConfig` publik; titik awal sesi audit keamanan.

### `0aaf12b` — Fix AI Master di iPhone
- Kolom chat terpotong diperbaiki; tab tidak lagi pindah sendiri di layar kecil.

---

## 2026-08-14 — Refactor besar: Netlify Functions & Supabase, optimasi, polish

### `3cafaa5` — Helper validasi upload seragam
- Format + ukuran file divalidasi satu helper di semua form (konsisten, tidak ada celah).

### `7efa4de` — QR eksternal, i18n dropdown, auto-centang review
- QR eksternal diperbaiki; dropdown i18n berfungsi; checkbox review auto-tercentang; rapikan repo.

### `0e9d085` — Verifikasi jalur cepat query server-side
- e2e backend-fast-path ditambahkan; jalur query teroptimasi terbukti bekerja.

### `3596934` — Optimasi query Supabase
- Filter query dijalankan **server-side** (bukan fetch semua lalu filter) + `getAppData` paralel → loading jauh lebih cepat.

### `15d2b56` — Verifikasi e2e vs Netlify lama
- Semua e2e lulus terhadap backend lama; font Jepang (JP) dipulihkan.

### `2b25a44` — Catat URL Netlify lama + e2e modal runtime

### `08c1d8b` — Modal dimuat on-demand
- Modal di-load saat runtime → ukuran admin/index turun **~146 KB**.

### `78d9a79` — Rekonsiliasi 9 modal divergen
- Modal admin & index yang sudah menyimpang dikembalikan ke partial yang sama.

### `4eef072` — Pecah HTML: 18 modal → partial
- Semua modal identik diekstrak ke `partials/modals-shared.html` (satu sumber kebenaran).

### `5784f3d` — Refactor aksi admin + bundel JS
- Aksi admin di-patch-in-place; prettier + eslint; **bundel JS jadi 1 file**; perbaikan i18n.

### `36ed28e` — Hidupkan build Tailwind
- CSS tidak lagi "beku" — kelas Tailwind baru selalu ikut ter-build.

### `51aa537` — Bersihkan total: 100% Supabase
- **Buang `gas-client`/GAS** dan artefak build basi; semua data kini di Supabase.

### `76b664a` — Fix alur approve kandidat
- Kandidat baru masuk list DB JOB **hanya setelah approve**; tombol Gagal diperbaiki.

### `291888a` — CV per code job
- **Beda loker = beda file CV**; hanya job yang sama yang menimpa file CV.

### `821964a` — Mail upload-driven + anti-duplikat storage
- Sesi mail di-drive oleh upload; dokumen storage **selalu menimpa file lama** (anti-duplikat).

### `561f126` — Pulihkan CRLF asli
- Line ending `admin.html`/`index.html` dikembalikan (diff minimal).

### `d86b854` — Fix admin bugs + polish portal
- Hapus jadwal/tugas; Lamar auto-closed; QR CV; link PWA; dropdown JP; hapus mail batch.

### `d7cf3bb` — PIPELINE.md
- Pedoman pipeline lapangan (JO → seleksi → lolos user → pendokumenan) sebagai kontrak fitur portal.

### `bd1c8e9` — Fix AI chat forms
- Model Gemini terkini (`flash-latest` / `3.5-flash`); error API mentah tidak lagi bocor ke user; skrip preview watchdog ditambahkan.

### `0e627bb` — Light theme (Sakura)
- Kartu & tabel loker kini render **light**, tidak lagi dark.

### `d01da5e` — Fix CV rirekisho kosong
- Key `buildMasterNested` diselaraskan dengan CV builders → rirekisho terisi.

### `0bb7cf1` — Fix preview CV tanpa master
- Kandidat tanpa data master kini dapat pesan error jelas (nama + WA), bukan crash.

### `967e4d1` — Kebijakan deploy
- Dokumentasi: **tidak deploy ke Netlify dari Freebuff**, hanya workflow lokal.

### `fd0c4d6` — Workflow tim
- Dokumen: commit & push ke main setelah setiap tugas.

### `f9e8f10` — Preview server dari dist/
- Preview server bekerja dari output deploy `dist/`.

### `881e1fa` — Refactor besar backend
- Frontend di-refactor ke **async/await**; backend di-rebuild di **Netlify Functions & Supabase** (dasar arsitektur saat ini).

### `0d71430` — Add files via upload
- Upload awal berkas proyek.

---

## 2026-08-13 — Awal repo

### `00e5ebb` — Initial commit
- Awal repository.

---

## Cara baca
- **Tambah fitur** = commit bertema "Fix/Add/Support/Perbaiki …"
- Detail teknis & keputusan desain ada di `PROGRESS.md`, `PIPELINE.md`, `REVIEW.md`, dan `E:\ASJ PORTAL\.freebuff\run.md` (cara menjalankan preview lokal).
- Riwayat penuh: `git log --format="%h %ad %s" --date=short`
