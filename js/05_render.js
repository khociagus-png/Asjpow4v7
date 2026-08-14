    // 7. FUNGSI RENDER TAMPILAN ADMIN & PUBLIK
    // ==========================================

    // Seleksi baris Mail Inbox untuk hapus massal (key = rowIndex di ALL_FORM).
    var MAIL_SELECTED = {};

    // Chip dokumen share di modal Share Loker. SUMBER KEBENARAN frontend:
    // backend normalizeDokumenShare (netlify/functions/jobs.ts) HARUS menerima
    // semua chip ini — dijaga test scripts/__tests__/share-docs-sync.test.js.
    // 'ALL' = "Semua file folder": menampilkan SELURUH berkas folder kandidat
    // (SIM/KTP/ijazah dll) di share view, bukan hanya 3 berkas utama.
    var SHARE_DOC_CHIPS = ['CV', 'JFT', 'SSW', 'SIM A', 'KTP', 'KK', 'AKTE', 'IJAZAH', 'IJAZAH SD', 'IJAZAH SMP', 'IJAZAH SMA', 'UNIVERSITAS', 'ALL'];

    function adminSwitchTab(t) {
        var tabs = ['kelola', 'dbjob', 'mail', 'tambah', 'pelamar', 'jadwal', 'wa', 'config'];
        tabs.forEach(x => {
            var p = document.getElementById('admin-' + x); if (p) p.classList.add('hidden');
            var b = document.getElementById('tab-' + x); if (b) b.className = 'px-4 py-2.5 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg text-xs font-bold transition flex-1 md:flex-none text-center';
        });
        var tgtP = document.getElementById('admin-' + t); if(tgtP) tgtP.classList.remove('hidden');
        var tgtT = document.getElementById('tab-' + t); if(tgtT) tgtT.className = 'px-4 py-2.5 bg-red-600 text-white rounded-lg text-xs font-bold transition shadow-md flex-1 md:flex-none text-center';
        if (t === "mail") renderFormInbox();
        if (t === "wa") renderWaTemplates();
        if (t === "config") renderSysConfig();
    }

    function renderAdminFull() {
        safeSet('dash-loker', ALL_JOBS.filter(j => j.status.includes('OPEN')).length);
        var candTotal = ALL_CANDIDATES_TOTAL || ALL_CANDIDATES.length;
        safeSet('dash-pelamar', candTotal);
        var ccEl = document.getElementById('kandidat-count'); if (ccEl) ccEl.textContent = ALL_CANDIDATES.length + ' dari ' + candTotal + ' kandidat';
        var btnMore = document.getElementById('btn-muat-kandidat'); if (btnMore) btnMore.style.display = (ALL_CANDIDATES.length >= candTotal) ? 'none' : '';
        safeSet('dash-admin-name', currentAdminName);
        // FIX 2026-08-12: renderReport() dihapus — renderer Report Log dihapus total (migrasi 017) tapi call site-nya tertinggal,
        // menyebabkan ReferenceError "renderReport is not defined" di tiap render dashboard admin.
        renderAdmin(); renderDbFilters(); filterDbJob(); renderFormInbox(); filterKandidat(); renderJadwal(); renderTugas();
        renderDashboardAgenda(); renderWaTemplates();
    }

    function filterPublicData(s) { currentPublicFilter = s; limitPub = 10; renderPublicFiltered(); }

    // Filter status publik (Semua/Buka/Urgent/Tutup) dengan hitungan per status
    // + state aktif yang kontras di bar terang (Sakura) maupun gelap (Tokyo).
    function renderPublicFilterUI() {
        var light = (CURRENT_THEME === 'SAKURA');
        var defs = {
            ALL:    { key: 'public.all',    icon: 'fa-th-large',    active: 'bg-slate-700 hover:bg-slate-600 text-white' },
            OPEN:   { key: 'public.open',   icon: 'fa-door-open',   active: 'bg-emerald-600 hover:bg-emerald-500 text-white' },
            URGENT: { key: 'public.urgent', icon: 'fa-bolt',        active: 'bg-amber-500 hover:bg-amber-400 text-white' },
            CLOSE:  { key: 'public.close',  icon: 'fa-door-closed', active: 'bg-red-600 hover:bg-red-500 text-white' }
        };
        var count = function (st) {
            if (st === 'ALL') return ALL_JOBS.length;
            return ALL_JOBS.filter(function (j) { return String(j.status || '').toUpperCase().includes(st); }).length;
        };
        var baseInactive = light ? 'bg-slate-800/10 hover:bg-slate-800/20 text-slate-600' : 'bg-white/10 hover:bg-white/20 text-slate-300';
        ['ALL', 'OPEN', 'URGENT', 'CLOSE'].forEach(function (st) {
            var btn = document.getElementById('public-f-' + st);
            if (!btn) return;
            var active = (currentPublicFilter === st);
            btn.className = 'px-4 py-2 rounded-lg text-xs font-bold shadow-md transition ' + (active ? defs[st].active : baseInactive);
            btn.innerHTML = '<i class="fas ' + defs[st].icon + ' mr-1"></i> ' + tr(defs[st].key) +
                ' <span class="px-1.5 py-0.5 rounded-full text-[9px] ml-0.5 font-black ' + (active ? 'bg-white/30 text-white' : (light ? 'bg-slate-800/10 text-stone-700' : 'bg-white/10 text-slate-200')) + '">' + count(st) + '</span>';
        });
    }

    function renderPublicFiltered() {
        var tb = document.getElementById('public-table-body'); if (!tb) return; 
        renderPublicFilterUI();
        var html = ''; var arr = ALL_JOBS;
        if (currentPublicFilter !== 'ALL') { arr = ALL_JOBS.filter(j => j.status.includes(currentPublicFilter)); }
        
        var sourceArray = [...arr];
        sourceArray.sort(function(a, b) {
            var aOpen = (a.status || '').toUpperCase().includes('OPEN') ? 1 : 0;
            var bOpen = (b.status || '').toUpperCase().includes('OPEN') ? 1 : 0;
            if (aOpen !== bOpen) return bOpen - aOpen;
            
            var timeA = a.createdAt ? new Date(a.createdAt).getTime() : parseInt((a.code || '').replace(/\D/g, '')) || 0;
            var timeB = b.createdAt ? new Date(b.createdAt).getTime() : parseInt((b.code || '').replace(/\D/g, '')) || 0;
            return timeB - timeA;
        });

        for (var i = 0; i < Math.min(sourceArray.length, limitPub); i++) {
            var j = sourceArray[i];
            
            let statusKey = j.status.toLowerCase().replace(/[^a-z0-9]/g, '');
            let translatedStatus = tr('status.' + statusKey);
            if(translatedStatus === 'status.' + statusKey) translatedStatus = j.status;
            
            // FIX: tombol Lamar ikut tertutup kalau tahapan job sudah berjalan
            // (CHECK KAIWA dst) — bukan hanya dari kolom status CLOSE.
            var tutupLamar = jobTutupUntukLamar(j);
            var btnLamar = tutupLamar 
                ? '<button disabled class="w-full sm:w-auto px-4 py-2.5 bg-slate-600 rounded-lg text-white text-[10px] font-bold opacity-50 cursor-not-allowed shadow-inner border border-slate-500">' + tr('button.closed') + '</button>' 
                : '<button onclick="lamarJob(\'' + j.code + '\', \'' + j.kategori + '\', \'' + (j.dokumenShare || '') + '\')" class="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-[0_4px_15px_rgba(5,150,105,0.4)] transition text-[11px] font-bold border border-emerald-500/50"><i class="fas fa-paper-plane mr-1"></i> ' + tr('button.apply') + '</button>';
            
            var directUrl = getDirectDownloadUrl(j.templateCv);
            var btnTemplate = directUrl 
                ? '<a href="' + directUrl + '" target="_blank" download class="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg shadow-[0_4px_15px_rgba(2,132,199,0.4)] transition text-[10px] font-bold border border-sky-500/50"><i class="fas fa-download mr-1"></i> ' + tr('button.format') + '</a>' 
                : '';
                
            var actionBtns = '<div class="flex flex-col xl:flex-row gap-2 w-full justify-center">';
            actionBtns += '<button onclick="bukaDetailLoker(\'' + j.code + '\')" class="w-full sm:w-auto px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg shadow-[0_4px_15px_rgba(245,158,11,0.4)] transition text-[10px] font-black border border-amber-500/50" title="' + tr('button.detail') + '"><i class="fas fa-eye mr-1"></i> ' + tr('button.detail') + '</button>';
            if(btnTemplate) actionBtns += btnTemplate;
            actionBtns += btnLamar;
            actionBtns += '</div>';

            let ketHtml = (j.keterangan && j.keterangan !== '-') ? '<div class="mt-2 pt-2 border-t border-slate-700/50 text-[10px] ' + (CURRENT_THEME === 'SAKURA' ? 'text-amber-700' : 'text-amber-300/90') + ' leading-relaxed"><i class="fas fa-info-circle mr-1"></i> ' + j.keterangan + '</div>' : '';
            
            let gText = (j.gender || '').toUpperCase();
            let gLabel = trOption(j.gender);
            // Badge gender ikut theme: di SAKURA (light) pakai latar terang + teks gelap.
            let light = (CURRENT_THEME === 'SAKURA');
            let genderBadge = '';
            if (gText.includes('PRIA') || gText.includes('LAKI')) {
                genderBadge = '<span class="px-2 py-0.5 ' + (light ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-blue-900/50 text-blue-300 border-blue-500/50') + ' rounded text-[10px] font-bold shadow-sm whitespace-nowrap"><i class="fas fa-mars mr-1"></i> ' + gLabel + '</span>';
            } else if (gText.includes('WANITA') || gText.includes('PEREMPUAN')) {
                genderBadge = '<span class="px-2 py-0.5 ' + (light ? 'bg-pink-100 text-pink-700 border-pink-300' : 'bg-pink-900/50 text-pink-300 border-pink-500/50') + ' rounded text-[10px] font-bold shadow-sm whitespace-nowrap"><i class="fas fa-venus mr-1"></i> ' + gLabel + '</span>';
            } else {
                genderBadge = '<span class="px-2 py-0.5 ' + (light ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-purple-900/50 text-purple-300 border-purple-500/50') + ' rounded text-[10px] font-bold shadow-sm whitespace-nowrap"><i class="fas fa-venus-mars mr-1"></i> ' + (gLabel || '-') + '</span>';
            }

            let pamfletHtml = '';
            if (j.pamflet && j.pamflet !== '-' && j.pamflet.length > 5) {
                let thumbUrl = j.pamflet;
                let fullUrl = j.pamflet;
                let match = j.pamflet.match(/id=([a-zA-Z0-9_-]+)/) || j.pamflet.match(/\/d\/([a-zA-Z0-9_-]+)/);
                if (match) {
                    thumbUrl = 'https://drive.google.com/thumbnail?id=' + match[1] + '&sz=w300';
                    fullUrl = 'https://drive.google.com/thumbnail?id=' + match[1] + '&sz=w1500'; 
                }
                // Thumbnail storage (w-20 = ~80px): minta versi kecil + lazy —
                // gambar penuh hanya diunduh saat diklik zoom (bukaPamflet).
                thumbUrl = thumbnailUrl(thumbUrl, 200);
                pamfletHtml = '<img src="' + thumbUrl + '" loading="lazy" decoding="async" onclick="bukaPamflet(\'' + fullUrl + '\')" class="w-16 h-24 sm:w-20 sm:h-28 object-cover rounded-lg border ' + (light ? 'border-rose-200' : 'border-slate-600') + ' shadow-md cursor-pointer hover:opacity-80 hover:scale-105 transition-all flex-shrink-0" title="' + tr('ui.click_zoom') + '" alt="Pamflet">';
            }
                
            // Baris tabel ikut theme: SAKURA = wrap terang + teks gelap (bukan
            // putih), TOKYO = wrap gelap + teks terang seperti sebelumnya.
            let textTitle = light ? 'text-stone-800' : 'text-white';
            let textSub = light ? 'text-stone-600' : 'text-slate-300';
            let ketText = 'text-amber-300/90';
            let rowHover = light ? 'hover:bg-rose-900/5' : 'hover:bg-black/10';

            html += '<tr class="rt-row border-b ' + (THEMES[CURRENT_THEME] ? THEMES[CURRENT_THEME].border : 'border-slate-800') + ' ' + rowHover + ' transition">' +
                '<td data-label="' + tr('table.code') + '" class="p-4 text-sky-400 font-mono text-sm text-center font-bold align-top">' + j.code + '</td>' +
                '<td data-label="' + tr('table.job') + '" class="rt-full p-4 align-top whitespace-normal min-w-[250px]">' + 
                    '<div class="flex items-start gap-4">' + 
                        pamfletHtml + 
                        '<div class="flex flex-col pt-1">' +
                            '<span class="font-bold text-base ' + textTitle + ' leading-tight">' + j.pekerjaan + '</span>' +
                            '<div class="flex flex-wrap items-center gap-2 mt-2"><span class="text-[11px] ' + textSub + ' font-normal"><i class="fas fa-map-marker-alt mr-1 text-red-400"></i> ' + trOption(j.lokasi) + '</span>' + genderBadge + '</div>' +
                        '</div>' +
                    '</div>' +
                '</td>' +
                '<td data-label="' + tr('table.status') + '" class="p-4 text-center align-top">' + badgeTahapanDb(j.status) + '</td>' +
                '<td data-label="' + tr('table.req') + '" class="rt-full p-4 text-xs ' + textSub + ' whitespace-normal min-w-[250px] max-w-sm leading-relaxed align-top">' + String(j.syarat || '').split(',').map(function(s) { return trOption(s.trim()); }).join(', ') + ketHtml + '</td>' +
                '<td data-label="' + tr('table.action') + '" class="rt-full p-4 align-top w-48">' + actionBtns + '</td>' +
                '</tr>';
        }
        
        if (arr.length === 0) { html = '<tr><td colspan="5" class="p-10 text-center text-slate-500 font-bold">' + tr('public.empty') + '</td></tr>'; } 
        else if (arr.length > limitPub) { html += '<tr><td colspan="5" class="p-5 text-center"><button onclick="limitPub+=10; renderPublicFiltered();" class="px-6 py-2.5 bg-slate-800 text-white rounded-full text-xs font-bold shadow-lg hover:bg-slate-700">' + tr('button.more') + ' <i class="fas fa-chevron-down ml-2"></i></button></td></tr>'; }
        tb.innerHTML = html;
    }

    function filterKelolaLoker() {
        var el = document.getElementById('search-kelola');
        var val = el ? el.value.toLowerCase() : '';
        var arr = ALL_JOBS.filter(function(db) {
            return db.code.toLowerCase().includes(val) || db.pekerjaan.toLowerCase().includes(val);
        });
        renderAdmin(arr);
    }
    window.filterKelolaLoker = filterKelolaLoker;

    function renderAdmin(filteredJobs) {
        var tb = document.getElementById('admin-table-body'); if (!tb) { console.warn('admin-table-body element not found'); return; } var html = '';
        var sourceArray = [...(filteredJobs || ALL_JOBS || [])];
        sourceArray.sort(function(a, b) {
            var aOpen = (a.status || '').toUpperCase().includes('OPEN') ? 1 : 0;
            var bOpen = (b.status || '').toUpperCase().includes('OPEN') ? 1 : 0;
            if (aOpen !== bOpen) return bOpen - aOpen;
            
            var timeA = a.createdAt ? new Date(a.createdAt).getTime() : parseInt((a.code || '').replace(/\D/g, '')) || 0;
            var timeB = b.createdAt ? new Date(b.createdAt).getTime() : parseInt((b.code || '').replace(/\D/g, '')) || 0;
            return timeB - timeA;
        });
        
        for (var i = 0; i < Math.min(sourceArray.length, limitAdm); i++) {
            var j = sourceArray[i];
            html += '<tr class="rt-row border-b border-slate-800 hover:bg-white/5 transition-all">' +
                '<td data-label="' + tr('table.code') + '" class="p-4 font-mono text-red-300 font-bold">' + j.code + '</td>' +
                '<td data-label="' + tr('table.job') + '" class="rt-full p-4 font-bold text-white">' + j.pekerjaan + '</td>' +
                '<td data-label="' + tr('table.status') + '" class="p-4 text-center">' + badgeTahapanDb(j.status) + '</td>' +
                '<td data-label="' + tr('table.admin_action') + '" class="rt-full p-4 text-center flex flex-wrap justify-center gap-2">' +
                '<button onclick="aksiAdmin(\'✅ OPEN\', \'' + j.code + '\')" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-full text-[11px] text-white font-bold shadow-lg transition-all">' + tr('admin.set_open') + '</button> ' +
                '<button onclick="aksiAdmin(\'❌ CLOSE\', \'' + j.code + '\')" class="px-5 py-2 bg-slate-600 hover:bg-slate-500 rounded-full text-[11px] text-white font-bold shadow-lg transition-all">' + tr('admin.set_close') + '</button> ' +
                '<button onclick="bukaMatchmaking(\'' + j.code + '\', \'' + j.pekerjaan + '\', \'' + j.gender + '\')" class="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-full text-[11px] font-bold shadow-[0_0_10px_rgba(139,92,246,0.4)] transition-all"><i class="fas fa-search-dollar mr-1"></i> ' + tr('admin.btn_match') + '</button> ' +
                '<button onclick="aksiGenerateQr(\'' + j.code + '\', \'' + j.kategori + '\')" class="px-5 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-full text-[11px] font-bold shadow-lg transition-all"><i class="fas fa-qrcode mr-1"></i> ' + tr('admin.btn_qr_pamflet') + '</button>' +
                '<button onclick="bukaEditFullLoker(\'' + j.code + '\')" class="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-full text-[11px] font-bold shadow-lg transition-all"><i class="fas fa-edit"></i> ' + tr('admin.btn_edit') + '</button>' +
                '</td>' +
                '<td data-label="' + tr('table.delete') + '" class="p-4 text-center"><button onclick="hapusLoker(\'' + j.code + '\')" aria-label="' + tr('table.delete') + '" class="w-10 h-10 flex items-center justify-center bg-red-600 text-white rounded-full text-xs font-bold shadow-lg hover:scale-105 transition-all"><i class="fas fa-trash"></i></button></td>' +
                '</tr>';
        }
        if (sourceArray.length > limitAdm) { html += '<tr><td colspan="5" class="p-4 text-center"><button onclick="limitAdm+=10; renderAdmin();" class="text-xs text-red-400">' + tr('button.more') + '</button></td></tr>'; }
        tb.innerHTML = html;
    }

    function filterDbJob() {
        var el = document.getElementById('search-dbjob'); var val = el ? el.value.toLowerCase() : '';
        var arr = ALL_DB_JOBS.filter(function(db) {
            var matchSearch = (db.code || '').toLowerCase().includes(val) || (db.tsk || '').toLowerCase().includes(val) || (db.pekerjaan || '').toLowerCase().includes(val) || (db.lokasi || '').toLowerCase().includes(val);
            var matchBidang = (dbFilterBidang === 'ALL' || db.kategori === dbFilterBidang);
            var matchTahapan = (dbFilterTahapan === 'ALL' || db.tahapan === dbFilterTahapan);
            return matchSearch && matchBidang && matchTahapan;
        });
        arr.sort(function(a, b) {
            if (dbSortType === 'TERBANYAK') { return ALL_CANDIDATES.filter(c => c.idLoker === b.code).length - ALL_CANDIDATES.filter(c => c.idLoker === a.code).length; }
            let tA = new Date(a.createdAt || 0).getTime();
            let tB = new Date(b.createdAt || 0).getTime();
            if (tA === tB || isNaN(tA) || isNaN(tB)) {
                return dbSortType === 'TERLAMA' ? a.code.localeCompare(b.code) : b.code.localeCompare(a.code);
            }
            return dbSortType === 'TERLAMA' ? (tA - tB) : (tB - tA);
        });
        renderDbJobTable(arr);
    }

    // Badge warna untuk tahapan pipeline (posisi = warna progres) & status loker.
    // Logika warna tetap pakai NILAI ASLI; label tampil sesuai bahasa (trOption).
    function badgeTahapanDb(tahapan) {
        var t = String(tahapan || '-');
        var label = trOption(t);
        if (typeof tahapanStepIndex === 'function' && typeof tahapanPipeline === 'function') {
            var idx = tahapanStepIndex(t);
            if (idx >= 0) {
                var pipe = tahapanPipeline();
                var cls = (idx >= pipe.length - 2) ? 'bg-emerald-900/40 text-emerald-300 border-emerald-500/40' : (idx >= 4 ? 'bg-amber-900/40 text-amber-300 border-amber-500/40' : 'bg-sky-900/40 text-sky-300 border-sky-500/40');
                return '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold ' + cls + '"><i class="fas fa-chevron-circle-right"></i> ' + label + '</span>';
            }
        }
        var up = t.toUpperCase();
        if (/OPEN/.test(up)) return '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold bg-emerald-900/40 text-emerald-300 border-emerald-500/40"><i class="fas fa-door-open"></i> ' + label + '</span>';
        if (/URGENT/.test(up)) return '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold bg-red-900/40 text-red-300 border-red-500/40 animate-pulse"><i class="fas fa-exclamation-triangle"></i> ' + label + '</span>';
        if (/CLOSE/.test(up)) return '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold bg-red-900/40 text-red-300 border-red-500/40"><i class="fas fa-door-closed"></i> ' + label + '</span>';
        return '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold bg-slate-800 text-slate-300 border-slate-600"><i class="fas fa-tag"></i> ' + label + '</span>';
    }

    function renderDbJobTable(arr) {
        var tb = document.getElementById('admin-dbjob-body'); if (!tb) return; var html = '';
        for (var i = 0; i < Math.min(arr.length, limitDb); i++) {
            var db = arr[i]; var cands = ALL_CANDIDATES.filter(c => c.idLoker === db.code);
            html += '<tr class="rt-row border-b border-slate-800 hover:bg-white/5">' +
                '<td data-label="' + tr('table.job_code') + '" class="p-4 font-mono text-purple-300 font-bold">' + db.code + '</td>' +
                '<td data-label="' + tr('table.tsk') + '" class="p-4">' + db.tsk + '</td>' +
                '<td data-label="' + tr('table.field_location') + '" class="rt-full p-4">' + 
                    '<div class="font-bold text-white text-[13px]">' + db.pekerjaan + '</div>' + 
                    '<div class="text-[10px] text-slate-400 font-bold mt-1.5"><span class="text-sky-400"><i class="fas fa-tag mr-1"></i>' + trOption(db.kategori) + '</span> <span class="mx-1.5">&bull;</span> <span class="text-amber-300"><i class="fas fa-map-marker-alt text-red-400 mr-1"></i>' + trOption(db.lokasi) + '</span></div>' +
                '</td>' +
                '<td data-label="' + tr('table.candidate_count') + '" class="p-4 text-center cursor-pointer group" onclick="bukaModalListKandidat(\'' + db.code + '\')"><div class="inline-block px-4 py-1.5 bg-sky-900/30 group-hover:bg-sky-600 rounded-lg transition-all"><span class="text-sky-400 group-hover:text-white font-bold text-lg">' + cands.length + '</span></div></td>' +
                '<td data-label="' + tr('table.stage_status') + '" class="p-4 text-center">' + badgeTahapanDb(db.tahapan) + '</td>' +
                '<td data-label="' + tr('table.action_db') + '" class="p-4 text-center">' +
                    '<button onclick="bukaModalEditDbJob(\'' + db.code + '\', \'' + String(db.tahapan||'').replace(/'/g, "\\'") + '\', \'' + String(db.statusInt||'').replace(/'/g, "\\'") + '\')" class="px-3 py-1.5 bg-purple-600 text-white rounded font-bold shadow text-[10px]"><i class="fas fa-edit"></i> ' + tr('admin.btn_edit') + '</button>' +
                    '<button onclick="bukaModalShare(\'' + db.code + '\')" class="ml-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold shadow text-[10px]" title="' + tr('ui.share_toggle_text') + '"><i class="fas fa-share-alt"></i> ' + tr('ui.share_toggle') + '</button>' +
                '</td>' +
                '</tr>';
        }
        if (arr.length > limitDb) { html += '<tr><td colspan="6" class="p-4 text-center"><button onclick="limitDb+=10; filterDbJob();" class="text-xs text-purple-400 font-bold">' + tr('form.txt_lebih_banyak') + '</button></td></tr>'; }
        tb.innerHTML = html;
    }

    function shareLinkFor(jobCode) {
        var domain = window.location.origin + window.location.pathname.replace('index.html', '');
        return domain + 'share.html?job=' + encodeURIComponent(jobCode);
    }

    // ===== MODAL SHARE LOKER (upgrade dari inline expand) =====
    // Isi: (1) link share view utk TSK, (2) konfigurasi dokumen yang di-share,
    // (3) template copas WA GAYA LAMA (era GAS) — URL menyesuaikan loker
    // (link share view), bukan link Google Drive.

    function getJobByCode(jobCode) {
        var arr = (typeof ALL_DB_JOBS !== 'undefined' && ALL_DB_JOBS.length) ? ALL_DB_JOBS
                : (typeof ALL_JOBS !== 'undefined' ? ALL_JOBS : []);
        for (var i = 0; i < arr.length; i++) if (arr[i].code === jobCode) return arr[i];
        return null;
    }

    // Buka modal share untuk 1 loker: isi semua seksi + tampilkan.
    function bukaModalShare(jobCode) {
        var modal = document.getElementById('modal-share-loker'); if (!modal) return;
        window.__shareJobCode = jobCode;
        var db = getJobByCode(jobCode);
        var pekerjaan = db && db.pekerjaan ? db.pekerjaan : '';
        var sub = document.getElementById('share-modal-sub');
        if (sub) sub.textContent = (db && db.tsk ? db.tsk : '-') + ' | ' + jobCode + ' — ' + pekerjaan;

        var linkInput = document.getElementById('share-link-view');
        if (linkInput) linkInput.value = shareLinkFor(jobCode);
        // Tombol "Buka Share View" — buka tampilan TSK (share.html?job=KODE) di
        // tab baru supaya admin bisa cek dokumen yang tampil sebelum kirim template.
        var openBtn = document.getElementById('share-open-view');
        if (openBtn) openBtn.href = shareLinkFor(jobCode);

        renderShareCheckboxes(jobCode, db);

        updateSharePreview(jobCode);
        // Mulai bersih tiap buka: preview share view disembunyikan + iframe
        // dikosongkan supaya tidak memuat loker lama saat modal dibuka lagi.
        var prevBox = document.getElementById('share-preview-box');
        var prevFrame = document.getElementById('share-preview-frame');
        if (prevBox) prevBox.classList.add('hidden');
        if (prevFrame) prevFrame.src = '';
        modal.classList.remove('hidden');
    }

    // Tutup modal share (X / backdrop) + reset preview supaya tidak nyangkut.
    function tutupModalShare() {
        var modal = document.getElementById('modal-share-loker'); if (!modal) return;
        modal.classList.add('hidden');
        var prevBox = document.getElementById('share-preview-box');
        var prevFrame = document.getElementById('share-preview-frame');
        if (prevBox) prevBox.classList.add('hidden');
        if (prevFrame) prevFrame.src = '';
    }

    // Toggle pratinjau share view DI DALAM modal (iframe same-origin) — admin
    // bisa cek tampilan TSK loker ini tanpa menutup modal / pindah tab.
    function toggleSharePreview(jobCode) {
        var prevBox = document.getElementById('share-preview-box'); if (!prevBox) return;
        var prevFrame = document.getElementById('share-preview-frame');
        var opening = prevBox.classList.contains('hidden');
        if (opening) {
            if (prevFrame) prevFrame.src = shareLinkFor(jobCode);
            prevBox.classList.remove('hidden');
        } else {
            prevBox.classList.add('hidden');
            if (prevFrame) prevFrame.src = '';
        }
    }

    // Label chip dokumen share (dwi-bahasa via tr()); token tanpa kunci
    // (SIM A, KTP, dll) tampil apa adanya.
    function shareDocLabel(key) {
        var kunci = { CV: 'ui.share_doc_cv', JFT: 'ui.share_doc_jft', SSW: 'ui.share_doc_ssw', 'IJAZAH SD': 'admin.doc_ijazah_sd', 'IJAZAH SMP': 'admin.doc_ijazah_smp', 'IJAZAH SMA': 'admin.doc_ijazah_sma', UNIVERSITAS: 'admin.doc_univ', ALL: 'ui.share_doc_all' }[key];
        return kunci ? tr(kunci) : key;
    }

    // Render checkbox dokumen yang di-share (di dalam modal).
    function renderShareCheckboxes(jobCode, db) {
        var wrap = document.getElementById('share-doc-checks'); if (!wrap) return;
        var docsStr = String((db && db.dokumenShare) || 'CV,JFT,SSW').toUpperCase();
        // Split HANYA di koma/titik-koma (bukan spasi) — "SIM A" tetap satu item,
        // tidak pecah jadi chip "SIM" + "A".
        var docsArr = docsStr.split(/[,;]+/).map(function (s) { return s.trim(); }).filter(Boolean);
        var allDocs = SHARE_DOC_CHIPS.slice();
        docsArr.forEach(function (d) { if (allDocs.indexOf(d) === -1) allDocs.push(d); });
        var chks = '';
        allDocs.forEach(function (key) {
            var isChecked = docsArr.indexOf(key) !== -1 ? 'checked' : '';
            var isAll = key === 'ALL';
            // Chip ALL dibedakan secara visual (aksen pink) supaya jelas ini
            // opsi "Semua file folder" — bukan dokumen biasa.
            var accent = isAll ? 'border-pink-500/60 hover:border-pink-400 text-pink-200' : 'border-slate-700 hover:border-emerald-500/50 text-slate-200';
            var checkAccent = isAll ? 'accent-pink-500' : 'accent-emerald-500';
            chks += '<label class="inline-flex items-center gap-2 px-3 py-2 bg-slate-950/60 border rounded-lg cursor-pointer text-[11px] font-bold ' + accent + '">' +
                '<input type="checkbox" id="share-chk-' + key.replace(/[^A-Z0-9]/g, '_') + '-' + jobCode + '" data-val="' + key + '" class="' + checkAccent + ' w-4 h-4 share-chk-' + jobCode + '" ' + isChecked + ' /> ' + shareDocLabel(key) + '</label>';
        });
        wrap.innerHTML = chks;
    }

    // Template pesan copas WA (gaya lama, URL MENYESUAIKAN loker):
    //  お疲れ様です
    //
    //   DOKUMEN
    //  TG583ASJ - TANI CO NOMADEN HOKKAIDO KUMAMOTO
    //
    //   KAMI APLOD /UPDATE DI SINI:
    //  <share view link loker ini>   <- share.html?job=KODE (bukan link Drive)
    //
    //  jika ada tambahan kami aplod di sini juga sensei
    //  宜しくお願いします.
    //
    // URL di baris "KAMI APLOD /UPDATE DI SINI" = LINK SHARE VIEW sesuai loker
    // (shareLinkFor) — TSK membuka tautan itu untuk melihat/mengunggah berkas
    // kandidat loker tersebut. Bukan link Google Drive.
    function templateShareWa(jobCode, pekerjaan) {
        return 'お疲れ様です\n\n DOKUMEN\n ' + jobCode + ' - ' + String(pekerjaan || '').toUpperCase() +
            '\n\n KAMI APLOD /UPDATE DI SINI: \n' + shareLinkFor(jobCode) +
            '\n\njika ada tambahan kami aplod di sini juga sensei\n宜しくお願いします.';
    }

    // Live preview template di textarea modal (URL share view otomatis per loker).
    function updateSharePreview(jobCode) {
        var pre = document.getElementById('share-template-preview'); if (!pre) return;
        var db = getJobByCode(jobCode);
        pre.value = templateShareWa(jobCode, db ? db.pekerjaan : '');
    }

    // Copas template ke WA.
    // Copas template ke WA.
    async function copasShareWa(jobCode) {
        var db = getJobByCode(jobCode);
        var textToCopy = templateShareWa(jobCode, db ? db.pekerjaan : '');
        try {
            await navigator.clipboard.writeText(textToCopy);
            showToast(tr('ui.toast_tsk_copied'), 'success');
        } catch (err) {
            showToast(tr('ui.toast_copy_text_failed'), 'error');
        }
    }

    // Copas link share view (share.html?job=...) dari modal.
    async function copyShareLink() {
        var linkInput = document.getElementById('share-link-view');
        if (!linkInput || !linkInput.value) return;
        try {
            await navigator.clipboard.writeText(linkInput.value);
            showToast(tr('ui.toast_tsk_copied'), 'success');
        } catch (err) {
            showToast(tr('ui.toast_copy_text_failed'), 'error');
        }
    }

    function currentShareDocs(jobCode) {
        var vals = [];
        var els = document.querySelectorAll('.share-chk-' + jobCode);
        els.forEach(function(el) {
            if (el.checked) vals.push(el.getAttribute('data-val'));
        });
        return vals;
    }

    async function simpanDokumenShare(jobCode) {
        var joined = currentShareDocs(jobCode).join(',');
        try {
            const res = await callGAS('updateDokumenShare', [jobCode, joined]);
            if (res.success) { showToast(tr('ui.toast_share_saved'), 'success'); refreshDataDinamis('dbjob'); }
            else { showToast(tr('alert.failed') + ' ' + (res.error || ''), 'error'); }
        } catch (err) { showToast(tr('alert.network') + (err && err.message ? err.message : err), 'error'); }
    }

    async function filterKandidat() {
        // Pencarian admin butuh daftar penuh - pastikan semua halaman sudah dimuat.
        if (typeof window.ensureAllCandidates === 'function') { try { await window.ensureAllCandidates(); } catch (e) {} }
        var el = document.getElementById('search-kandidat'); var val = el ? el.value.toLowerCase() : '';
        
        var genF = document.getElementById('filter-db-gender') ? document.getElementById('filter-db-gender').value : 'all';
        var ageF = document.getElementById('filter-db-age') ? document.getElementById('filter-db-age').value : 'all';
        var jftF = document.getElementById('filter-db-jft') ? document.getElementById('filter-db-jft').value : 'all';

        var arr = ALL_CANDIDATES.filter(function(c) { 
            // Text Search
            let matchText = c.nama.toLowerCase().includes(val) || c.idKandidat.toLowerCase().includes(val) || c.tahapan.toLowerCase().includes(val) || (c.idLoker && c.idLoker.toLowerCase().includes(val));
            if (!matchText) return false;

            // Gender Filter
            if (genF !== 'all') {
                let safeGender = (c.gender || '').toUpperCase();
                let isP = safeGender.includes('PEREMPUAN');
                let g = isP ? 'p' : 'l';
                if (g !== genF) return false;
            }

            // Age Filter
            if (ageF !== 'all') {
                let usia = parseInt(String(c.usia).replace(/\D/g, '')) || 0;
                if (ageF === 'under20' && (usia === 0 || usia >= 20)) return false;
                if (ageF === '20to25' && (usia < 20 || usia > 25)) return false;
                if (ageF === 'over25' && usia <= 25) return false;
            }

            // JFT Filter
            if (jftF !== 'all') {
                let jftText = (c.jft || c.nilai_jft || c.bahasa || c.catatanInt || '').toUpperCase();
                if (jftF === 'a2' && !jftText.includes('A2') && !jftText.includes('N4')) return false;
                if (jftF === 'b1' && !jftText.includes('B1') && !jftText.includes('N3')) return false;
            }

            return true;
        });
        renderKandidatTable(arr);
    }

    function renderKandidatTable(arr) {
        var tb = document.getElementById('admin-kandidat-body'); if (!tb) return; var html = '';
        for (var i = 0; i < Math.min(arr.length, limitKan); i++) {
            var c = arr[i]; var waLink = 'https://wa.me/' + String(c.wa).replace(/\D/g, '');
            
            let isVip = (c.catatanInt || '').includes('[VIP]');
            let logoSrc = ASSETS.LOGO || 'https://lh3.googleusercontent.com/d/1BP_kwGeqU3ESFq6Z6eOkmHJ8IF2aEHuG';
            
            let namaTampil = isVip ? c.nama + ' <img src="' + logoSrc + '" class="inline-block w-4 h-4 ml-1 rounded-full border border-emerald-500/50 object-contain drop-shadow-md" title="' + tr('ui.badge_official') + '">' : c.nama;

            html += '<tr class="rt-row border-b border-slate-800 hover:bg-white/5">' +
                '<td data-label="' + tr('table.candidate_id') + '" class="p-4 font-mono text-sky-300 font-bold">' + c.idKandidat + '</td>' +
                '<td data-label="' + tr('table.full_name') + '" class="p-4 font-bold text-white">' + namaTampil + '</td>' +
                '<td data-label="' + tr('table.applied_job') + '" class="p-4 text-amber-300 font-mono text-xs max-w-[120px] truncate">' + (c.idLoker || 'Umum') + '</td>' +
                '<td data-label="' + tr('table.stage_status') + '" class="rt-full p-4 text-xs font-bold text-sky-400">' + trOption(c.tahapan) + '<br><span class="text-[10px] font-normal text-slate-400">' + trOption(c.status) + '</span></td>' +
                '<td data-label="' + tr('table.admin_note') + '" class="rt-full p-4 text-[11px] text-slate-400 max-w-[150px] truncate">' + (c.catatanExt || c.catatan || '-') + '</td>' +
                '<td data-label="' + tr('table.action_candidate') + '" class="rt-full p-4 text-center flex gap-2 justify-center flex-wrap">' +
                
                // TOMBOL 1: Lihat Dashboard/Profil Digital
                '<button onclick="bukaDigitalCV(\'' + c.idKandidat + '\')" aria-label="' + tr('button.view_cv') + '" class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-[10px] shadow transition" title="' + tr('button.view_cv') + '"><i class="fas fa-user-circle"></i></button> ' +
                
                // TOMBOL 2: Tombol Baru Admin Lihat & Print CV
                '<button onclick="bukaPreviewCV_Admin(\'' + c.wa + '\')" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] shadow transition font-bold" title="' + tr('ui.view_rireki') + '"><i class="fas fa-file-pdf mr-1"></i> CV</button> ' +
                
                // TOMBOL 3: Super Edit Kandidat
                '<button onclick="bukaSuperEditKandidat(\'' + c.idKandidat + '\')" class="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-[10px] font-bold shadow transition" title="' + tr('ui.edit_candidate') + '"><i class="fas fa-user-shield"></i> ' + tr('admin.btn_edit') + '</button> ' +
                
                // TOMBOL 4 & 5: Buka Form Master Manual & Kirim WA
                '<button onclick="bukaMasterEksternalAdmin(\'' + c.wa + '\', \'' + c.nama + '\')" class="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded text-[10px] shadow transition" title="' + tr('ui.open_master_form') + '"><i class="fas fa-file-alt"></i> AI CV</button>' +
                '<button onclick="bukaModalWaPintar(\'' + c.idKandidat + '\')" aria-label="' + tr('ui.send_wa_call') + '" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] shadow transition" title="' + tr('ui.send_wa_call') + '"><i class="fab fa-whatsapp"></i></button>' +
                '</td></tr>';
        }
        if (arr.length > limitKan) { html += '<tr><td colspan="6" class="p-4 text-center"><button onclick="limitKan+=10; filterKandidat();" class="text-xs text-sky-400 font-bold">' + tr('form.txt_lebih_banyak') + '</button></td></tr>'; }
        tb.innerHTML = html;
    }

    // Perbarui highlight tombol filter status Mail Inbox + hitungan per status.
    // Status baru (konsisten dgn config list_status_lamaran): MENUNGGU,
    // REVIEW ADMIN, LULUS, GAGAL — legacy APPROVED/REJECTED tetap dihitung
    // ke LULUS/GAGAL biar data lama tidak hilang dari daftar.
    var MAIL_STATUS_KEYS = ['MENUNGGU', 'REVIEW', 'LULUS', 'GAGAL', 'ALL'];
    var MAIL_STATUS_LABEL = { MENUNGGU: 'MENUNGGU', REVIEW: 'REVIEW ADMIN', LULUS: 'LULUS', GAGAL: 'GAGAL', ALL: 'SEMUA' };
    var MAIL_STATE_OF = function(x) { return (x.status || 'MENUNGGU').toUpperCase(); };
    // Kelompokkan status (baru + legacy) ke bucket filter.
    var MAIL_BUCKET = function(st) {
        if (st === 'MENUNGGU' || st === 'MAIL' || st === 'BARU' || st === 'PENDING') return 'MENUNGGU';
        if (st === 'REVIEW ADMIN' || st === 'REVIEW') return 'REVIEW';
        if (st === 'LULUS' || st === 'LOLOS' || st === 'APPROVED' || st === 'APPROVE') return 'LULUS';
        if (st === 'GAGAL' || st === 'TOLAK' || st === 'REJECTED' || st === 'REJECT') return 'GAGAL';
        return st; // status lain → bucket = dirinya sendiri
    };
    function renderMailFilterUI() {
        MAIL_STATUS_KEYS.forEach(function(s) {
            var b = document.getElementById('mail-f-' + s);
            if (b) b.className = (mailFilterStatus === s)
                ? 'px-3 py-2 text-[10px] font-bold bg-sky-600 text-white transition'
                : 'px-3 py-2 text-[10px] font-bold text-slate-300 hover:text-white hover:bg-slate-700 transition';
        });
        var el = document.getElementById('mail-status-counts');
        if (el) {
            // Hitungan konsisten dengan filter: MENUNGGU = MENUNGGU+MAIL+BARU+PENDING,
            // LULUS = LULUS+LOLOS+APPROVED+APPROVE, GAGAL = GAGAL+TOLAK+REJECTED+REJECT.
            var count = function(st) {
                if (st === 'ALL') return ALL_FORM.length;
                return ALL_FORM.filter(function(x) { return MAIL_BUCKET(MAIL_STATE_OF(x)) === st; }).length;
            };
            el.innerHTML = '<span class="text-sky-400">' + tr('ui.waiting_label') + count('MENUNGGU') + '</span> &nbsp;|&nbsp; ' +
                '<span class="text-amber-400">' + tr('ui.review_label') + count('REVIEW') + '</span> &nbsp;|&nbsp; ' +
                '<span class="text-emerald-400">' + tr('ui.lulus_label') + count('LULUS') + '</span> &nbsp;|&nbsp; ' +
                '<span class="text-red-400">' + tr('ui.gagal_label') + count('GAGAL') + '</span> &nbsp;|&nbsp; ' +
                '<span class="text-slate-300">' + tr('ui.total_label') + count('ALL') + '</span>';
        }
    }

    function renderFormInbox() {
        var tb = document.getElementById('admin-mail-body'); if (!tb) return; var html = '';
        // Filter status (default MENUNGGU/MAIL/BARU utk daftar review; bisa
        // diubah lewat tombol APPROVED/REJECTED/ALL) + pencarian nama/WA/job.
        var arr = ALL_FORM.filter(function(f) {
            var st = MAIL_STATE_OF(f);
            var bucket = MAIL_BUCKET(st);
            var ok = false;
            if (mailFilterStatus === 'ALL') ok = true;
            else if (mailFilterStatus === 'MENUNGGU') ok = (bucket === 'MENUNGGU');
            else if (mailFilterStatus === 'REVIEW') ok = (bucket === 'REVIEW');
            else if (mailFilterStatus === 'LULUS') ok = (bucket === 'LULUS');
            else if (mailFilterStatus === 'GAGAL') ok = (bucket === 'GAGAL');
            else ok = (st === mailFilterStatus);
            if (!ok) return false;
            if (mailSearchText) {
                var q = mailSearchText.toLowerCase();
                return (f.nama || '').toLowerCase().includes(q) || (f.wa || '').includes(q) || (f.code || '').toLowerCase().includes(q);
            }
            return true;
        });
        renderMailFilterUI();
        for (var i = 0; i < arr.length; i++) {
            var f = arr[i];
            
            var btnPhoto = (f.photo && f.photo !== '-' && f.photo.toLowerCase().startsWith('http')) ? '<button onclick="bukaFotoPreview(\'' + f.photo + '\')" class="px-2 py-1 bg-pink-600 hover:bg-pink-500 text-white rounded text-[9px] font-bold shadow transition">Foto</button>' : '';
            var btnJft   = (f.jft && f.jft !== '-' && f.jft.toLowerCase().startsWith('http')) ? '<button onclick="bukaPdfPreview(\'' + f.jft + '\')" class="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[9px] font-bold shadow transition">JFT</button>' : '';
            var btnSsw   = (f.ssw && f.ssw !== '-' && f.ssw.toLowerCase().startsWith('http')) ? '<button onclick="bukaPdfPreview(\'' + f.ssw + '\')" class="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[9px] font-bold shadow transition">SSW</button>' : '';
            var btnCv    = (f.cv && f.cv !== '-' && f.cv.toLowerCase().startsWith('http')) ? '<button onclick="bukaPdfPreview(\'' + f.cv + '\')" class="px-2 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-[9px] font-bold shadow transition">CV</button>' : '';

            var st = MAIL_STATE_OF(f);
            var isProcessed = (MAIL_BUCKET(st) === 'LULUS' || MAIL_BUCKET(st) === 'GAGAL');
            var badgeClass = (MAIL_BUCKET(st) === 'LULUS') ? 'bg-emerald-900/50 border-emerald-500/40 text-emerald-300'
                : (MAIL_BUCKET(st) === 'GAGAL') ? 'bg-red-900/50 border-red-500/40 text-red-300'
                : (MAIL_BUCKET(st) === 'REVIEW') ? 'bg-sky-900/40 border-sky-500/30 text-sky-400'
                : 'bg-amber-900/40 border-amber-500/30 text-amber-300';
            // Row yang sudah diproses: tampilkan keterangan feedback, tanpa tombol review.
            // Escape teks bebas (alasan reject dari admin) supaya tidak bisa
            // menyisipkan HTML/script saat dirender.
            var esc = function(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
            var actionCell = '';
            var deleteBtn = '<button onclick="hapusFormMail(' + f.rowIndex + ')" class="px-2 py-1.5 bg-slate-700 hover:bg-red-600 text-slate-400 hover:text-white rounded-lg text-[10px] font-bold shadow transition" title="' + tr('ui.delete_mail') + '"><i class="fas fa-trash-alt"></i></button>';
            if (isProcessed) {
                actionCell = '<div class="flex items-center gap-2 justify-center"><div class="text-[10px] text-slate-400">' + esc(f.keterangan || (MAIL_BUCKET(st) === 'GAGAL' ? tr('ui.lamaran_ditolak') : tr('ui.lamaran_disetujui'))) + '</div>' + deleteBtn + '</div>';
            } else {
                // Tombol Tandai Review hanya untuk yang masih MENUNGGU/BARU (belum
                // ditandai review). Yang sudah REVIEW ADMIN langsung Lulus/Gagal.
                var reviewBtn = (MAIL_BUCKET(st) !== 'REVIEW')
                    ? '<button onclick="prosesReviewForm(' + f.rowIndex + ')" class="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-[10px] font-bold shadow transition" title="' + tr('ui.set_review') + '">' + tr('form.txt_review_admin') + '</button> '
                    : '';
                actionCell = '<div class="flex gap-2 justify-center flex-wrap">' +
                    reviewBtn +
                    '<button onclick="prosesApproveForm(' + f.rowIndex + ')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold shadow transition" title="' + tr('ui.set_pass') + '">' + tr('form.txt_lulus') + '</button> ' +
                    '<button onclick="prosesRejectForm(' + f.rowIndex + ')" class="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-bold shadow transition" title="' + tr('ui.set_fail') + '">' + tr('form.txt_gagal') + '</button> ' +
                    deleteBtn +
                    '</div>';
            }

            // Checkbox pilih (fitur hapus massal): simpan posisi asli di ALL_FORM
            // (rowIndex) supaya deleteForm tetap benar walau daftar ter-filter.
            var ck = (MAIL_SELECTED[f.rowIndex]) ? ' checked' : '';
            html += '<tr class="rt-row border-b border-slate-800 hover:bg-white/5">' +
                '<td class="p-4 text-center"><input type="checkbox" class="mail-check" data-idx="' + f.rowIndex + '" onclick="toggleMailSelect(this)" ' + ck + ' aria-label="Pilih" class="w-4 h-4 accent-rose-500 cursor-pointer"></td>' +
                '<td data-label="' + tr('table.timestamp') + '" class="p-4 text-[10px] text-slate-400 whitespace-nowrap">' + (f.timestamp ? String(f.timestamp).substring(0, 10) : '-') + '</td>' +
                '<td data-label="' + tr('table.job_code') + '" class="p-4 font-mono text-sky-300 font-bold text-xs">' + f.code + '</td>' +
                '<td data-label="' + tr('table.category') + '" class="p-4 text-[10px] font-bold text-amber-300 uppercase">' + trOption(f.kategori || '-') + '</td>' +
                '<td data-label="' + tr('table.applicant_name') + '" class="p-4 font-bold text-white text-xs whitespace-nowrap">' + f.nama + '</td>' +
                '<td data-label="' + tr('table.wa_num') + '" class="p-4 text-xs text-emerald-400">' + f.wa + '</td>' +
                '<td data-label="' + tr('table.status') + '" class="p-4 text-center"><span class="px-2 py-1 rounded text-[9px] font-bold ' + badgeClass + '">' + trOption(f.status) + '</span></td>' +
                '<td data-label="' + tr('table.doc_folder') + '" class="rt-full p-4 text-center">' +
                    '<div class="flex flex-wrap gap-1 justify-center">' +
                        '<a href="' + f.folderUrl + '" target="_blank" aria-label="' + tr('table.doc_folder') + '" class="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-[9px] font-bold shadow transition"><i class="fas fa-folder text-amber-400"></i></a>' +
                        btnPhoto + btnJft + btnSsw + btnCv +
                    '</div>' +
                '</td>' +
                '<td data-label="' + tr('table.action_review') + '" class="rt-full p-4 text-center">' + actionCell + '</td>' +
                '</tr>';
        }
        if (arr.length === 0) {
            var emptyMsg = (mailFilterStatus === 'ALL') ? 'TIDAK ADA DATA MAIL' : 'TIDAK ADA DATA MAIL DENGAN STATUS ' + (MAIL_STATUS_LABEL[mailFilterStatus] || mailFilterStatus);
            html = '<tr><td colspan="9" class="p-4 text-center text-slate-500 font-bold">' + emptyMsg + '</td></tr>';
        }
        tb.innerHTML = html;
    }

    // ==========================================
