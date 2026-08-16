// ai/providers.js — lapisan PROVIDER AI (Gemini) + helper parsing output AI.
// MODUL BARU (Fase 1.4 REFACTOR_TODO.md) — dipindah dari actions-ai.js,
// body fungsi byte-identik (perilaku tidak berubah).
'use strict';

const { env } = require('../env');

// ---------------------------------------------------------------------------
// Gemini
// ---------------------------------------------------------------------------
async function geminiGenerate(systemPrompt, history) {
  const key = env('GEMINI_API_KEY');
  if (!key) {
    return {
      reply:
        'Maaf, asisten AI belum dikonfigurasi (GEMINI_API_KEY belum diisi). Data kamu tetap aman tersimpan ya!',
    };
  }
  const contents = [{ role: 'user', parts: [{ text: systemPrompt }] }];
  for (const h of Array.isArray(history) ? history : []) {
    const role = h && h.role === 'assistant' ? 'model' : 'user';
    if (h && h.content) contents.push({ role, parts: [{ text: String(h.content) }] });
  }
  // Model saat ini (Agt 2026): gemini-1.5-flash & 2.0-flash sudah dihapus Google (404),
  // gemini-2.5-flash sudah tidak tersedia untuk key baru. Urutan = prioritas;
  // fallback otomatis ke model berikutnya. gemini-flash-latest selalu menunjuk ke
  // model flash stabil terbaru, sehingga tidak perlu update manual tiap migrasi.
  const models = ['gemini-flash-latest', 'gemini-3.5-flash', 'gemini-2.5-flash'];
  let lastErr = null;
  for (const model of models) {
    try {
      const res = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/' +
          model +
          ':generateContent?key=' +
          key,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents }),
        },
      );
      if (!res.ok) {
        lastErr = new Error('Gemini HTTP ' + res.status + ' ' + (await res.text()).slice(0, 120));
        continue;
      }
      const j = await res.json();
      const text =
        j &&
        j.candidates &&
        j.candidates[0] &&
        j.candidates[0].content &&
        j.candidates[0].content.parts
          ? j.candidates[0].content.parts.map((p) => p.text || '').join('')
          : '';
      if (text) return { reply: text };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Gemini tidak tersedia');
}

async function geminiParseFile(systemPrompt, file) {
  const key = env('GEMINI_API_KEY');
  if (!key) {
    throw new Error('GEMINI_API_KEY belum dikonfigurasi');
  }
  const contents = [
    {
      role: 'user',
      parts: [
        { inlineData: { mimeType: file.mimeType, data: file.data } },
        { text: systemPrompt },
      ],
    },
  ];
  const models = ['gemini-flash-latest', 'gemini-3.5-flash', 'gemini-2.5-flash'];
  let lastErr = null;
  for (const model of models) {
    try {
      const res = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/' +
          model +
          ':generateContent?key=' +
          key,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents }),
        },
      );
      if (!res.ok) {
        lastErr = new Error('Gemini HTTP ' + res.status + ' ' + (await res.text()).slice(0, 120));
        continue;
      }
      const j = await res.json();
      const text =
        j &&
        j.candidates &&
        j.candidates[0] &&
        j.candidates[0].content &&
        j.candidates[0].content.parts
          ? j.candidates[0].content.parts.map((p) => p.text || '').join('')
          : '';
      if (text) return text;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Gemini tidak tersedia');
}

function parseJsonLoose(text) {
  let t = String(text || '').trim();
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  try {
    return JSON.parse(t);
  } catch (e) {
    const start = t.indexOf('{');
    const end = t.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(t.slice(start, end + 1));
      } catch (e2) {
        /* fallthrough */
      }
    }
    throw e;
  }
}

module.exports = {
  geminiGenerate,
  geminiParseFile,
  parseJsonLoose,
};
