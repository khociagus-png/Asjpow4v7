// js/core/sentry.js — Sentry error tracking (frontend).
//
// Init otomatis saat module dimuat. Hanya aktif kalau SENTRY_DSN tersedia
// (production). Di preview/development, silent no-op.
'use strict';

import * as Sentry from '@sentry/browser';

const DSN =
  'https://1aaacfbbb81ea01e30ba99e7ad953bf0@o4511939170467840.ingest.us.sentry.io/4511939208478720';

let _initialized = false;

/**
 * Inisialisasi Sentry error tracking.
 * Panggil sekali saat bridge.js dimuat. Tanpa DSN → no-op.
 */
export function initSentry() {
  if (_initialized) return;
  // Ambil DSN dari environment (Netlify: process.env tidak tersedia di frontend)
  // atau gunakan fallback dari konfigurasi.
  // Di Netlify, env var frontend harus di-inject lewat HTML inline atau build step.
  // Untuk sekarang, gunakan placeholder — ganti dengan DSN asli saat deploy.
  const dsn = DSN;

  try {
    Sentry.init({
      dsn,
      environment: window.location.hostname.includes('netlify') ? 'production' : 'development',
      tracesSampleRate: 0.1, // 10% performance traces
      replaysSessionSampleRate: 0, // disable replay ( hemat quota )
      replaysOnErrorSampleRate: 0.5, // 50% replay saat error
      integrations: [Sentry.browserTracingIntegration()],
      beforeSend(event) {
        // Filter noise: toolbar clicks, resize,scroll yang tidak relevan
        if (event.exception && event.exception.values) {
          const ex = event.exception.values[0];
          if (ex && ex.type === 'ResizeObserver loop') return null;
          if (ex && ex.type === 'Non-Error promise rejection' && !ex.value) return null;
        }
        return event;
      },
    });
    _initialized = true;

    // Global error listeners (fallback untuk error yang tidak di-capture SDK)
    window.addEventListener('error', (e) => {
      if (e.error) Sentry.captureException(e.error);
    });
    window.addEventListener('unhandledrejection', (e) => {
      if (e.reason) Sentry.captureException(e.reason);
    });
  } catch {
    // Sentry init gagal → jangan crash app
  }
}

/**
 * Tags user context untuk error tracking.
 * @param {object} ctx - { role: 'admin'|'kandidat', wa: '628...', name: 'SACHOU' }
 */
export function setSentryUser(ctx) {
  if (!_initialized || !ctx) return;
  Sentry.setUser({
    id: ctx.wa || ctx.name || 'anonymous',
    role: ctx.role || 'unknown',
  });
}

/**
 * Add breadcrumb untuk debugging.
 * @param {string} category
 * @param {string} message
 * @param {object} [data]
 */
export function addBreadcrumb(category, message, data) {
  if (!_initialized) return;
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: 'info',
  });
}

export { Sentry };
