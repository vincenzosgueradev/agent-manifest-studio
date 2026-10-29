// @vitest-environment jsdom
/**
 * Feature 010 on the real page: the sync suggestion on the icon cards, Accept, Not now, no repeat and no loop.
 * Ids and texts come from specs/010-icon-two-way-sync/contracts/ui-contract.md and data-model.md.
 */
import { describe, expect, it } from 'vitest';
import { boot, type Ui } from './helpers/ui-harness';
import { packageBytes } from './helpers/fixture';

const $ = (id: string): HTMLElement => document.getElementById(id)!;

async function loaded(opts: Parameters<typeof packageBytes>[0] = {}): Promise<Ui> {
    const ui = await boot();
    await ui.open('Sales.zip', packageBytes(opts));
    return ui;
}

/** Colour icon -> Edit image -> Teams-ready preset -> Apply: a direct edit the tool did not ask for. */
async function editColorDirectly(ui: Ui): Promise<void> {
    await ui.click('ed-img-edit-color');
    await ui.click('ie-preset-teams');
    await ui.click('ie-apply');
}

/** Outline icon -> Edit image -> "Outline from this icon" preset -> Apply: a direct edit of the outline. */
async function editOutlineDirectly(ui: Ui): Promise<void> {
    await ui.click('ed-img-edit-outline');
    await ui.click('ie-preset-outline');
    await ui.click('ie-apply');
}

const iconChangeRow = (slot: 'color' | 'outline'): HTMLElement | null => document.querySelector(`#changes-body tr[data-icon="${slot}"]`);

describe('a fresh package', () => {
    it('shows no sync suggestion on either card', async () => {
        await loaded();
        expect($('ed-img-sync-row-color').hidden).toBe(true);
        expect($('ed-img-sync-row-outline').hidden).toBe(true);
    });
});

describe('editing the colour icon directly', () => {
    it('offers to regenerate the outline icon, naming it', async () => {
        const ui = await loaded();
        await editColorDirectly(ui);
        expect($('ed-img-sync-row-outline').hidden).toBe(false);
        expect($('ed-img-sync-outline').textContent).toBe('The colour icon changed. Regenerate the outline icon to match its shape?');
        expect($('ed-sync-accept-outline').textContent).toContain('Regenerate');
        expect($('ed-img-sync-row-color').hidden).toBe(true);
    });

    it('Accept replaces the outline icon, lists it in Changes, and the suggestion goes away', async () => {
        const ui = await loaded();
        await editColorDirectly(ui);
        expect(iconChangeRow('outline')).toBeNull();
        await ui.click('ed-sync-accept-outline');
        expect($('ed-img-sync-row-outline').hidden).toBe(true);
        expect(iconChangeRow('outline')).not.toBeNull();
        expect(($('ed-revert-all-look') as HTMLButtonElement).disabled).toBe(false);
    });

    it('Revert all undoes the outline replacement together with the colour-icon edit', async () => {
        const ui = await loaded();
        await editColorDirectly(ui);
        await ui.click('ed-sync-accept-outline');
        await ui.click('ed-revert-all-look');
        expect(iconChangeRow('color')).toBeNull();
        expect(iconChangeRow('outline')).toBeNull();
        expect($('ed-img-sync-row-outline').hidden).toBe(true);
    });

    it('Not now leaves the outline icon untouched and hides the suggestion', async () => {
        const ui = await loaded();
        await editColorDirectly(ui);
        await ui.click('ed-sync-dismiss-outline');
        expect($('ed-img-sync-row-outline').hidden).toBe(true);
        expect(iconChangeRow('outline')).toBeNull();
    });

    it('does not show the suggestion again for the same colour-icon state', async () => {
        const ui = await loaded();
        await editColorDirectly(ui);
        await ui.click('ed-sync-dismiss-outline');
        // re-opening and re-applying the editor without a further edit does not bring it back
        await ui.click('ed-img-edit-color');
        await ui.click('ie-cancel');
        expect($('ed-img-sync-row-outline').hidden).toBe(true);
    });

    it('accepting it never produces the opposite (colour) suggestion: no loop', async () => {
        const ui = await loaded();
        await editColorDirectly(ui);
        await ui.click('ed-sync-accept-outline');
        expect($('ed-img-sync-row-color').hidden).toBe(true);
    });
});

describe('editing the outline icon directly', () => {
    it('offers to build a colour icon, naming the colour it will use', async () => {
        const ui = await loaded();
        await editOutlineDirectly(ui);
        expect($('ed-img-sync-row-color').hidden).toBe(false);
        expect($('ed-img-sync-color').textContent).toBe('The outline icon changed. Build a colour icon from its shape, on #07687d?');
        expect($('ed-sync-accept-color').textContent).toContain('Build colour icon');
    });

    it('Accept replaces the colour icon and the accent colour in one edit; the outline icon is untouched', async () => {
        const ui = await loaded();
        await ui.type('ed-accentColor', '#808080');   // close to grey: the base colour falls back to Teams blue
        await editOutlineDirectly(ui);
        await ui.click('ed-sync-accept-color');
        expect($('ed-img-sync-row-color').hidden).toBe(true);
        expect(iconChangeRow('color')).not.toBeNull();
        expect(document.querySelector('#changes-body tr[data-path="accentColor"]')).not.toBeNull();
        expect((document.getElementById('ed-accentColor') as HTMLInputElement).value.toLowerCase()).toBe('#2b5fd9');
    });

    it('a further hand-edit of the newly built colour icon is a real direct action and may offer the outline suggestion', async () => {
        const ui = await loaded();
        await editOutlineDirectly(ui);
        await ui.click('ed-sync-accept-color');
        await ui.click('ed-img-edit-color');
        await ui.click('ie-add-flip-h');
        await ui.click('ie-apply');
        expect($('ed-img-sync-row-outline').hidden).toBe(false);
    });
});
