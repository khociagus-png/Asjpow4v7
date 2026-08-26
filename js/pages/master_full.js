import { registerSeamAliases as U } from '../core/bridge.js';
import { uploadToCloudinary as f } from '../cloudinary.js';
document.addEventListener('DOMContentLoaded', function () {
  var l = document.getElementById('lang-btn-mf');
  (l && (l.textContent = window.CURRENT_LANG === 'jp' ? 'ID' : 'JP'),
    typeof window.renderLanguageLight == 'function' && window.renderLanguageLight());
});
(function () {
  function l(m) {
    if (!m) return '';
    var u = String(m).replace(/\D/g, '');
    return (
      u.startsWith('0') ? (u = '62' + u.substring(1)) : u.startsWith('8') && (u = '62' + u),
      u
    );
  }
  var t = new URLSearchParams(window.location.search),
    o = l(t.get('wa') || ''),
    _ = (t.get('nama') || '').trim(),
    A = document.getElementById('wa-display');
  A && (A.textContent = o);
  var e = document.getElementById('wa');
  e && (e.value = o);
  var n = document.getElementById('nama');
  n && (n.value = _);
})();
var p = 1,
  b = 5,
  a = (l) => document.getElementById(l),
  i = (l, t) => {
    a(l) && t && (a(l).value = t);
  },
  E = (l) => {
    if (!l) return '';
    try {
      let t = new Date(l);
      return isNaN(t.getTime()) ? l : t.toISOString().split('T')[0];
    } catch {
      return l;
    }
  };
