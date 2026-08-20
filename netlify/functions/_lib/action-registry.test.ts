// @ts-nocheck
// ==========================================
// TESTS: action-registry — kontrak action backend.
// Registry (action-registry.js) adalah SATU-SATUNYA sumber kebenaran nama
// action. Test ini menjaga:
//   1. setiap handler terdaftar benar-benar fungsi;
//   2. grup rate limit hanya berisi action yang terdaftar;
//   3. SETIAP action yang dipanggil frontend (callAPI('x', ...)) ada di
//      registry — typo nama action gagal di sini, bukan di runtime produksi.
// ==========================================
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const {
  ACTION_HANDLERS,
  LOGIN_ACTIONS,
  AI_ACTIONS,
  FONNTE_ACTIONS,
} = require('./action-registry.ts');

const ROOT = process.cwd();
const CALL_RE = /callAPI\(\s*['"]([^'"]+)['"]/g;

function walkJs(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const abs = join(dir, f);
    if (f.endsWith('.ts') && !f.includes('.test.')) out.push(abs);
    else if (!f.includes('.')) walkJs(abs, out);
  }
  return out;
}

// Semua literal action yang dipanggil frontend via callAPI.
function frontendActions() {
  const files = [
    ...walkJs(join(ROOT, 'js')),
    join(ROOT, 'api-client.ts'),
    join(ROOT, 'partials/modals-shared.html'),
  ];
  const found = new Set();
  for (const f of files) {
    if (!existsSync(f)) continue;
    const src = readFileSync(f, 'utf8');
    CALL_RE.lastIndex = 0;
    let m;
    while ((m = CALL_RE.exec(src)) !== null) found.add(m[1]);
  }
  return [...found].sort();
}

describe('ACTION_HANDLERS — isi registry', () => {
  it('semua nilai adalah fungsi (handler terdaftar benar)', () => {
    for (const [name, h] of Object.entries(ACTION_HANDLERS)) {
      expect(typeof h, `handler '${name}' harus fungsi`).toBe('function');
    }
  });

  it('tidak kosong dan tidak ada nama duplikat', () => {
    const names = Object.keys(ACTION_HANDLERS);
    expect(names.length).toBeGreaterThan(50);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('grup rate limit ⊆ registry', () => {
  for (const [label, set] of [
    ['LOGIN', LOGIN_ACTIONS],
    ['AI', AI_ACTIONS],
    ['FONNTE', FONNTE_ACTIONS],
  ]) {
    it(`${label}_ACTIONS hanya berisi action terdaftar`, () => {
      for (const a of set) {
        expect(ACTION_HANDLERS[a], `'${a}' harus ada di ACTION_HANDLERS`).toBeDefined();
      }
    });
  }
});

// Kunci-kunci literal di peta NETLIFY_FUNCTIONS (api-client.js) — routing
// action → nama function Netlify. Parsed dari sumber karena peta ini PRIVATE
// modul (tidak di-export). Menjaga agar SETIAP action yang dipanggil frontend
// punya route — tanpa ini callAPI menolak dengan "Aksi tidak dikenal" walau
// handler backend-nya ada (bug tandaiDibacaForm, 2026-08-18).
function netlifyFunctionRoutes() {
  const src = readFileSync(join(ROOT, 'api-client.ts'), 'utf8');
  const block = src.match(/const NETLIFY_FUNCTIONS = \{([\s\S]*?)\n\};/);
  if (!block) return [];
  const keys = [];
  const re = /^\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*:/gm;
  let m;
  while ((m = re.exec(block[1])) !== null) keys.push(m[1]);
  return keys;
}

describe('kontrak frontend → registry', () => {
  const front = frontendActions();
  it('menemukan action yang dipanggil frontend (sanity)', () => {
    expect(front.length).toBeGreaterThan(30);
  });

  it('setiap callAPI frontend ADA di registry backend', () => {
    const missing = front.filter((a) => !(a in ACTION_HANDLERS));
    expect(
      missing,
      'action dipanggil frontend tapi tidak terdaftar: ' + missing.join(', '),
    ).toEqual([]);
  });

  it('setiap callAPI frontend ADA di peta routing NETLIFY_FUNCTIONS', () => {
    const routes = new Set(netlifyFunctionRoutes());
    const missing = front.filter((a) => !routes.has(a));
    expect(
      missing,
      'action dipanggil frontend tapi tidak punya route NETLIFY_FUNCTIONS: ' + missing.join(', '),
    ).toEqual([]);
  });
});
