/**
 * How to put right each check that does not pass. A check that reports a problem without saying what to do
 * about it leaves the user to guess: every id that `runChecks` can produce has its answer here, in words that
 * name the control to use, and the step where that control is (2 is Details, 3 is Look; `null` when the fix is
 * outside the tool). A test proves that no id is left without one.
 */

export interface Fix {
    /** What to do, naming the step and the control. */
    text: string;
    /** The step to go to (2 Details, 3 Look), or `null` when the fix is not made in this tool. */
    step: 2 | 3 | null;
}

const PICK_COLOUR = 'On the Colour icon card, press "Choose a 192 x 192 PNG", or "Edit image" and then "Apply".';
const PICK_OUTLINE = 'On the Outline icon card, press "Outline from this icon" (it makes the 32 x 32 white shape), or "Choose a 32 x 32 PNG".';

export const FIXES: Readonly<Record<string, Fix>> = {
    'schema.valid': { text: 'Read the Manifest schema card in the Package step: each problem names the entry, says what is wrong and what the schema expects. The tool edits only some entries (the names, the descriptions, the developer, the version and the accent colour); for any other, correct manifest.json in a text editor and open the package again.', step: null },
    'color.present': { text: `The colour icon is missing. ${PICK_COLOUR}`, step: 3 },
    'color.png': { text: 'The file is not a PNG that can be read. On the Colour icon card choose a PNG file, or press "Edit image" and "Apply": the tool writes a new, valid PNG.', step: 3 },
    'color.size-px': { text: 'The icon is not 192 x 192 pixels. On the Colour icon card press "Edit image" and then "Teams-ready colour icon": it resizes the picture to 192 x 192 without stretching it. Then press "Apply".', step: 3 },
    'color.square': { text: 'The icon is not square. On the Colour icon card press "Edit image", then "Make square" (or "Teams-ready colour icon"), then "Apply".', step: 3 },
    'color.format': { text: 'The tool cannot draw this kind of PNG (16 bits or interlaced). Press "Edit image" on the Colour icon card and "Apply": the picture is written again as an ordinary PNG. Teams may accept the file as it is.', step: 3 },
    'color.safe-area': { text: 'The logo goes outside the central 120 x 120 pixels, where Teams may crop it. Press "Edit image" on the Colour icon card and then "Fit" (or "Teams-ready colour icon"): it scales the logo into the safe area. Then press "Apply".', step: 3 },
    'color.weight': { text: 'The file is heavy. Press "Edit image" on the Colour icon card and "Apply": the PNG is written again, smaller. If it is still over the limit, use fewer colours and flatter areas.', step: 3 },
    'color.contrast': { text: 'The logo is too close to the accent colour behind it. In Look, pick an accent colour that stands out from the logo (Accent colour card), or change the logo colour on the Colour icon card with "Edit image" and its colour steps.', step: 3 },
    'outline.present': { text: `The outline icon is missing. ${PICK_OUTLINE}`, step: 3 },
    'outline.png': { text: 'The file is not a PNG that can be read. On the Outline icon card press "Outline from this icon" or choose a 32 x 32 PNG.', step: 3 },
    'outline.size-px': { text: 'The icon is not 32 x 32 pixels. On the Outline icon card press "Outline from this icon": it makes a 32 x 32 shape. Or choose a 32 x 32 PNG.', step: 3 },
    'outline.white': { text: 'The outline icon has colours. On the Outline icon card press "Make the shape white": every visible pixel becomes white and the see-through parts stay as they are. Teams colours the icon itself.', step: 3 },
    'color32.present': { text: 'The small colour icon is optional. Its file is not in the package: add it to the zip, or ignore this warning.', step: null },
    'color32.size-px': { text: 'The small colour icon is optional and should be 32 x 32 pixels. Replace the file in the zip with a 32 x 32 PNG, or ignore this warning.', step: null },
    'name.short.length': { text: 'The short name is too long. In Details, shorten "Short name" to at most 30 characters.', step: 2 },
    'name.full.length': { text: 'The full name is too long. In Details, shorten "Full name" to at most 100 characters.', step: 2 },
    'name.distinct': { text: 'The short and the full name are the same. Teams accepts that, but it is better if the full name says more. In Details, you can change "Full name" so that it says more than the short name, for example what the agent does.', step: 2 },
    'description.short.length': { text: 'The short description is missing or too long. In Details, write "Short description" in at most 80 characters.', step: 2 },
    'description.full.length': { text: 'The full description is missing or too long. In Details, write "Full description" in at most 4000 characters; it cannot be empty.', step: 2 },
    'accent.hex': { text: 'The accent colour is not a valid colour. In Look, type it as # followed by six hexadecimal digits (for example #07687d) or pick it with the colour picker.', step: 3 },
};

export function fixFor(id: string): Fix | null {
    return FIXES[id] ?? null;
}

export const STEP_NAME: Readonly<Record<2 | 3, string>> = { 2: 'Details', 3: 'Look' };
