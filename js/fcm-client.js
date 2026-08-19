// =============================================================================
// fcm-client.js — Frontend Firebase Cloud Messaging & Service Worker
// =============================================================================
import { callAPI } from '../api-client.js';

let messaging = null;

// Konfigurasi Firebase dari akun
const firebaseConfig = {
  apiKey: 'AIzaSyDQVyjXmiF1M5bnwJciIptZTWn8RcnyViE',
  projectId: 'khoci-7a81c',
  messagingSenderId: '1090676733378',
  appId: '1:1090676733378:web:3c0aa57a7ef133fc34925b',
};

/**
 * Inisialisasi Firebase App & Messaging.
 * Dipanggil secara asinkron saat PWA dimuat.
 */
export async function initFCM() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Browser tidak mendukung Push Notification.');
    return;
  }

  try {
    // Load Firebase SDK dinamis jika belum dimuat (untuk mengurangi bundle awal)
    if (!window.firebase) {
      await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
      await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');
    }

    if (!window.firebase.apps.length) {
      window.firebase.initializeApp(firebaseConfig);
    }

    messaging = window.firebase.messaging();

    // Tangkap notifikasi saat aplikasi sedang terbuka (foreground)
    messaging.onMessage((payload) => {
      console.log('Pesan diterima (foreground): ', payload);
      // Munculkan toast UI
      const title = payload.notification?.title || 'Notifikasi Baru';
      const body = payload.notification?.body || '';
      if (window.showToast) {
        window.showToast('info', title + ': ' + body);
      }
    });

    console.log('[FCM] Firebase Messaging berhasil diinisialisasi.');
  } catch (error) {
    console.error('[FCM] Gagal inisialisasi:', error);
  }
}

/**
 * Meminta izin ke pengguna untuk menampilkan notifikasi.
 * Jika disetujui, ambil FCM token dan kirim ke backend (Supabase).
 * @param {string} userWa - Nomor WA (ID unik user/admin yang login)
 */
export async function requestNotificationPermission(userWa) {
  if (!messaging) {
    await initFCM();
  }
  if (!messaging) return;

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Izin notifikasi diberikan.');

      // Gunakan public VAPID key (default Firebase auto-generate)
      const swRegistration = await navigator.serviceWorker.getRegistration();
      if (!swRegistration) {
        throw new Error('Service Worker belum terdaftar.');
      }

      const token = await messaging.getToken({
        serviceWorkerRegistration: swRegistration,
      });

      if (token) {
        console.log('[FCM] Token didapatkan:', token);
        // Kirim ke backend untuk disimpan di tabel fcm_tokens
        await saveTokenToDatabase(userWa, token);
      } else {
        console.warn('Gagal mendapatkan token registrasi FCM.');
      }
    } else {
      console.warn('Izin notifikasi ditolak oleh pengguna.');
    }
  } catch (error) {
    console.error('Error meminta izin notifikasi:', error);
  }
}

async function saveTokenToDatabase(wa, token) {
  try {
    // Memanggil API backend (buat endpoint baru /aksi 'registerFcmToken')
    const res = await callAPI('registerFcmToken', [wa, token, navigator.userAgent]);
    if (res && res.success) {
      console.log('[FCM] Token berhasil disimpan di database.');
    }
  } catch (err) {
    console.error('[FCM] Gagal menyimpan token:', err);
  }
}
