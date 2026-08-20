import { registerSeamAliases } from './core/bridge.js';
// =============================================================================
// cloudinary.js — Upload langsung (direct unsigned upload) ke Cloudinary.
// -----------------------------------------------------------------------------
// Tujuan (2026-08-17): dokumen tidak lagi melewati Netlify Functions dalam
// bentuk base64 (Frontend → Netlify → Supabase Storage = bandwidth serverless
// + rawan timeout). File dikirim LANGSUNG dari browser ke Cloudinary; backend
// hanya menerima string URL hasil upload untuk di-update ke kolom dokumen.
//
// KONFIGURASI (wajib diisi oleh pemilik):
//   CLOUDINARY_CLOUD_NAME  — ganti 'TULIS_CLOUD_NAME_KAMU_DISINI' dengan cloud
//                            name Cloudinary kamu (contoh: 'asjportal').
//   CLOUDINARY_UPLOAD_PRESET — 'asjportal' sudah sesuai preset unsigned yang
//                            dibuat di dashboard Cloudinary (Settings → Upload
//                            → Unsigned upload preset). Preset unsigned WAJIB
//                            mengizinkan upload anonim — tanpa itu API menolak
//                            dengan error "Invalid upload preset".
//
// Batas bawaan Cloudinary untuk unsigned upload: 10 MB per file (bisa diubah
// di Settings → Upload). upload-guard.js tetap membatasi 5 MB default dari
// sisi form, jadi aman.
// =============================================================================

// KONFIGURASI (2026-08-17): cloud name diisi oleh pemilik.
//   CLOUDINARY_CLOUD_NAME = 'ybzzbw9i' (dari CLOUDINARY_URL pemilik).
//   CLOUDINARY_UPLOAD_PRESET = 'asjportal' — WAJIB sudah dibuat sebagai
//   preset UNSIGNED di dashboard Cloudinary (Settings → Upload → Unsigned
//   upload preset). Tanpa preset itu upload ditolak "Invalid upload preset".
//
// ⚠️ JANGAN pernah meletakkan API key/secret Cloudinary (bagian tengah
// CLOUDINARY_URL) di file ini atau file frontend lain — file ini publik
// (diunduh browser semua pengunjung). Alur unsigned upload hanya butuh
// cloud name + preset. Key/secret hanya untuk upload SIGNED dari server.
const CLOUDINARY_CLOUD_NAME = 'ybzzbw9i';
const CLOUDINARY_UPLOAD_PRESET = 'asjportal';

export function cloudinaryEndpoint() {
  return 'https://api.cloudinary.com/v1_1/' + encodeURIComponent(CLOUDINARY_CLOUD_NAME) + '/upload';
}

// uploadToCloudinary(file) → Promise<string secure_url>
//   - file: objek File/Blob dari <input type="file">.
//   - opts (opsional): { uploadPreset, endpoint } untuk override konfigurasi.
//   - Mengembalikan `secure_url` (HTTPS) dari respons Cloudinary.
//   - Melempar Error dengan pesan Cloudinary kalau upload gagal/ditolak.
export async function uploadToCloudinary(file, opts) {
  if (!file) throw new Error('Tidak ada file untuk diupload ke Cloudinary.');
  const preset = (opts && opts.uploadPreset) || CLOUDINARY_UPLOAD_PRESET;
  const endpoint = (opts && opts.endpoint) || cloudinaryEndpoint();

  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', preset);

  // Timeout 30 detik supaya upload tidak hanging tanpa batas
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 30000) : null;
  let res;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      body: fd,
      signal: controller ? controller.signal : undefined,
    });
  } catch (e) {
    throw new Error('Gagal terhubung ke Cloudinary: ' + e.message);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
  if (!res.ok) {
    let detail = '';
    try {
      const j = await res.json();
      detail = (j && j.error && j.error.message) || '';
    } catch (e) {
      /* body bukan JSON — pakai status saja */
    }
    throw new Error(
      'Upload Cloudinary gagal (HTTP ' + res.status + ')' + (detail ? ': ' + detail : ''),
    );
  }
  const data = await res.json();
  if (!data || !data.secure_url) {
    throw new Error('Cloudinary tidak mengembalikan secure_url.');
  }
  return data.secure_url;
}

// BRIDGE ESM → classic/bundel: window.uploadToCloudinary dipakai oleh
// js/03_candidate.js & js/api/candidates.js (bundel admin/index) dan bisa
// dipakai HTML onclick / halaman standalone.
registerSeamAliases({
  uploadToCloudinary,
  cloudinaryEndpoint,
});
