/**
 * Every number the tool compares against, in one place.
 *
 * Manifest limits: Microsoft 365 app manifest schema v1.30 (`root.name`, `root.description`,
 * `root.icons`), read on 2026-10-26. Icon weight: two Microsoft pages disagree (72 KB and 100 KB),
 * so the tool warns above the first and fails above the second until a test settles it
 * (specs/001-manifest-reader-preview/research.md section 4).
 */

/** Whole package file. A Teams package is a few hundred KB: more is wrong or hostile. */
export const PACKAGE_MAX_BYTES = 5 * 1024 * 1024;
/** One entry, once decompressed. */
export const ENTRY_MAX_BYTES = 1024 * 1024;
export const ENTRY_MAX_COUNT = 200;
/** All entries together once decompressed (200 entries of 1 MB would be 200 MB). */
export const PACKAGE_UNPACKED_MAX_BYTES = 16 * 1024 * 1024;

/** `name.short`: "Maximum string length: 30". */
export const NAME_SHORT_MAX = 30;
/** `name.full`: "Maximum string length: 100". */
export const NAME_FULL_MAX = 100;
/** `description.short`: "Maximum string length: 80". */
export const DESC_SHORT_MAX = 80;
/** `description.full`: "Maximum string length: 4000". */
export const DESC_FULL_MAX = 4000;

/** Colour icon: "192x192 pixels", a perfect square. */
export const COLOR_ICON_SIDE = 192;
/** Colour icon: "keep it within the 120 x 120 safe area in the center". */
export const COLOR_SAFE_AREA_SIDE = 120;
/** Outline icon: "32x32 pixels". */
export const OUTLINE_ICON_SIDE = 32;
export const COLOR32_ICON_SIDE = 32;

/** 1 KB is 1024 bytes. Warning above the first, failure above the second. */
export const ICON_WARN_BYTES = 72 * 1024;
export const ICON_FAIL_BYTES = 100 * 1024;

/** Suffix typed by the user: "1 to 20 characters without square brackets". */
export const SUFFIX_MAX = 20;

/** Largest PNG side the decoder allocates for, so a tiny file cannot ask for gigabytes. */
export const PNG_MAX_SIDE = 4096;

/** `developer.name`: "Maximum string length: 32" (schema v1.30, read on 2026-10-27). */
export const DEVELOPER_NAME_MAX = 32;
/** Developer links: "Maximum string length: 2048". */
export const URL_MAX = 2048;
/** `version`: "Maximum string length: 256". */
export const VERSION_MAX = 256;
/** `validDomains`: each item at most 2048 characters, at most 100 items. */
export const DOMAIN_MAX = 2048;
export const DOMAIN_MAX_ITEMS = 100;
/** `permissions` (deprecated): at most 2 items; `devicePermissions`: at most 5. */
export const PERMISSIONS_MAX_ITEMS = 2;
export const DEVICE_PERMISSIONS_MAX_ITEMS = 5;
