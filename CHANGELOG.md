# CHANGELOG.md — Riwayat Commit (LEGACY)

> ⚠️ **LEGACY** — diringkas 2026-08-17 agar mudah dibaca AI. Riwayat commit
> penuh: `git log --format="%h %ad %s" --date=short`. Riwayat sesi terbaru:
> **`CHANGELOG2.md`**.

## Era ringkas

- **13/8 — Awal repo** (`00e5ebb`): bootstrap.
- **14/8 — Refactor besar backend**: Netlify Functions & Supabase; frontend async/await; QR lokal; modal partial; i18n dropdown; helper upload seragam; optimasi query server-side.
- **15/8 — Rebuild + keamanan + data**: dedupe kandidat (30 duplikat dihapus); migrasi 40 CV dari Google Drive → Storage (0 link Drive); cleanup 195 file yatim; sync `id_loker_pilihan`; rate limit; XSS escape; PII protected; UI solid light/dark; deploy Netlify pertama `asjportal-379` (izin user).
- **16/8 — ESM Fase 3**: semua JS → ES Modules; bundel 1 file; halaman standalone entry ESM; i18n modular; `no-undef` aktif; optimasi S2 (proyeksi kolom, paginasi).
- **17/8 — Optimasi S3 + polish**: keep-alive `ping` (anti cold-start); **upload → Cloudinary** (semua alur, base64 fallback); penanda versi header→footer; preset Cloudinary terverifikasi; dokumen dirapikan.
