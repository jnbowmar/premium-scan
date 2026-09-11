/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SCAN_RECIPIENT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