function h(l) {
  let t = a(`job_out_${l}`);
  a(`job_now_${l}`).checked ? ((t.value = ''), (t.disabled = !0)) : (t.disabled = !1);
}
function w() {
  return localStorage.getItem('asj_kandidat_session') || '';
}
function I(l) {
  let t = document.getElementById('gate-wa');
  t && (t.textContent = a('wa').value || '');
  let o = document.getElementById('gate-msg');
  o && (o.textContent = l || '');
  let _ = document.getElementById('login-gate');
  _ && _.classList.remove('hidden');
  let A = document.getElementById('gate-pass');
  (A && ((A.value = ''), A.focus()), window.renderLanguageLight());
}
function j() {
  let l = document.getElementById('login-gate');
  l && l.classList.add('hidden');
}
async function O() {
  let l = a('wa').value,
    t = document.getElementById('gate-pass') ? document.getElementById('gate-pass').value : '',
    o = document.getElementById('gate-btn'),
    _ = document.getElementById('gate-msg');
  if (!t) {
    _ && (_.textContent = window.tr('form.mf_gate_pw_wajib'));
    return;
  }
  o && ((o.disabled = !0), (o.innerHTML = window.tr('form.mf_memeriksa')));
  try {
    let A = await window.callAPI('loginKandidat', [l, t]);
    A && A.success
      ? (localStorage.setItem('asj_kandidat_login', 'sukses'),
        localStorage.setItem('asj_kandidat_name', A.nama || ''),
        localStorage.setItem('asj_kandidat_wa', A.wa || l),
        localStorage.setItem('asj_kandidat_session', A.sessionToken || ''),
        j(),
        window.location.reload())
      : _ && (_.textContent = (A && A.error) || window.tr('form.mf_gagal_masuk'));
  } catch (A) {
    _ && (_.textContent = window.tr('alert.network') + (A && A.message ? A.message : A));
  } finally {
    o && ((o.disabled = !1), (o.innerHTML = window.tr('form.mf_masuk')));
  }
}
var M = [
    ['KAIGO', 'KAIGO (\u4ECB\u8B77)'],
    ['BUILDING CLEANING', 'BUILDING CLEANING (\u30D3\u30EB\u30AF\u30EA\u30FC\u30CB\u30F3\u30B0)'],
    ['FOUNDRY & PLASTIC', 'FOUNDRY & PLASTIC (\u7D20\u5F62\u6750\u7523\u696D)'],
    ['INDUSTRIAL MACHINERY', 'INDUSTRIAL MACHINERY (\u7523\u696D\u6A5F\u68B0\u88FD\u9020\u696D)'],
    ['ELECTRIC & ELECTRONIC', 'ELECTRIC & ELECTRONIC (\u96FB\u6C17\u30FB\u96FB\u5B50\u60C5\u5831)'],
    ['CONSTRUCTION', 'CONSTRUCTION (\u5EFA\u8A2D)'],
    ['SHIPBUILDING', 'SHIPBUILDING (\u9020\u8239\u30FB\u8236\u7528\u5DE5\u696D)'],
    ['AUTOMOBILE REPAIR', 'AUTOMOBILE REPAIR (\u81EA\u52D5\u8ECA\u6574\u5099)'],
    ['AVIATION', 'AVIATION (\u822A\u7A7A)'],
    ['ACCOMMODATION', 'ACCOMMODATION (\u5BBF\u6CCA)'],
    ['AGRICULTURE', 'AGRICULTURE (\u8FB2\u696D)'],
    ['FISHERY', 'FISHERY (\u6F01\u696D)'],
    ['FOOD & BEVERAGE', 'FOOD & BEVERAGE (\u98F2\u98DF\u6599\u54C1\u88FD\u9020\u696D)'],
    ['RESTAURANT', 'RESTAURANT (\u5916\u98DF\u696D)'],
    ['FORESTRY', 'FORESTRY (\u6797\u696D)'],
    ['WOOD INDUSTRY', 'WOOD INDUSTRY (\u6728\u6750\u7523\u696D)'],
  ],
  G = [
    ['OPERATOR PRODUKSI', 'OPERATOR PRODUKSI (\u5DE5\u5834\u4F5C\u696D\u54E1)'],
    ['ADMIN / STAFF ADMIN', 'ADMIN / STAFF ADMIN (\u4E8B\u52D9\u54E1)'],
    ['SALES / MARKETING', 'SALES / MARKETING (\u55B6\u696D)'],
    ['KASIR', 'KASIR (\u30EC\u30B8\u4FC2)'],
    ['KOKI / CHEF', 'KOKI / CHEF (\u8ABF\u7406\u5E2B)'],
    ['PELAYAN / WAITER', 'PELAYAN / WAITER (\u30A6\u30A7\u30A4\u30BF\u30FC)'],
    ['CLEANING SERVICE', 'CLEANING SERVICE (\u6E05\u6383\u54E1)'],
    ['SATPAM / SECURITY', 'SATPAM / SECURITY (\u8B66\u5099\u54E1)'],
    ['SOPIR / DRIVER', 'SOPIR / DRIVER (\u904B\u8EE2\u624B)'],
    ['BURUH PABRIK', 'BURUH PABRIK (\u5DE5\u5834\u52B4\u50CD\u8005)'],
    ['KARYAWAN SWASTA', 'KARYAWAN SWASTA (\u4F1A\u793E\u54E1)'],
    ['PEGAWAI TOKO', 'PEGAWAI TOKO (\u5E97\u54E1)'],
    ['GURU / PENGAJAR', 'GURU / PENGAJAR (\u6559\u5E2B)'],
    ['PERAWAT', 'PERAWAT (\u770B\u8B77\u5E2B)'],
    ['MEKANIK', 'MEKANIK (\u6574\u5099\u58EB)'],
    ['TEKNISI', 'TEKNISI (\u6280\u8853\u8005)'],
    ['WELDER / LAS', 'WELDER / LAS (\u6EB6\u63A5\u5DE5)'],
    ['TUKANG BANGUNAN', 'TUKANG BANGUNAN (\u5EFA\u8A2D\u4F5C\u696D\u54E1)'],
    ['PETANI / PERKEBUNAN', 'PETANI / PERKEBUNAN (\u8FB2\u696D)'],
    ['NELAYAN', 'NELAYAN (\u6F01\u5E2B)'],
    ['RESEPSIONIS', 'RESEPSIONIS (\u53D7\u4ED8)'],
    ['BARISTA', 'BARISTA (\u30D0\u30EA\u30B9\u30BF)'],
    ['IBU RUMAH TANGGA', 'IBU RUMAH TANGGA (\u4E3B\u5A66)'],
    ['PELAJAR / MAHASISWA', 'PELAJAR / MAHASISWA (\u5B66\u751F)'],
    ['BELUM BEKERJA', 'BELUM BEKERJA (\u7121\u8077)'],
  ];
