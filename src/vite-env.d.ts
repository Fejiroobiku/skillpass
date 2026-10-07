/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the SkillPass API, for example http://localhost:4000 */
  readonly VITE_API_URL?: string;
  /** "true" shows demo-only helpers: quick-login buttons and generated sample evidence. */
  readonly VITE_DEMO_MODE?: string;
}
