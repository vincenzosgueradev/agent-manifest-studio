// @vitest-environment jsdom
/**
 * Principle V (theme) and VII (enterprise UI), FR-028: both themes are defined, text is readable
 * (WCAG contrast >= 4.5), colours come from custom properties, no emoji. The oracle is the WCAG
 * formula. Real pixels in the real PPTB window remain a manual check (quickstart 16).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { boot } from './helpers/ui-harness';
import { packageBytes } from './helpers/fixture';

const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');
const block = (open: string): string => {
    const i = css.indexOf(open);
    if (i < 0) throw new Error(`no block ${open}`);
    return css.slice(i, css.indexOf('}', i));
};
const vars = (b: string) => Object.fromEntries([...b.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(m => [m[1]!, m[2]!.trim()]));
const DARK = vars(block(':root {'));
const LIGHT = { ...DARK, ...vars(block(':root[data-theme="light"] {')) };

const lum = (hex: string): number => {
    const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
};
const contrast = (a: string, b: string): number => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x! + 0.05) / (y! + 0.05);
};

describe('the stylesheet is well formed', () => {
    // A rule copied half-way once left a block open and the build failed; no other test reads the CSS
    // as CSS (jsdom ignores it), so the structure is checked here.
    const stripped = css
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/url\((["'])[\s\S]*?\1\)/g, 'url()')
        .replace(/(["'])(?:\\.|(?!\1)[^\\\n])*\1/g, '""');
    it('braces are balanced', () => {
        let depth = 0;
        for (const ch of stripped) {
            if (ch === '{') depth++;
            if (ch === '}') depth--;
            expect(depth).toBeGreaterThanOrEqual(0);
        }
        expect(depth).toBe(0);
    });
    it('no rule opens inside another except media queries', () => {
        const withoutMedia = stripped.replace(/@keyframes[^{]*\{[\s\S]*?\}\s*\}/g, '').replace(/@media[^{]*\{([\s\S]*?\}\s*)\}/g, '$1');
        for (const m of withoutMedia.matchAll(/\{([^{}]*)\{/g)) throw new Error(`nested block near: ${m[0].slice(0, 80)}`);
    });
    it('every icon used in the markup and the views has a rule', () => {
        const used = new Set<string>();
        for (const f of ['src/index.html', 'src/view/steps.ts']) {
            for (const m of readFileSync(resolve(process.cwd(), f), 'utf8').matchAll(/icon-([a-z]+(?:-[a-z]+)*)/g)) used.add(m[1]!);
        }
        for (const name of used) {
            if (['head', 'sm', 'xs', 'canvas', 'row'].includes(name) || name.startsWith('canvas')) continue;
            expect(css, `.icon-${name}`).toContain(`.icon-${name} {`);
        }
    });
});

describe('both themes are defined', () => {
    it('the light theme redefines every colour of the dark one except the simulated Teams bars', () => {
        const light = vars(block(':root[data-theme="light"] {'));
        for (const k of Object.keys(DARK).filter(k => k.startsWith('--color-'))) {
            expect(light[k], `${k} missing in the light theme`).toBeDefined();
        }
    });
    it('the light theme is really different from the dark one', () => {
        for (const k of ['--color-bg', '--color-surface', '--color-text']) expect(LIGHT[k]).not.toBe(DARK[k]);
    });
});

describe('text is readable in both themes (contrast >= 4.5)', () => {
    const pairs: Array<[string, string]> = [
        ['--color-text', '--color-bg'], ['--color-text', '--color-surface'], ['--color-text', '--color-surface-2'],
        ['--color-text-muted', '--color-bg'], ['--color-text-muted', '--color-surface'], ['--color-text-muted', '--color-surface-2'],
        ['--color-text-strong', '--color-surface'], ['--color-on-primary', '--color-primary'], ['--color-on-primary', '--color-primary-hover'],
        ['--color-success', '--color-surface'], ['--color-warning', '--color-surface'], ['--color-error', '--color-surface'],
        ['--color-success', '--color-surface-2'], ['--color-warning', '--color-surface-2'], ['--color-error', '--color-surface-2'],
        ['--color-error', '--color-bg'],
        // state chips: the colour of the state on its own soft background
        ['--color-success', '--color-success-soft'], ['--color-warning', '--color-warning-soft'],
        ['--color-error', '--color-error-soft'], ['--color-info', '--color-info-soft'],
        ['--color-text-muted', '--color-surface-2'],
    ];
    for (const [name, theme] of [['dark', DARK], ['light', LIGHT]] as const) {
        it.each(pairs)(`${name}: %s on %s`, (fg, bg) => {
            expect(contrast(theme[fg]!, theme[bg]!)).toBeGreaterThanOrEqual(4.5);
        });
    }
    it('the simulated app bars keep their icon visible', () => {
        expect(contrast('#424242', LIGHT['--bar-light-bg']!)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(DARK['--bar-dark-fg']!, DARK['--bar-dark-bg']!)).toBeGreaterThanOrEqual(4.5);
    });
});

describe('colours come from custom properties', () => {
    it('the stylesheet uses hex colours only where it defines the properties', () => {
        const withoutDefinitions = css
            .replace(/:root\s*\{[^}]*\}/g, '')
            .replace(/:root\[data-theme="light"\]\s*\{[^}]*\}/g, '');
        expect(withoutDefinitions.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
    });
    it('the page markup carries no colour', () => {
        const html = readFileSync(resolve(process.cwd(), 'src/index.html'), 'utf8');
        expect(html.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
        expect(html).not.toMatch(/style=/);
    });
    it('the only inline colour on a loaded page is the package accent colour (data, not theme)', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        const styled = [...document.querySelectorAll<HTMLElement>('[style]')].filter(e => !/^(width|height):/.test(e.getAttribute('style')!));
        // the preview tile, the swatch of the accent field and the colour icon of the editor: all the same package colour
        expect(styled.length).toBeGreaterThan(0);
        for (const e of styled) expect(e.getAttribute('style')).toMatch(/^background(-color)?: rgb\(7, 104, 125\);$/);
    });
});

describe('no emoji, no browser-default checkboxes, nothing fixed-width', () => {
    const walk = (dir: string): string[] => readdirSync(dir).flatMap(n => {
        const p = join(dir, n);
        return statSync(p).isDirectory() ? walk(p) : [p];
    });
    const files = walk(resolve(process.cwd(), 'src')).filter(f => /\.(ts|html|css)$/.test(f));
    it('no emoji code point in any source file', () => {
        for (const f of files) expect(readFileSync(f, 'utf8'), f).not.toMatch(/\p{Extended_Pictographic}/u);
    });
    it('no checkbox input', () => {
        for (const f of files) expect(readFileSync(f, 'utf8'), f).not.toMatch(/type=["']checkbox["']|type:\s*['"]checkbox['"]/);
    });
    it('the layout fills its container: no max-width on the page shell', () => {
        const shell = block('.main-content {') + block('body {') + block('.panel {');
        expect(shell).not.toMatch(/max-width/);
        expect(css).toMatch(/\.main-content\s*\{[^}]*overflow-y:\s*auto/);
        expect(css).toMatch(/body\s*\{[^}]*overflow:\s*hidden/);
    });
    it('has a rule for a narrow pane', () => {
        expect(css).toContain('@media (max-width: 640px)');
    });
});

describe('the theme follows PPTB', () => {
    it.each(['light', 'dark'] as const)('applies the %s theme', async theme => {
        await boot({ theme });
        expect(document.documentElement.dataset.theme).toBe(theme);
    });
});

describe('cards are full width, one under another, on every screen', () => {
    const rule = (selector: string): string => {
        const i = css.indexOf(`${selector} {`);
        if (i < 0) throw new Error(`no rule ${selector}`);
        return css.slice(i, css.indexOf('}', i));
    };
    it.each(['.info-grid', '.preview-grid'])('%s is a single column', selector => {
        const r = rule(selector);
        expect(r).toContain('flex-direction: column');
        expect(r).not.toMatch(/grid-template-columns|flex-wrap:\s*wrap/);
    });
    it('a card does not set a width of its own', () => {
        expect(rule('.panel')).not.toMatch(/(^|[\s{;])(max-)?width:/);
    });
});
