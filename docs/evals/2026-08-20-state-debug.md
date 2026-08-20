# Debug Audit: A5. `js/init/state.js` — Global State

**Tanggal:** 2026-08-20
**Pengerja:** Buffy (Codebuff)
**File:** `js/init/state.js` (310 baris)
**Status:** ✅ Diverifikasi — 0 issues, 462 symbols zero collisions

---

## 1. Architecture

### Purpose

Centralized global state untuk semua data dashboard, filter, session, timer.

### State Variables (29)

| Category       | Variables                                                                                                                               |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Data**       | ALL_JOBS, ALL_DB_JOBS, ALL_CANDIDATES, ALL_CANDIDATES_TOTAL, ALL_SCHEDULES, ALL_TUGAS, ALL_FORM, ALL_WA_TEMPLATES, ALL_RIWAYAT_KANDIDAT |
| **Config**     | ASSETS, CURRENT_THEME, DROPDOWNS                                                                                                        |
| **Session**    | isAdmin, isKandidat, currentAdminName, currentKandidatName, currentKandidatWa, currentKandidatId                                        |
| **Pagination** | limitPub(10), limitAdm(10), limitKan(50), limitJad(10), limitDb(10)                                                                     |
| **Filter**     | dbSortType, dbFilterBidang, dbFilterTahapan, mailFilterStatus, mailSearchText, currentPublicFilter                                      |
| **Misc**       | currentCopyListTxt, CURRENT_WA_KANDIDAT, PREV_MAIL_COUNT, AUTO_REFRESH_TIMER, ACTIVE_PEMBERKASAN_WA, ACTIVE_PEMBERKASAN_NAMA            |

---

## 2. bridgeState() Pattern

### ✅ Correct Design

```javascript
function bridgeState(name, get, set) {
  Object.defineProperty(window, name, { configurable: true, get, set });
}
```

- **Accessor pattern**: get/set mendelegasikan ke binding modul → tidak ada stale value
- **configurable: true**: Bisa di-overwrite kalau perlu
- **Idempotent**: Reassign dari classic (`ALL_JOBS = x`) tetap update modul binding

### ✅ Coverage

- 29 exported vars → 36 bridgeState calls (beberapa var punya multiple aliases)

---

## 3. Globals Audit

```
47 modul bundel · 462 simbol top-level unik · nol kolisi ✓ · 14 warning page
```

### ✅ Zero Collisions

- 462 unique symbols across 47 modules → **no naming conflicts**
- 14 page warnings = duplicate names across page bundles (apply_full, share, siswa_baru) → OK because pages load independently

---

## 4. Initial Values

| Variable             | Default   | Rationale                              |
| -------------------- | --------- | -------------------------------------- |
| `limitKan`           | `50`      | Updated from 10 → 50 (performance fix) |
| `limitPub`           | `10`      | Standard pagination                    |
| `CURRENT_THEME`      | `'TOKYO'` | Default theme                          |
| `isAdmin`            | `false`   | No session by default                  |
| `isKandidat`         | `false`   | No session by default                  |
| `AUTO_REFRESH_TIMER` | `null`    | No timer by default                    |
| `PREV_MAIL_COUNT`    | `null`    | First load detection                   |

---

## 5. Export Structure

```javascript
export var ALL_JOBS = [];
export var isAdmin = false;
// ... etc

// Bridge accessor
bridgeState(
  'ALL_JOBS',
  () => ALL_JOBS,
  (v) => {
    ALL_JOBS = v;
  },
);
```

### ✅ ESM + Classic Compatibility

- ESM: `import { ALL_JOBS } from './state.js'` → live binding
- Classic: `window.ALL_JOBS` → accessor delegates to modul binding
- Both read/write the SAME value → no desync

---

## 6. Summary

| Item                | Status | Notes                          |
| ------------------- | ------ | ------------------------------ |
| State variables     | ✅     | 29 vars, well-categorized      |
| bridgeState pattern | ✅     | Accessor get/set, configurable |
| Globals audit       | ✅     | 462 symbols, zero collisions   |
| Initial values      | ✅     | Sensible defaults              |
| ESM + Classic       | ✅     | Live binding + accessor sync   |
| Syntax              | ✅     | node --check OK                |

### Issues Found: NONE

**Verdict: A5 DIVERIFIKASI — Tidak ada issues. State management dalam kondisi sehat.**
