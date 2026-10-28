# Research: Package Drop Zone

- 2026-10-28, jsdom: `DragEvent` is not implemented; tests dispatch an `Event` with a `dataTransfer` property, as `ui.package.test.ts` already does.
- dragenter/dragleave fire for every child; the standard fix is a counter (+1 on enter, -1 on leave, reset on drop).
- `dataTransfer.types` is readable during dragover (the files are not); it contains `Files` for files. Names and counts are readable only on drop.
- A Chromium webview navigates to a file dropped on a page that does not cancel `dragover` and `drop`; hence FR-007.
- Unknown until tried in PPTB: whether the host webview passes the OS drag to the page (manual check 1).
