# stuti.design — Portfolio

A dark-theme portfolio website for a Senior Product Designer & Strategist.

## Highlights

- **Interactive hero** — a canvas of small drifting dots over a slowly floating
  orange gradient. Move the cursor and nearby dots wake up and connect into
  user-flow / system-diagram shapes (circles, squares, diamonds, directional
  arrows).
- **Subtle, smart animations** — staggered scroll reveals, count-up stats,
  magnetic buttons, a cursor glow, and hover micro-interactions on the case
  study mockups. All animations respect `prefers-reduced-motion`.
- **Zero dependencies** — plain HTML, CSS, and vanilla JavaScript. No build
  step required.

## Run locally

Open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

## Structure

```
index.html   — markup (hero, work, process, about, contact)
styles.css   — dark theme, layout, animations
script.js    — hero canvas, scroll reveals, count-ups, magnetic buttons
```
