// types/globals.d.ts — Global type declarations for ASJ Portal
// Declares all window.* functions that are registered via bridge.js registerSeamAliases()
// and used across the codebase without explicit imports.

// ---------- Window interface augmentation ----------
interface Window {
  // Portal namespace (bridge.js)
  PortalBridge: Record<string, unknown>;

  // Admin session
  IS_ADMIN_PORTAL: boolean;

  // Theme
  currentTheme: string;

  // Current language (accessor via Object.defineProperty in i18n/core.js)
  CURRENT_LANG: string;

  // Core functions (registered by bridge.js registerSeamAliases)
  tr: (key: string, replacements?: Record<string, string>) => string;
  trOption: (value: string) => string;
  trOptionId: (value: string) => string;
  callAPI: (action: string, payload?: unknown[]) => Promise<Record<string, unknown>>;
  esc: (x: string) => string;
  escJs: (x: string) => string;
  resolveSelfUrl: (url: string) => string;
  renderLanguage: () => void;
  renderLanguageLight: () => void;
  toggleFormLanguage: () => void;

  // Auth
  isAdmin: () => boolean;

  // Toast / notification
  showToast: (message: string, type?: string) => void;
  toast: (message: string, type?: string) => void;

  // Upload
  uploadToCloudinary: (file: File) => Promise<string>;

  // Pagination
  loadCandidatesPage?: (page: number) => void;
  loadFormInboxPage?: (page: number) => void;

  // Catch-all for dynamic window.* aliases (bridge registers many more)
  [key: string]: unknown;
}

// ---------- Vendor script globals ----------
declare const QRCode: {
  toCanvas: (
    canvas: HTMLCanvasElement,
    text: string,
    opts?: Record<string, unknown>,
  ) => Promise<void>;
  toDataURL: (text: string, opts?: Record<string, unknown>) => string;
};

declare const XLSX: {
  read: (
    data: ArrayBuffer,
    opts?: Record<string, unknown>,
  ) => {
    SheetNames: string[];
    Sheets: Record<string, unknown>;
  };
  utils: {
    sheet_to_json: (sheet: unknown, opts?: Record<string, unknown>) => Record<string, unknown>[];
    sheet_to_csv: (sheet: unknown, opts?: Record<string, unknown>) => string;
  };
};

declare const mammoth: {
  convertToHtml: (options: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
};

// ---------- Netlify runtime ----------
interface NetlifyEvent {
  httpMethod: string;
  headers: Record<string, string>;
  path: string;
  queryStringParameters: Record<string, string> | null;
  body: string | null;
  isBase64Encoded: boolean;
}

interface NetlifyResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}

// ---------- Utility types ----------
type Nullable<T> = T | null;
type Optional<T> = T | undefined;

// ---------- callAPI types ----------
type ActionName = string;
type ActionPayload = unknown[];
