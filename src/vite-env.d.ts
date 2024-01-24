/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
interface ImportMetaEnv {
  VITE_PUBLIC_ANALYTICS_ENABLE: string;
  VITE_PUBLIC_POSTHOG_KEY: string;
  VITE_PUBLIC_POSTHOG_API_HOST: string;
  VITE_PUBLIC_POSTHOG_UI_HOST: string;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
interface ImportMeta {
  env: ImportMetaEnv;
}