function B() {
  var l = '<option value="">Pilih / \u9078\u629E</option>';
  return (
    M.forEach(function (t) {
      l += '<option value="' + t[0] + '">' + t[1] + '</option>';
    }),
    (l +=
      '<option value="__LAINNYA__">\u270D\uFE0F Lainnya / \u305D\u306E\u4ED6 (ketik manual)</option>'),
    l
  );
}
function v() {
  var l = '<option value="">Pilih / \u9078\u629E</option>';
  return (
    G.forEach(function (t) {
      l += '<option value="' + t[0] + '">' + t[1] + '</option>';
    }),
    (l +=
      '<option value="__LAINNYA__">\u270D\uFE0F Lainnya / \u305D\u306E\u4ED6 (ketik manual)</option>'),
    l
  );
}
function S(l) {
  var t = a(l);
  t && (t.innerHTML = B());
}
function D(l) {
  var t = a(l),
    o = a(l + '_manual');
  t &&
    (t.value === '__LAINNYA__'
      ? o && (o.classList.remove('hidden'), o.focus())
      : o && (o.classList.add('hidden'), (o.value = '')));
}
function H(l) {
  var t = a('job_pos_' + l),
    o = a('job_pos_manual_' + l);
  t &&
    (t.value === '__LAINNYA__'
      ? o && (o.classList.remove('hidden'), o.focus())
      : o && (o.classList.add('hidden'), (o.value = '')));
}
function y(l) {
  var t = a('fam_job_' + l),
    o = a('fam_job_manual_' + l);
  t &&
    (t.value === '__LAINNYA__'
      ? o && (o.classList.remove('hidden'), o.focus())
      : o && (o.classList.add('hidden'), (o.value = '')));
}
function N(l, t, o) {
  if (l) {
    for (var _ = !1, A = 0; A < l.options.length; A++) l.options[A].value === o && (_ = !0);
    o && !_
      ? ((l.value = '__LAINNYA__'), t && ((t.value = o), t.classList.remove('hidden')))
      : ((l.value = o || ''), t && (t.classList.add('hidden'), (t.value = '')));
  }
}
function g(l, t) {
  return l ? (l.value === '__LAINNYA__' ? (t ? t.value.trim() : '') : l.value) : '';
}
window.onload = function () {
  try {
    let l = '';
    for (let e = 1; e <= 5; e++) {
      let n =
          e === 5
            ? 'LPK Bahasa Jepang (\u65E5\u672C\u8A9E\u5B66\u6821)'
            : window.tr('form.mf_pendidikan_n') + ' ' + e,
        m = e === 5 ? ' selected' : '';
      l += `<div class="dynamic-box"><div class="box-title">${n}</div>
                    <div class="row mb-3"><div><label class="label">${window.tr('form.mf_tingkat')}</label><select id="edu_tk_${e}" class="input py-2"><option value="">Pilih / \u9078\u629E</option><option value="SD">SD</option><option value="SMP">SMP</option><option value="SMA/SMK">SMA/SMK</option><option value="D3/S1">D3/S1</option><option value="LPK BAHASA"${m}>LPK BAHASA (\u65E5\u672C\u8A9E\u5B66\u6821)</option></select></div>
                    <div><label class="label">${window.tr('form.mf_nama_sekolah')}</label><input id="edu_nm_${e}" class="input py-2"></div></div>
                    <div class="form-group mb-3"><label class="label">${window.tr('form.mf_jurusan')}</label><input id="edu_jur_${e}" class="input py-2" placeholder="${window.tr('form.mf_ph_jurusan')}"></div>
                    <div class="row"><div><label class="label">${window.tr('form.mf_masuk_bulan')}</label><input id="edu_in_${e}" type="month" class="input py-2"></div>
                    <div><label class="label">${window.tr('form.mf_lulus')}</label><input id="edu_out_${e}" type="month" class="input py-2"></div></div></div>`;
    }
    a('edu-container') && (a('edu-container').innerHTML = l);
    let t = '';
    for (let e = 1; e <= 3; e++)
      t += `<div class="dynamic-box"><div class="box-title">${window.tr('form.mf_pekerjaan_n')} ${e}</div>
                    <div class="form-group mb-3"><label class="label">${window.tr('form.mf_perusahaan')}</label><input id="job_nm_${e}" class="input py-2"></div>
                    <div class="row mb-3"><div><label class="label">${window.tr('form.mf_masuk_bulan')}</label><input id="job_in_${e}" type="month" class="input py-2"></div>
                    <div><label class="label">${window.tr('form.mf_keluar')}</label><input id="job_out_${e}" type="month" class="input py-2">
                    <div class="mt-2"><label class="text-[11px] text-sky-400 font-bold flex items-center gap-1 cursor-pointer"><input type="checkbox" id="job_now_${e}" onchange="toggleImaMade(${e})" class="w-4 h-4 accent-sky-500"> ${window.tr('form.mf_ima_made')}</label></div></div></div>
                    <div class="row">
                        <div class="form-group"><label class="label">${window.tr('form.mf_jabatan')}</label><select id="job_pos_${e}" class="input py-2" onchange="onPekerjaanSelect(${e})"></select><input id="job_pos_manual_${e}" class="input py-2 hidden mt-2" placeholder="${window.tr('form.mf_ph_jabatan_lain')}"></div>
                        <div class="form-group"><label class="label">${window.tr('form.mf_gaji_terakhir')}</label><input id="job_sal_${e}" type="number" class="input py-2" placeholder="${window.tr('form.mf_ph_sal')}"></div>
                    </div></div>`;
    a('job-container') && (a('job-container').innerHTML = t);
    for (let e = 1; e <= 3; e++) a(`job_pos_${e}`) && (a(`job_pos_${e}`).innerHTML = v());
    let o = '';
    for (let e = 1; e <= 5; e++)
      o += `<div class="dynamic-box"><div class="box-title">${window.tr('form.mf_keluarga_n')} ${e}</div>
                    <div class="row mb-3"><div><label class="label">${window.tr('form.mf_hubungan')}</label><select id="fam_hub_${e}" class="input py-2"><option value="">Pilih</option><option value="AYAH">AYAH</option><option value="IBU">IBU</option><option value="SUAMI">SUAMI</option><option value="ISTRI">ISTRI</option><option value="ANAK">ANAK</option><option value="KAKAK">KAKAK</option><option value="ADIK">ADIK</option></select></div>
                    <div><label class="label">${window.tr('form.mf_nama_keluarga')}</label><input id="fam_nm_${e}" class="input py-2" placeholder="Otomatis ke katakana saat disimpan"></div></div>
                    <div class="row mb-3">
                        <div><label class="label">${window.tr('form.mf_kenalan_usia')}</label><input id="fam_age_${e}" type="number" class="input py-2"></div>
                        <div><label class="label">${window.tr('form.mf_pekerjaan')}</label><select id="fam_job_${e}" class="input py-2" onchange="onFamPekerjaanSelect(${e})"></select><input id="fam_job_manual_${e}" class="input py-2 hidden mt-2" placeholder="${window.tr('form.mf_ph_pekerjaan_lain')}"></div>
                    </div>
                    <div class="form-group"><label class="label">${window.tr('form.mf_gaji')}</label><input id="fam_sal_${e}" type="number" class="input py-2"></div></div>`;
    a('fam-container') && (a('fam-container').innerHTML = o);
    for (let e = 1; e <= 5; e++) a(`fam_job_${e}`) && (a(`fam_job_${e}`).innerHTML = v());
    (S('lisensi'), S('lisensi2'));
    let _ = a('wa').value;
    if (!_) {
      console.warn('Mode Preview: Nomor WA tidak ditemukan di URL, auto-fill dilewati.');
      return;
    }
    if (!w()) {
      I(window.tr('form.mf_gate_desc'));
      return;
    }
    let A = a('loading');
    (A && A.classList.remove('hidden'),
      window
        .callAPI('getMasterDataByWa', [_])
        .then((e) => {
          if ((A && A.classList.add('hidden'), e && e.sessionInvalid)) {
            I(window.tr('form.mf_sesi_berakhir'));
            return;
          }
          if (e) {
            (i('nama', e.NAMA_LENGKAP),
              i('furigana', e.FURIGANA),
              i('panggilan', e.NAMAPANGGILAN),
              i('panggilanKatakana', e.PANGGILAN_KATAKANA),
              i('tempatLahir', e.TEMPAT_LAHIR),
              e.TGL_LAHIR && i('tglLahir', E(e.TGL_LAHIR)),
              i('gender', e.GENDER),
              i('usia', e.USIA),
              i('agama', e.AGAMA),
              i('statusNikah', e.STATUS_PERNIKAHAN),
              i('anak', e.JUMLAH_ANAK),
              i('ktp', e.NIK),
              i('sim', e.DRIVER_LICENSE),
              i('alamat', e.ALAMAT_LENGKAP),
              i('email', e.EMAIL),
              i('tb', e.TT),
              i('bb', e.BB),
              i('goldar', e.GOLONGAN_DARAH),
              i('tangan', e.TANGANDOMINAN),
              i('baju', e.UKURANBAJU),
              i('sepatu', e.UKURANSEPATU),
              i('topi', e.UKURAN_TOPI),
              i('tahanAc', e.TAHAN_AC),
              i('mataKiri', e.MATA_KIRI),
              i('mataKanan', e.MATA_KANAN),
              i('kacamata', e.KACAMATA),
              i('butaWarna', e.BUTA_WARNA),
              i('tato', e.TATO),
              i('tindik', e.TINDIK),
              i('merokok', e.MEROKOK),
              i('alkohol', e.MINUM_ALKOHOL),
              i('penyakit', e.RIWAYAT_PENYAKIT),
              i('alergi', e.ALERGI),
              i('laka', e.RIWAYAT_KECELAKAAN),
              i('lamaJepang', e.LAMA_DI_JEPANG),
              i('gajiYen', e.HARAPAN_GAJI_YEN),
              i('tabungan', e.HARAPAN_TABUNGAN),
              i('bhsJepang', e.BAHASA),
              i('nilai', e.JFT));
            var n = String(e.BIDANGSSW || e.SSW || ''),
              m = n
                .split(',')
                .map(function (s) {
                  return s.trim();
                })
                .filter(Boolean);
            (N(a('lisensi'), a('lisensi_manual'), m[0] || ''),
              N(a('lisensi2'), a('lisensi2_manual'), m[1] || ''),
              i('promosi', e.PROMOSI_DIRI),
              i('kelebihan', e.KELEBIHAN),
              i('kekurangan', e.KEKURANGAN),
              i('keahlianKhusus', e.KEAHLIAN_KHUSUS),
              i('hobi', e['HOBI_&_KETERAMPILAN']),
              i('alasanBidang', e.ALASAN_MEMILIH_BIDANG),
              i('motivasiJepang', e.MOTIVASI_KE_JEPANG),
              i('keinginan', e.KEINGINAN_PRIBADI),
              i('rencanaPulang', e.RENCANA_SETELAH_PULANG),
              i('tujuanJepang', e.TUJUAN_KE_JEPANG),
              i('eksJepang', e.STATUS_EKS_JEPANG || 'BELUM PERNAH'),
              i('daruratNama', e.KONTAK_DARURAT_NAMA),
              i('daruratHubungan', e.KONTAK_DARURAT_HUBUNGAN),
              e.KONTAK_DARURAT_WA && i('daruratWa', String(e.KONTAK_DARURAT_WA).replace(/\D/g, '')),
              i('kenalanNama', e.KENALAN_DI_JEPANG_NAMA),
              i('kenalanHubungan', e.KENALAN_DI_JEPANG_HUBUNGAN),
              i('kenalanPekerjaan', e.KENALAN_DI_JEPANG_PEKERJAAN),
              i('kenalanUsia', e.KENALAN_DI_JEPANG_USIA),
              i('kenalanAlamat', e.KENALAN_DI_JEPANG_ALAMAT));
            for (let s = 1; s <= 5; s++)
              (i(`edu_tk_${s}`, e[`PENDIDIKAN_${s}_TINGKAT`]),
                i(`edu_nm_${s}`, e[`PENDIDIKAN_${s}_NAMA_SEKOLAH`]),
                i(`edu_jur_${s}`, e[`PENDIDIKAN_${s}_JURUSAN`] || e[`PENDIDIKAN_${s}_JURUSAN_ID`]),
                i(`edu_in_${s}`, e[`PENDIDIKAN_${s}_TAHUN_MASUK`]),
                i(`edu_out_${s}`, e[`PENDIDIKAN_${s}_TAHUN_LULUS`]));
            for (let s = 1; s <= 3; s++) {
              (i(`job_nm_${s}`, e[`PEKERJAAN_${s}_NAMA_PERUSAHAAN`]),
                i(`job_in_${s}`, e[`PEKERJAAN_${s}_TAHUN_MASUK`]));
              let d = e[`PEKERJAAN_${s}_TAHUN_KELUAR`];
              (d === 'SEKARANG'
                ? a(`job_now_${s}`) && ((a(`job_now_${s}`).checked = !0), h(s))
                : i(`job_out_${s}`, d),
                N(a(`job_pos_${s}`), a(`job_pos_manual_${s}`), e[`PEKERJAAN_${s}_JABATAN`] || ''),
                i(`job_sal_${s}`, e[`PEKERJAAN_${s}_GAJI`]));
            }
            for (let s = 1; s <= 5; s++)
              (i(`fam_hub_${s}`, e[`KELUARGA_${s}_HUBUNGAN`]),
                i(`fam_nm_${s}`, e[`KELUARGA_${s}_NAMA`]),
                i(`fam_age_${s}`, e[`KELUARGA_${s}_USIA`]),
                N(a(`fam_job_${s}`), a(`fam_job_manual_${s}`), e[`KELUARGA_${s}_PEKERJAAN`] || ''),
                i(`fam_sal_${s}`, e[`KELUARGA_${s}_PENDAPATAN`]));
            (i('noPaspor', e.NO_PASPORT),
              i('kotaPaspor', e.KOTA_TERBIT_PASPORT),
              i('noCoe', e.NO_COE),
              e.TGL_TERBIT_PASPORT && i('tglTerbitPaspor', E(e.TGL_TERBIT_PASPORT)),
              e.EXP_PASPORT && i('expPaspor', E(e.EXP_PASPORT)));
            var u =
              "<span style='color:#10b981; font-weight:700;'><i class='fas fa-check-circle'></i> " +
              window.tr('form.mf_file_saved') +
              '</span>';
            if (e.PAS_PHOTO && String(e.PAS_PHOTO).length > 10) {
              let s = a('photoInfo');
              s && (s.innerHTML = u);
            }
            if (e.JFT_URL && String(e.JFT_URL).length > 10) {
              let s = a('jftInfo');
              s && (s.innerHTML = u);
            }
            if (e.SSW_URL && String(e.SSW_URL).length > 10) {
              let s = a('sswInfo');
              s && (s.innerHTML = u);
            }
          }
        })
        .catch((e) => {
          (A && A.classList.add('hidden'), console.error('AutoFill Error:', e));
        }));
  } catch (l) {
    console.error('Onload Error:', l);
  }
};
function C(l, t) {
  let o = l.files[0],
    _ = a(t);
  if (o && _) {
    if (!window.cekUploadFile(l, { maxMb: 2 })) {
      _.innerHTML = '';
      return;
    }
    _.innerHTML = `<span style='color:#38bdf8'>\u2705 ${o.name}</span>`;
  }
}
function L(l) {
  try {
    let t = a(`step-${p}`);
    t && t.classList.remove('active');
    let o = a(`ind-${p}`);
    (o && (o.classList.remove('active'), o.classList.add('completed')), (p += l));
    for (let m = 1; m <= b; m++) {
      let u = a(`ind-${m}`);
      u &&
        (m < p
          ? (u.classList.add('completed'), u.classList.remove('active'))
          : m === p
            ? (u.classList.add('active'), u.classList.remove('completed'))
            : u.classList.remove('active', 'completed'));
    }
    let _ = a(`step-${p}`);
    _ && _.classList.add('active');
    let A = a('btnPrev'),
      e = a('btnNext'),
      n = a('btnSubmit');
    (A && (A.style.display = p === 1 ? 'none' : 'block'),
      p === b
        ? (e && e.classList.add('hidden'), n && n.classList.remove('hidden'))
        : (e && e.classList.remove('hidden'), n && n.classList.add('hidden')),
      window.scrollTo({ top: 0, behavior: 'smooth' }));
  } catch (t) {
    alert('Navigasi Error: ' + t.message);
  }
}
async function J(l) {
  try {
    if (!w()) {
      I(window.tr('form.mf_alert_login_dulu'));
      return;
    }
    let t = a('nama') ? a('nama').value : '';
    if (!l && !t.trim()) {
      (alert(window.tr('form.mf_alert_nama_wajib')), L(1 - p));
      return;
    }
    let o = a('loading');
    o &&
      ((a('loadingText').innerText = l
        ? window.tr('form.mf_save_draft')
        : window.tr('form.mf_save_final')),
      o.classList.remove('hidden'));
    let _ = [];
    for (let r = 1; r <= 5; r++)
      a(`edu_tk_${r}`) && a(`edu_tk_${r}`).value
        ? _.push({
            tingkat: a(`edu_tk_${r}`).value,
            namaSekolah: a(`edu_nm_${r}`).value,
            jurusan: a(`edu_jur_${r}`) ? a(`edu_jur_${r}`).value : '',
            tahunMasuk: a(`edu_in_${r}`).value,
            tahunLulus: a(`edu_out_${r}`).value,
          })
        : _.push({});
    let A = [];
    for (let r = 1; r <= 3; r++)
      if (a(`job_nm_${r}`) && a(`job_nm_${r}`).value) {
        let c = a(`job_now_${r}`).checked ? 'SEKARANG' : a(`job_out_${r}`).value;
        A.push({
          namaPt: a(`job_nm_${r}`).value,
          tahunMasuk: a(`job_in_${r}`).value,
          tahunKeluar: c,
          jabatan: g(a(`job_pos_${r}`), a(`job_pos_manual_${r}`)),
          gaji: a(`job_sal_${r}`) ? a(`job_sal_${r}`).value : '',
        });
      }
    let e = [];
    for (let r = 1; r <= 5; r++)
      a(`fam_hub_${r}`) &&
        a(`fam_hub_${r}`).value &&
        a(`fam_nm_${r}`).value &&
        e.push({
          hubungan: a(`fam_hub_${r}`).value,
          nama: a(`fam_nm_${r}`).value,
          usia: a(`fam_age_${r}`).value,
          pekerjaan: g(a(`fam_job_${r}`), a(`fam_job_manual_${r}`)),
          pendapatan: a(`fam_sal_${r}`) ? a(`fam_sal_${r}`).value : '',
        });
    let n = (r) => (a(r) ? a(r).value : ''),
      m = a('photo') && a('photo').files.length > 0 ? await f(a('photo').files[0]) : null,
      u = a('jft') && a('jft').files.length > 0 ? await f(a('jft').files[0]) : null,
      s = a('ssw') && a('ssw').files.length > 0 ? await f(a('ssw').files[0]) : null,
      d = a('ijazahSd') && a('ijazahSd').files.length > 0 ? await f(a('ijazahSd').files[0]) : null,
      R =
        a('ijazahSmp') && a('ijazahSmp').files.length > 0 ? await f(a('ijazahSmp').files[0]) : null,
      T =
        a('ijazahSma') && a('ijazahSma').files.length > 0 ? await f(a('ijazahSma').files[0]) : null,
      k = a('univ') && a('univ').files.length > 0 ? await f(a('univ').files[0]) : null,
      P = a('ktpFile') && a('ktpFile').files.length > 0 ? await f(a('ktpFile').files[0]) : null,
      K = a('kk') && a('kk').files.length > 0 ? await f(a('kk').files[0]) : null,
      $ = {
        wa: n('wa'),
        nama: n('nama').toUpperCase(),
        furigana: n('furigana'),
        panggilan: n('panggilan').toUpperCase(),
        panggilanKatakana: n('panggilanKatakana'),
        gender: n('gender'),
        tempatLahir: n('tempatLahir').toUpperCase(),
        tglLahir: n('tglLahir'),
        usia: n('usia'),
        agama: n('agama'),
        statusNikah: n('statusNikah'),
        anak: n('anak'),
        ktp: n('ktp'),
        sim: n('sim'),
        alamat: n('alamat'),
        email: n('email'),
        tb: n('tb'),
        bb: n('bb'),
        goldar: n('goldar'),
        tangan: n('tangan'),
        baju: n('baju').toUpperCase(),
        sepatu: n('sepatu'),
        topi: n('topi'),
        tahanAc: n('tahanAc'),
        mataKiri: n('mataKiri'),
        mataKanan: n('mataKanan'),
        kacamata: n('kacamata'),
        butaWarna: n('butaWarna'),
        tato: n('tato'),
        tindik: n('tindik'),
        merokok: n('merokok'),
        alkohol: n('alkohol'),
        penyakit: n('penyakit'),
        alergi: n('alergi'),
        laka: n('laka'),
        promosi: n('promosi'),
        kelebihan: n('kelebihan'),
        kekurangan: n('kekurangan'),
        keahlianKhusus: n('keahlianKhusus'),
        hobi: n('hobi'),
        alasanBidang: n('alasanBidang'),
        motivasiJepang: n('motivasiJepang'),
        keinginan: n('keinginan'),
        rencanaPulang: n('rencanaPulang'),
        tujuanJepang: n('tujuanJepang'),
        lamaJepang: n('lamaJepang'),
        gajiYen: n('gajiYen'),
        tabungan: n('tabungan'),
        bhsJepang: n('bhsJepang'),
        nilai: n('nilai'),
        lisensi: [g(a('lisensi'), a('lisensi_manual')), g(a('lisensi2'), a('lisensi2_manual'))]
          .filter(Boolean)
          .join(', '),
        eksJepang: n('eksJepang'),
        daruratNama: n('daruratNama'),
        daruratHubungan: n('daruratHubungan'),
        daruratWa: n('daruratWa'),
        kenalanNama: n('kenalanNama'),
        kenalanHubungan: n('kenalanHubungan'),
        kenalanPekerjaan: n('kenalanPekerjaan'),
        kenalanUsia: n('kenalanUsia'),
        kenalanAlamat: n('kenalanAlamat'),
        pendidikan: _,
        pekerjaan: A,
        keluarga: e,
        noPaspor: n('noPaspor'),
        tglTerbitPaspor: n('tglTerbitPaspor'),
        expPaspor: n('expPaspor'),
        kotaPaspor: n('kotaPaspor').toUpperCase(),
        noCoe: n('noCoe'),
        photoFile: m,
        jftFile: u,
        sswFile: s,
        ijazahSdFile: d,
        ijazahSmpFile: R,
        ijazahSmaFile: T,
        univFile: k,
        ktpFile: P,
        kkFile: K,
      };
    window
      .callAPI('submitMasterForm', [$])
      .then((r) => {
        if ((o && o.classList.add('hidden'), r && r.sessionInvalid)) {
          I(window.tr('form.mf_sesi_simpan'));
          return;
        }
        if (r.success) {
          var c = l ? window.tr('form.mf_alert_draft') : window.tr('form.mf_alert_final');
          (r.translationSkipped && (c += window.tr('form.mf_alert_translate')), alert(c));
        } else alert(window.tr('form.mf_alert_gagal') + r.message);
      })
      .catch((r) => {
        (o && o.classList.add('hidden'), alert(window.tr('form.mf_alert_koneksi') + r.message));
      });
  } catch (t) {
    let o = a('loading');
    (o && o.classList.add('hidden'), alert(window.tr('form.mf_alert_sistem') + t.message));
  }
}
U({
  toggleImaMade: h,
  gateLogin: O,
  onSswSelect: D,
  onPekerjaanSelect: H,
  onFamPekerjaanSelect: y,
  handleFile: C,
  changeStep: L,
  submitMaster: J,
});
export {
  L as changeStep,
  O as gateLogin,
  C as handleFile,
  y as onFamPekerjaanSelect,
  H as onPekerjaanSelect,
  D as onSswSelect,
  J as submitMaster,
  h as toggleImaMade,
};
