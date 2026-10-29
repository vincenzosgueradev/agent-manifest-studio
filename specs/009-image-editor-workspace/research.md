# Research: Image Editor Workspace

- 2026-10-29, by hand (two screenshots): the editor opens in a card under the icon cards; the picture area is at most `min(520px, 48vh)`; the pixel reader sits in a row of its own; the zoom is four fixed buttons.
- A `position: fixed` element is not clipped by the scrolling panels of the tool (none of them has a transform); it covers the tool window, which is the container of the tool in PPTB. Unknown until tried: whether the host webview gives `Escape` to the page when the host has the focus (manual check 3).
- `wheel` with `ctrlKey` is how browsers zoom a page; the handler cancels it only on the picture, so the rest of the window keeps its normal behaviour. `preventDefault` needs a non-passive listener.
- jsdom has no layout: the effective zoom of `Fit` cannot be measured there, so the slider shows 100 when the real size is unknown.
