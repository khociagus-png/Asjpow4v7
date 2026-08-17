# REVIEW.md — Audit Keamanan & Rekomendasi (ringkas)

> Audit menyeluruh: 15/8/2026. Detail lengkap di git history file ini.

## Status

| Item                                                                                                        | Status                                                                                       |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **K1** — `SESSION_SECRET` wajib di env Netlify produksi (fallback publik di `session.js` ada untuk sandbox) | 🔴 **BELUM** (di luar repo — butuh admin Netlify)                                            |
| **M1** — `getAppConfig` bocor skema DB                                                                      | ✅ admin-only                                                                                |
| **M2** — PII jalur publik dibatasi (`pickPrefill`, tanpa sesi → field terbatas)                             | ✅ (opsional: token sekali pakai di link bridge — belum dipasang, tidak ada konsumen anonim) |
| **M3** — Rate limit (PIN admin, AI Gemini, Fonnte, login)                                                   | ✅ `rate-limit.js` terpasang di `handleAction`                                               |
| **S1** — XSS stored escape `esc()`/`escJs()` menyeluruh                                                     | ✅                                                                                           |
| **S2** — Scan penuh tersisa                                                                                 | ✅ sebagian besar → query server-side; sisa sengaja (diagnostik/daftar penuh)                |
| **S4** — `.convex/` artefak stale                                                                           | ✅ dihapus                                                                                   |

## Rate limit yang aktif (jawaban cepat)

| Endpoint              | Limit                                                       |
| --------------------- | ----------------------------------------------------------- |
| Login admin (PIN)     | 5 percobaan/menit per IP + lockout 5 menit setelah 10 gagal |
| AI chat (Gemini)      | 10 req/menit per WA/admin, global 60/menit per IP           |
| Kirim WA (Fonnte)     | 2×/menit per admin                                          |
| Aksi CRUD admin       | 120 req/menit per admin (jaring pengaman)                   |
| Login/daftar kandidat | 10 req/menit per IP (opsional)                              |

## Checklist terbuka

- [ ] **K1**: set `SESSION_SECRET` acak panjang (berbeda dari `ADMIN_PASSWORD`) di Environment Variables Netlify, lalu verifikasi token admin tidak bisa dipalsukan.
- [ ] (Opsional) Token sekali pakai di link `generateFormBridge` bila nanti ada halaman publik butuh prefill penuh tanpa sesi.
