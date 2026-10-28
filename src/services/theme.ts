/** PPTB theme, light or dark (marketplace policy). Without an answer the dark theme stays. */

type ThemeSource = { getCurrentTheme?: () => unknown } | undefined;

export function applyTheme(): void {
    const set = (light: boolean) => { document.documentElement.dataset.theme = light ? 'light' : 'dark'; };
    const utils = (globalThis as { toolboxAPI?: { utils?: ThemeSource } }).toolboxAPI?.utils;
    void Promise.resolve(utils?.getCurrentTheme?.())
        .then(theme => set(theme === 'light'))
        .catch(() => set(false));
}

/** Calls `fn` whenever PPTB reports that its settings (theme included) changed. */
export function onSettingsChange(fn: () => void): void {
    const events = (globalThis as {
        toolboxAPI?: { events?: { on?: (cb: (e: unknown, p: { event: string }) => void) => void } };
    }).toolboxAPI?.events;
    events?.on?.((_e, payload) => { if (payload?.event === 'settings:updated') fn(); });
}
