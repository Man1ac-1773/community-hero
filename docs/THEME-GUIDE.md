# THEME GUIDE: NEO-BRUTALISM & CIVIC UTILITY

This document contains the definitive styling guidelines for "Community Hero". All future development and AI agents must strictly adhere to these rules to maintain the Awwwards-worthy Neo-Brutalism aesthetic.

## 1. Core Philosophy
- **Industrial & Urgent:** The UI should feel like a highly functional, transparent city management tool.
- **Minimalist but Bold:** Rely on stark contrasts, loud typography, and sharp geometry.
- **NO EMOJIS:** Emojis instantly degrade the premium feel. Avoid them completely. Use stark SVG geometric icons or purely typographic elements instead.

## 2. Color Palette
Stick strictly to these CSS variables defined in `globals.css`:
- `--bg-color: #f4f4f0;` (Off-white / paper, used for the main background)
- `--text-color: #111111;` (Deep Onyx, used for all primary text)
- `--primary-color: #FF5500;` (Safety Orange, used for primary buttons, active states, and emphasis)
- `--border-color: #111111;` (Solid black for all borders)
- `white` (`#FFFFFF`) (Used for panels and cards to pop against the off-white background)

## 3. Typography
- **Font Family:** `Space Grotesk` (Google Fonts).
- **Headers (h1, h2, h3, h4):** Must be `font-weight: 700`, `text-transform: uppercase`, and have tight letter spacing (`letter-spacing: -0.03em`).
- **Body Text:** Use `font-weight: 600` for primary readability.
- **Data Points:** Coordinates, IDs, and severity levels should be bolded and highly visible.

## 4. UI Components & Styling Rules
### Borders & Shapes
- **No Softness:** `border-radius: 0` everywhere. No rounded corners on buttons, cards, or inputs.
- **Hard Borders:** All panels, buttons, and inputs must have a `2px solid var(--border-color)` border.

### Shadows & Depth
- **No Gradients or Blurs:** Absolutely no soft drop shadows or glassmorphism.
- **Solid Shadows:** Use solid offset shadows: `box-shadow: 4px 4px 0px 0px #111111;`.
- **Hover States:** On hover, elements should translate negatively (`transform: translate(-2px, -2px)`) and the shadow should increase (`box-shadow: 6px 6px 0px 0px #111111`).
- **Active States:** On click, elements should press down (`transform: translate(4px, 4px)`) and the shadow should disappear (`box-shadow: 0px 0px 0px 0px`).

### Component Classes
- `.brutalist-panel`: Use for cards, forms, and containers.
- `.btn-primary`: Use for primary calls to action (Orange background, white text).
- `.btn-secondary`: Use for secondary actions (White background, black text).

**DO NOT DEVIATE FROM THIS GUIDE.**
