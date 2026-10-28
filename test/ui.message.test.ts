// @vitest-environment jsdom
/** A message about a file can be closed (asked by hand, 2026-10-26). */
import { describe, expect, it } from 'vitest';
import { boot } from './helpers/ui-harness';
import { packageBytes } from './helpers/fixture';

const enc = new TextEncoder();

describe('the refusal message', () => {
    it('has a button that closes it', async () => {
        const ui = await boot();
        await ui.open('bad.zip', enc.encode('nope'));
        expect(ui.$('load-message').hidden).toBe(false);
        const close = ui.$<HTMLButtonElement>('load-message-close');
        expect(close.textContent).toBe('Dismiss');
        expect(close.type).toBe('button');
        await ui.click('load-message-close');
        expect(ui.$('load-message').hidden).toBe(true);
    });

    it('comes back with the next refusal, with the new text only', async () => {
        const ui = await boot();
        await ui.open('one.zip', enc.encode('nope'));
        await ui.click('load-message-close');
        await ui.open('two.zip', enc.encode('nope'));
        expect(ui.$('load-message').hidden).toBe(false);
        expect(ui.text('load-message-text')).toContain('two.zip');
        expect(ui.text('load-message-text')).not.toContain('one.zip');
    });

    it('closing it leaves the package on screen', async () => {
        const ui = await boot();
        await ui.open('good.zip', packageBytes());
        await ui.open('bad.zip', enc.encode('nope'));
        await ui.click('load-message-close');
        expect(ui.$('summary').hidden).toBe(false);
        expect(ui.text('file-name')).toBe('good.zip');
    });

    it('goes away by itself when a package loads', async () => {
        const ui = await boot();
        await ui.open('bad.zip', enc.encode('nope'));
        await ui.open('good.zip', packageBytes());
        expect(ui.$('load-message').hidden).toBe(true);
    });
});
