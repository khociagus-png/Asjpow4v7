// js/core/sentry-dummy.js — No-op Sentry stub for standalone pages.
// Standalone pages (apply-full, master-full, ai_form, share, siswa-baru)
// import @sentry/browser via importmap. This dummy replaces the real
// @sentry/browser in those pages so they don't need the full SDK.
const noop = () => {};
export const init = noop;
export const captureException = noop;
export const captureMessage = noop;
export const setUser = noop;
export const addBreadcrumb = noop;
export const browserTracingIntegration = () => ({});
export const withScope = (fn) =>
  fn({ setTag: noop, setUser: noop, setExtra: noop, setContext: noop });
export default {
  init: noop,
  captureException: noop,
  captureMessage: noop,
  setUser: noop,
  addBreadcrumb: noop,
  browserTracingIntegration: () => ({}),
  withScope: (fn) => fn({ setTag: noop, setUser: noop, setExtra: noop, setContext: noop }),
};
