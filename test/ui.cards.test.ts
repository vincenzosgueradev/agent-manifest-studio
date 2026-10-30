// @vitest-environment jsdom
/**
 * The information blocks are cards (head with icon and title, rows
 * with a label and a value), and every icon belongs to the tool's own set (asked by hand,
 * 2026-10-27).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { boot } from './helpers/ui-harness';
import { packageBytes } from './helpers/fixture';
import { ICON_NAMES } from '../src/icons';

const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');
const titles = (id: string) => [...document.querySelectorAll(`#${id} .panel-heading`)].map(h => h.textContent);

describe('the summary is made of cards', () => {
    it('has five, each with an icon and a title in its head', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        expect(titles('summary')).toEqual(['App', 'Developer', 'Look', 'Access', 'Manifest entries']);
        for (const head of document.querySelectorAll('#summary .panel-head')) {
            expect(head.querySelector('.panel-heading .icon'), head.textContent!).not.toBeNull();
            expect(head.querySelector('.panel-sub')?.textContent?.length ?? 0).toBeGreaterThan(3);
        }
    });

    it('each row has a small icon before its label and a value', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        const rows = [...document.querySelectorAll('#summary .fact-row')];
        expect(rows.length).toBe(6 + 4 + 4 + 3 + 3);   // the access card also lists the device permissions, the entries card the declared entries
        for (const r of rows) {
            expect(r.querySelector('.fact-label .icon'), r.textContent!).not.toBeNull();
            expect(r.querySelector('.fact-value')).not.toBeNull();
        }
    });

    it('icons carry a state chip: in the package (success) or declared but absent (error)', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes({ outline: null }));
        const state = (label: string) => [...document.querySelectorAll('#summary .fact-row')].find(r => r.textContent!.startsWith(label))!;
        expect(state('Colour icon').querySelector('.chip--success')?.textContent).toBe('in the package');
        expect(state('Outline icon').querySelector('.chip--error')?.textContent).toBe('declared, but not in the package');
        expect(state('Small colour icon').querySelector('.chip')).toBeNull();   // not declared: words only
    });

    it('identifiers, domains and unknown keys are code chips; missing keys are warning chips', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes({ manifest: { validDomains: ['a.com'], unknownAfter: { zebra: 1 }, omit: ['accentColor'] } }));
        const chipsOf = (label: string) => [...[...document.querySelectorAll('#summary .fact-row')].find(r => r.textContent!.startsWith(label))!.querySelectorAll('.chip')];
        expect(chipsOf('Bot ID').every(c => c.classList.contains('chip--code'))).toBe(true);
        expect(chipsOf('Valid domains').map(c => c.textContent)).toEqual(['a.com']);
        expect(chipsOf('Not recognised').map(c => c.textContent)).toEqual(['zebra']);
        expect(chipsOf('Missing').map(c => [c.textContent, c.classList.contains('chip--warning')])).toEqual([['accentColor', true]]);
    });

    it('long descriptions wrap inside their row instead of running off the card', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        const wrapped = [...document.querySelectorAll('#summary .fact-value--wrap')];
        expect(wrapped).toHaveLength(2);
    });
});

describe('the preview is made of cards', () => {
    it('has the colour icon, the outline icon and the app name', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        expect(titles('preview-body')).toEqual(['Colour icon', 'Outline icon', 'App name']);
        expect(document.querySelectorAll('#preview-body .panel .panel-heading .icon')).toHaveLength(3);
    });
});

describe('the checks are one table, grouped by subject, each group with a chip for its worst verdict', () => {
    const groups = () => [...document.querySelectorAll('#checks-body .group-title')].map(t => t.textContent);
    it('groups by subject and says "all pass" for a good package', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes());
        expect(groups()).toEqual(['Colour icon', 'Outline icon', 'Names', 'Descriptions', 'Accent colour', 'Manifest schema']);
        const chips = [...document.querySelectorAll('#checks-body .group-row .chip')];
        expect(chips.map(c => c.textContent)).toEqual(Array(6).fill('all pass'));
        expect(chips.every(c => c.classList.contains('chip--success'))).toBe(true);
    });

    it('a failing group says how many failed, a warning group how many warnings', async () => {
        const ui = await boot();
        const { padPngTo } = await import('./helpers/png-encoder');
        const { colorIcon } = await import('./helpers/fixture');
        await ui.open('a.zip', packageBytes({ color: padPngTo(colorIcon(), 80 * 1024), manifest: { nameShort: 'x'.repeat(31), accent: 'red' } }));
        const chipOf = (title: string) => [...document.querySelectorAll('#checks-body .group-row')].find(r => r.querySelector('.group-title')!.textContent === title)!.querySelector('.chip')!;
        expect(chipOf('Colour icon').textContent).toBe('1 with a warning');
        expect(chipOf('Colour icon').classList.contains('chip--warning')).toBe(true);
        expect(chipOf('Names').textContent).toBe('1 failed');
        expect(chipOf('Names').classList.contains('chip--error')).toBe(true);
        expect(chipOf('Accent colour').textContent).toBe('1 failed');
    });

    it('the small colour icon gets a group of its own only when it is declared', async () => {
        const ui = await boot();
        await ui.open('a.zip', packageBytes({ manifest: { color32Path: 'c32.png' } }));
        expect(groups()).toContain('Small colour icon');
    });

    it('verdict icons are the tool\'s icons: tick, triangle and cross', async () => {
        const ui = await boot();
        const { padPngTo } = await import('./helpers/png-encoder');
        const { colorIcon } = await import('./helpers/fixture');
        await ui.open('a.zip', packageBytes({ color: padPngTo(colorIcon(), 80 * 1024), manifest: { nameShort: 'x'.repeat(31) } }));
        const shape = (id: string) => document.querySelector(`[data-check-id="${id}"] .ind`)!.className;
        expect(shape('color.present')).toContain('icon-check-circle');
        expect(shape('color.weight')).toContain('icon-alert-triangle');
        expect(shape('name.short.length')).toContain('icon-x-circle');
    });
});

describe('icons', () => {
    const walk = (dir: string): string[] => readdirSync(dir).flatMap(n => {
        const p = join(dir, n);
        return statSync(p).isDirectory() ? walk(p) : [p];
    });

    it('every icon of the set has a mask rule in the stylesheet, and the stylesheet has no other', () => {
        const defined = [...css.matchAll(/^\.icon-([a-z-]+) \{ -webkit-mask-image/gm)].map(m => m[1]);
        expect([...defined].sort()).toEqual([...ICON_NAMES].sort());
    });

    it('every mask is an SVG data URI with the same style (16 grid, stroke 1.5)', () => {
        for (const m of css.matchAll(/^\.icon-([a-z-]+) \{ -webkit-mask-image: url\("([^"]+)"\); mask-image: url\("([^"]+)"\); \}$/gm)) {
            expect(m[2], m[1]).toBe(m[3]);
            expect(m[2], m[1]).toContain("viewBox='0 0 16 16'");
            expect(m[2], m[1]).toContain("stroke-width='1.5'");
            expect(m[2], m[1]).toContain("stroke-linecap='round'");
        }
    });

    it('every icon class used in the markup or the views exists in the set', () => {
        const files = [resolve(process.cwd(), 'src/index.html'), ...walk(resolve(process.cwd(), 'src/view')), resolve(process.cwd(), 'src/icons.ts')];
        const used = new Set<string>();
        for (const f of files) for (const m of readFileSync(f, 'utf8').matchAll(/\bicon-([a-z][a-z-]*)/g)) used.add(m[1]!);
        for (const name of used) {
            if (['canvas', 'row', 'btn'].includes(name) || name.startsWith('canvas-')) continue;   // the preview's canvas classes and the icon button
            expect(ICON_NAMES as readonly string[], `icon-${name}`).toContain(name);
        }
    });

    it('no icon is drawn with an inline <svg> (the host does not render it)', () => {
        for (const f of [resolve(process.cwd(), 'src/index.html'), ...walk(resolve(process.cwd(), 'src/view'))]) {
            expect(readFileSync(f, 'utf8'), f).not.toMatch(/<svg\b/);
        }
    });

    it('the logo is an SVG file with a viewBox', () => {
        const logo = readFileSync(resolve(process.cwd(), 'src/public/logo.svg'), 'utf8');
        expect(logo).toContain("viewBox='0 0 96 96'");
    });

    it('the logo is a single-colour outline: currentColor, no background tile, no fixed colours, two curly braces, no emoji', () => {
        const logo = readFileSync(resolve(process.cwd(), 'src/public/logo.svg'), 'utf8');
        expect(logo).toContain("stroke='currentColor'");
        expect(logo).not.toMatch(/<rect width='96'/);
        expect(logo).not.toMatch(/#[0-9a-fA-F]{3,8}|url\(#/);
        expect(logo).not.toMatch(/fill='(?!none)/);
        expect(logo.match(/<path d='M(?:24|72) 14/g)).toHaveLength(2);
        expect(logo).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
    });
});
