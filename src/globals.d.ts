/// <reference types="@pptb/types" />

/**
 * PPTB declares its APIs on `window`. The services use `globalThis`, the same object in the
 * renderer, so that they also load where `window` does not exist (the Node tests).
 */

declare global {
    // eslint-disable-next-line no-var
    var toolboxAPI: typeof window.toolboxAPI;
    /** Version of package.json, injected by the build (vite `define`). */
    const __APP_VERSION__: string;
}

export {};
