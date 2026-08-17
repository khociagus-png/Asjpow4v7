# PROGRESS.md — Riwayat Kerja (LEGACY)

> ⚠️ **LEGACY** — file ini diringkas 2026-08-17 agar mudah dibaca AI. Riwayat
> penuh per-sesi ada di **git history** (`git log` / `git show <hash>`). Sesi
> terbaru dicatat di **`PROGRESS2.md`** (baca itu dulu). Ringkasan fase-fase
> besar ada di bawah.

---

## Ringkasan fase (2026-08-13 → 2026-08-17)

| Fase                        | Hasil                                                                                                                                                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Awal repo** (13/8)        | Bootstrap proyek + backend Netlify Functions & Supabase.                                                                                                                                                                                   |
| **Refactor backend** (14/8) | `handlers.js` jadi dispatcher; `actions-extra.js` (2549 baris) dipecah per domain; `supabase.js` (1073) dipecah → `_lib/db/` (client + repositori); AI (1193 baris) → `_lib/ai/`; test per modul.                                          |
| **Optimasi S1/S2** (15/8)   | Dedupe kandidat; sync `id_loker_pilihan`; share view; cleanup Storage (195 file yatim dihapus); query server-side ter-filter (±24 call site); proyeksi kolom ringan (master 93% hemat, inbox 82%); paginasi daftar admin.                  |
| **Keamanan** (15/8)         | Rate limit (login admin 5/menit+lockout, AI 10/menit, Fonnte 2/menit); `getAppConfig` admin-only; PII jalur publik dibatasi (`pickPrefill`); escape `esc()`/`escJs()` (XSS stored); session HMAC + `timingSafeEqual`. Detail: `REVIEW.md`. |
| **UI** (15/8)               | Tema solid light/dark; modal runtime on-demand (27 modal → `partials/modals-shared.html`, −146 KB); QR lokal; i18n dropdown JP/ID.                                                                                                         |
| **ESM Fase 3** (16/8)       | Semua JS jadi ES Modules; bundel 1 file via `js/main.js` + esbuild; halaman standalone ENTRY ESM via `js/core/bridge.js`; alias seam `registerSeamAliases` + dispatcher `data-action`; `no-undef: error` aktif. Konvensi: `ESM_BRIDGE.md`. |
| **Fase 3.5** (17/8)         | Pembaca `window.*` → import nyata (state, render, api, helper) — sebagian besar selesai; sisa fasad `PortalBridge`.                                                                                                                        |
| **i18n Fase 4** (17/8)      | i18n modular: `i18n/core.js` + `i18n/locales/{id,jp}.js`; test paritas key.                                                                                                                                                                |
| **Optimasi S3** (17/8)      | Keep-alive `ping` (anti cold-start, workflow cron 5 menit); **upload → Cloudinary** direct unsigned (`js/cloudinary.js`, preset `asjportal`) — semua alur kirim URL string; backend `resolveFileUrl` (base64 fallback).                    |
| **Polish** (17/8)           | Penanda versi `v<hash>` pindah header → footer; preset Cloudinary terverifikasi.                                                                                                                                                           |

## Keputusan penting (jangan dilanggar)

- Normalisasi WA hanya `supabase.normalizeWa` → `628…`; gate login `/^628\d{9,10}$/` — mencegah duplikat kandidat.
- Lock fitur kandidat (E-Sign/Naitei, AI CV, Latihan Interview) — lihat `AGENTS.md` §6.
- Normalisasi gender hanya `normalizeGender` (`db/client.js`) → `LAKI-LAKI`/`PEREMPUAN`.
- Upload file tidak lewat Netlify base64 — browser → Cloudinary → URL.

## URL penting

- Live: `https://asjportal.netlify.app/` (Netlify lama — deploy wajib izin pemilik, lihat `DEPLOY.md`).
- Preview Freebuff: cek `freebuff-preview status`.
