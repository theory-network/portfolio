declare global {
  interface Window {
    // Set by prerender.mjs before the app boots; see ClientOnly.
    __PRERENDER__?: boolean;
    // Set by App once the client render has committed; read by prerender.mjs.
    __APP_READY__?: boolean;
  }
}

export {};
