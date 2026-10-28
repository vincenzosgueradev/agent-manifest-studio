/**
 * What the package declares (FR-004, FR-005, FR-006), as cards in the manner of Agent Nameplate.
 * The app names are not repeated here: they are shown once, with the suffix editor, and in the
 * preview.
 */

import { card, chip, fact } from './card';
import { clear, el } from './dom';
import type { ManifestView, PackageFile } from '../types';

const HEX6 = /^#[0-9a-fA-F]{6}$/;

const chips = (items: string[], tone: 'code' | 'warning' = 'code'): HTMLElement =>
    el('div', { class: 'chip-list' }, ...items.map(i => chip(i, tone)));

/** The state of a declared icon: a chip that says whether it is in the package, and its size. */
function iconState(path: string | null, pkg: PackageFile): Node | null {
    if (path === null) return null;
    const entry = pkg.entries.find(e => e.path === path);
    if (!entry) return el('span', {}, chip('declared, but not in the package', 'error'), path);
    return el('span', {}, chip('in the package', 'success'), `${path} · ${(entry.data.length / 1024).toFixed(1)} KB`);
}

export function renderSummary(grid: HTMLElement, m: ManifestView, pkg: PackageFile): void {
    clear(grid);
    const miss = (path: string) => m.missingKeys.includes(path);

    grid.append(
        card({ icon: 'package', title: 'App', note: 'identity of the app and its bot' },
            el('div', { class: 'fact-list' },
                fact('tag', 'App version', m.appVersion, { missing: miss('version') }),
                fact('file-code', 'Manifest schema version', m.manifestVersion, { missing: miss('manifestVersion') }),
                fact('key', 'App ID', m.appId, { missing: miss('id'), copy: m.appId ? { text: m.appId, label: 'App ID' } : undefined }),
                fact('bot', 'Bot ID', m.botIds.length ? chips(m.botIds) : null, { copy: m.botIds.length ? { text: m.botIds.join('\n'), label: m.botIds.length > 1 ? 'Bot IDs' : 'Bot ID' } : undefined }),
                fact('file-text', 'Short description', m.descriptionShort, { missing: miss('description.short'), wrap: true }),
                fact('file-text', 'Full description', m.descriptionFull, { missing: miss('description.full'), wrap: true }))),

        card({ icon: 'user', title: 'Developer', note: 'who publishes it' },
            el('div', { class: 'fact-list' },
                fact('user', 'Name', m.developer.name, { missing: miss('developer.name') }),
                fact('globe', 'Website', m.developer.websiteUrl, urlCopy(m.developer.websiteUrl, 'website')),
                fact('shield', 'Privacy policy', m.developer.privacyUrl, urlCopy(m.developer.privacyUrl, 'privacy policy link')),
                fact('file-text', 'Terms of use', m.developer.termsOfUseUrl, urlCopy(m.developer.termsOfUseUrl, 'terms of use link')))),

        card({ icon: 'palette', title: 'Look', note: 'accent colour and icons' },
            el('div', { class: 'fact-list' },
                fact('palette', 'Accent colour', accentValue(m.accentColor), { missing: miss('accentColor'), copy: m.accentColor ? { text: m.accentColor, label: 'accent colour' } : undefined }),
                fact('image', 'Colour icon', iconState(m.icons.color, pkg), { missing: miss('icons.color') }),
                fact('layers', 'Outline icon', iconState(m.icons.outline, pkg), { missing: miss('icons.outline') }),
                fact('image', 'Small colour icon', iconState(m.icons.color32x32, pkg)))),

        card({ icon: 'lock', title: 'Access', note: 'what the app may reach' },
            el('div', { class: 'fact-list' },
                fact('key', 'Permissions', m.permissions === null ? null : (m.permissions.length ? chips(m.permissions) : 'none')),
                fact('key', 'Device permissions', m.devicePermissions === null ? null : (m.devicePermissions.length ? chips(m.devicePermissions) : 'none')),
                fact('globe', 'Valid domains', m.validDomains === null ? null : (m.validDomains.length ? chips(m.validDomains) : 'none')))),

        card({ icon: 'braces', title: 'Manifest entries', note: 'what the tool did and did not recognise' },
            el('div', { class: 'fact-list' },
                fact('list', 'Declared', m.keys.length ? chips(m.keys) : 'none'),
                fact('help-circle', 'Not recognised', m.unknownKeys.length ? chips(m.unknownKeys) : 'none'),
                fact('alert-triangle', 'Missing', m.missingKeys.length ? chips(m.missingKeys, 'warning') : 'none'))),
    );
}

const urlCopy = (url: string | null, label: string) => ({ copy: url ? { text: url, label } : undefined });

function accentValue(accent: string | null): Node | null {
    if (accent === null) return null;
    const swatch = el('span', { class: 'swatch', 'aria-hidden': 'true' });
    // The accent colour is data from the package, not theme: it is the one inline colour.
    if (HEX6.test(accent)) swatch.style.backgroundColor = accent;
    return el('span', { title: accent }, swatch, accent);
}
