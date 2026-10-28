# Contract: screen

| Element id | Where | Behaviour |
|---|---|---|
| `ed-img-transparent-color` | colour icon card | Make background transparent |
| `ed-img-logo-colour`, `ed-img-borderless-color` | colour icon card | colour input (`#2b5fd9`), Logo without background |
| `ed-img-caption-color`, `ed-img-caption-outline` | icon cards | accent colour caption, outline icon explanation |
| `ed-img-white-outline` | outline card | Make the shape white |
| `ed-img-bar-colour`, `ed-img-onbar-outline` | outline card | Preview colour (`#5b5fc7`) and tile; never saved |
| `ed-img-msg-<slot>` | icon cards | message; class `is-info` for the two "not a fault" messages |
| `ed-img-revert-<slot>` | icon cards | visible only when the icon was replaced |
| `ed-card-suggest`, `ed-suggest-list`, `ed-suggest-note` | Look step | Suggestions card, hidden when empty |
| `ed-sg-<id>-icon`, `-bar-light`, `-bar-dark`, `-apply` | each design | previews and "Use this design" |
| `[data-fix-for=<check id>]`, `[data-goto=2|3]` | Checks step | "How to fix it" line and "Go to Details|Look" button of a check that does not pass |
| `export-version-hint`, `export-bump-btn` | Save step | version notice and "Raise it to X" |

Rules: no emoji; colours from custom properties; both themes; explicit labels; the app bar colours come
from `--bar-light-bg`, `--bar-light-fg`, `--bar-dark-bg`, `--bar-dark-fg`.
