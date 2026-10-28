/**
 * The Manifest schema card (feature 008): one line that says whether the manifest follows the JSON schema of its version,
 * the address of that schema, and, for each problem, where it is, what is wrong in plain words, what the schema expects,
 * what was found and what the schema says about the entry. Problems are grouped by the top-level entry, so a manifest with
 * many problems in `developer` reads as one block. It only draws; what is a problem is decided by services/schema.
 */

import { chip, copyButton } from './card';
import { clear, el } from './dom';
import { icon, type IconName } from '../icons';
import { problemsText, type Problem, type SchemaReport } from '../services/schema';

const count = (n: number): string => `${n} ${n === 1 ? 'problem' : 'problems'}`;

/** `developer.websiteUrl` belongs to `developer`, `bots[0].scopes` to `bots`, the root to `(manifest)`. */
const groupOf = (p: Problem): string => /^[^.[]+/.exec(p.path)?.[0] ?? p.path;

function line(label: string, value: string, cls = ''): HTMLElement {
    return el('p', { class: `sch-line${cls ? ` ${cls}` : ''}` }, el('span', { class: 'sch-line-label' }, label), el('span', { class: 'sch-line-value' }, value));
}

function problemRow(p: Problem): HTMLElement {
    return el('li', { class: 'sch-problem', 'data-keyword': p.keyword },
        el('div', { class: 'sch-head' }, icon('alert-triangle', 'ind ind--warning'), el('code', { class: 'sch-path', title: p.path }, p.path)),
        el('p', { class: 'sch-message' }, p.message),
        line('Expected', p.expected),
        line('Found', p.found),
        p.description ? line('Schema says', p.description, 'sch-line--says') : null,
        p.suggestion ? el('p', { class: 'sch-hint' }, icon('info', 'icon--xs'), p.suggestion) : null);
}

function groupBlock(name: string, items: Problem[]): HTMLElement {
    return el('details', { class: 'sch-group', 'data-group': name, open: true },
        el('summary', { class: 'sch-summary' }, el('code', { class: 'sch-group-name' }, name), chip(count(items.length), 'warning')),
        el('ul', { class: 'sch-list' }, ...items.map(problemRow)));
}

const HEADLINE: Record<SchemaReport['state'], (r: SchemaReport) => string> = {
    valid: r => `The manifest follows schema v${r.version}`,
    invalid: r => `${count(r.problems.length)} against schema v${r.version}`,
    'no-schema': () => 'The manifest was not validated',
};
const HERO_ICON: Record<SchemaReport['state'], IconName> = { valid: 'check-circle', invalid: 'alert-triangle', 'no-schema': 'info' };
const HERO_TONE: Record<SchemaReport['state'], 'success' | 'warning' | 'info'> = { valid: 'success', invalid: 'warning', 'no-schema': 'info' };

export function renderSchema(body: HTMLElement, chipSlot: HTMLElement, r: SchemaReport): void {
    clear(body);
    clear(chipSlot);
    const chipText = r.state === 'valid' ? `follows v${r.version}` : r.state === 'invalid' ? count(r.problems.length) : 'not validated';
    const badge = chip(chipText, HERO_TONE[r.state]);
    badge.id = 'schema-chip';
    chipSlot.append(badge);

    const copy = r.problems.length > 0
        ? el('button', { id: 'schema-copy-problems', type: 'button', class: 'btn btn--secondary btn--sm', 'data-copy': problemsText(r), title: 'Copy every problem as text' }, icon('copy', 'icon--xs'), 'Copy problems')
        : null;

    body.append(el('div', { class: `sch-hero sch-hero--${r.state}` },
        icon(HERO_ICON[r.state], 'sch-hero-icon'),
        el('div', { class: 'sch-hero-text' },
            el('h4', { class: 'sch-headline', id: 'schema-headline' }, HEADLINE[r.state](r)),
            r.state === 'no-schema' ? null : el('p', { class: 'sch-sub', id: 'schema-checked' }, `${r.checked} entries compared with the schema`)),
        copy));

    if (r.url !== null) {
        body.append(el('div', { class: 'sch-source' },
            el('span', { class: 'sch-source-label' }, 'Schema'),
            el('span', { class: 'sch-version', id: 'schema-version' }, `v${r.version}`),
            el('code', { class: 'sch-url', id: 'schema-url', title: r.url }, r.url),
            copyButton(r.url, 'the address of the schema')));
    }

    const notes = el('div', { class: 'sch-notes', id: 'schema-notes' }, ...r.notes.map(n => el('p', { class: 'sch-note' }, icon('info', 'icon--xs'), n)));
    body.append(notes);

    if (r.problems.length > 0) {
        const byGroup = new Map<string, Problem[]>();
        for (const p of r.problems) {
            const g = groupOf(p);
            byGroup.set(g, [...(byGroup.get(g) ?? []), p]);
        }
        body.append(el('div', { class: 'sch-groups' }, ...[...byGroup].map(([name, items]) => groupBlock(name, items))));
    }

    body.append(el('p', { class: 'sch-proof', id: 'schema-proof' },
        'This does not prove that Teams accepts the package: Teams also checks the icons, the domains and its store rules. It was worked out on this computer from a copy of the schema that is part of the tool; nothing was fetched.'));
}

/** Forget what is drawn (a new package starts clean). */
export function resetSchema(body: HTMLElement, chipSlot: HTMLElement): void {
    clear(body);
    clear(chipSlot);
}
