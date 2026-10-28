# Loghi di esempio per provare Agent Manifest Studio

Sette loghi originali di agenti (nessun marchio reale): **robot**, **spark** (scintilla), **bubble**
(chat), **headset** (assistente), **hexnet** (rete), **shield** (protezione), **orbit**. Ognuno e' in piu'
versioni, pensate per provare una funzione del tool. `overview.png` li mostra tutti.

| Cartella | Contenuto | Cosa provare |
|---|---|---|
| `01-white-background` | 512 x 512, logo colorato su bianco piatto | "Make background transparent", "Logo without background", Suggestions |
| `02-brand-tile-white-logo` | 512 x 512, logo bianco su colore piatto | stesso, e il controllo del contrasto |
| `03-transparent-colour` | 512 x 512, logo colorato su trasparente | "Choose a PNG", Suggestions, anteprima sull'accent |
| `04-white-on-transparent` | 512 x 512, forma bianca su trasparente | Editor: "Outline from this icon" |
| `05-outline-32` | 32 x 32, forma bianca su trasparente | icona outline pronta (i controlli devono passare) |
| `06-teams-ready-192` | 192 x 192, logo nella safe area, trasparente | icona a colori pronta (i controlli devono passare) |
| `07-edge-cases` | casi limite, vedi sotto | rifiuti, avvisi e messaggi |

## 07-edge-cases

| File | Cosa deve succedere |
|---|---|
| `gradient-background-robot.png` | "Make background transparent" rifiuta: lo sfondo non e' un colore piatto |
| `logo-touches-the-edges-spark.png` | controllo safe area: avviso (il logo esce dai 120 x 120 centrali) |
| `wide-600x400-headset.png` | non quadrata: l'editor la rende quadrata (Make square / Teams-ready) |
| `huge-1600-hexnet.png` | piu' di 1024 px: l'editor la riduce e lo dice |
| `many-colours-spark.png` | piu' colori: Suggestions offre anche "Keep the colours of your logo" |
| `low-contrast-white-on-light-yellow-shield.png` | logo bianco su giallo chiaro: avviso di contrasto |
| `soft-shadow-on-white-robot.png` | sfondo con ombra morbida: prova tolleranza, softness e matte di "Remove background" |
| `robot-white-background.jpg` | JPEG: dipende dal decoder della finestra PPTB (controllo manuale 7 della spec 004) |
| `heavy-noisy-192-robot.png` | 192 x 192 sopra i 100 KB: il controllo del peso fallisce, "Edit image" e "Apply" la riscrive |
| `coloured-outline-32-robot.png` | outline colorata: il controllo "white" fallisce, "Make the shape white" la corregge |

## Rigenerare

`python make-logos.py` (servono `pillow` e `numpy`). Ogni immagine e' disegnata a 4x e ridotta, per
avere bordi lisci. I disegni sono nel codice: cambiare colori o forme e' una riga.
