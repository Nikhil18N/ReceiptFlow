# Design System Document: Receipt Flow Editorial

## 1. Overview & Creative North Star: "The Financial Ledger Redefined"
The objective of this design system is to move away from the cluttered, utility-first appearance of traditional fintech and toward an **Editorial Minimalism**. We treat every receipt, transaction, and balance not as a row in a database, but as a story of a user's life.

**The Creative North Star: The Digital Curator.**
Like a high-end fashion magazine or a premium gallery catalog, the UI utilizes aggressive whitespace, intentional asymmetry, and a sophisticated typographic scale to create an atmosphere of calm authority. We break the "template" look by layering surfaces rather than boxing them in, ensuring the app feels like a bespoke concierge service rather than a spreadsheet.

---

## 2. Colors: Tonal Depth & The "No-Line" Rule
Our palette is rooted in the Emerald Green (`primary`) of global finance, balanced by a sophisticated grayscale that prioritizes "breathability."

### The "No-Line" Rule
**Strict Directive:** 1px solid borders for sectioning or container definition are prohibited. 
Visual separation must be achieved through **Background Color Shifts**. For example, a receipt detail card (`surface_container_lowest`) should sit on a background of `surface_container_low`. This creates a soft, natural edge that feels high-end and integrated.

### Surface Hierarchy & Nesting
Instead of a flat grid, treat the UI as stacked sheets of fine vellum.
*   **Base:** `surface` (#f8f9fa)
*   **Sectioning:** `surface_container_low` (#f3f4f5)
*   **Interactive Cards:** `surface_container_lowest` (#ffffff)
*   **System Overlays:** `surface_bright` (#f8f9fa)

### The Glass & Signature Texture
*   **Glassmorphism:** For floating Navigation Bars or Action Sheets, use `surface` at 80% opacity with a `20px` backdrop blur. This allows the primary emerald colors to bleed through, softening the interface.
*   **Signature Gradients:** For high-impact CTAs, use a subtle linear gradient from `primary` (#006d36) to `primary_container` (#50c878) at a 135-degree angle. This adds "soul" and a tactile, premium feel that flat hex codes lack.

---

## 3. Typography: The Editorial Voice
We utilize a dual-typeface system to balance authority with modern readability.

*   **Display & Headlines (Manrope):** Our "Voice." Manrope’s geometric yet warm proportions provide a modern, professional character. Use `display-lg` for account balances and `headline-md` for screen titles. The high contrast between large headlines and generous whitespace is the hallmark of this system.
*   **Body & Labels (Inter):** Our "Engine." Inter is used for all functional data. Use `body-md` for receipt details and `label-sm` for metadata (dates, categories).

**Typographic Intent:** Headlines should feel "looming" and confident, while body text remains tucked away with generous tracking (0.02em) to ensure the layout never feels cramped.

---

## 4. Elevation & Depth: Tonal Layering
We reject the heavy, muddy shadows of the early 2010s. Depth in this system is "Atmospheric."

*   **The Layering Principle:** Place a `surface_container_highest` element behind a `surface_container_lowest` card to create a sense of lift. Physicality is implied by color value, not structural lines.
*   **Ambient Shadows:** If a card must float (e.g., a scanned receipt preview), use an ultra-diffused shadow: `box-shadow: 0 20px 40px rgba(25, 28, 29, 0.04)`. The shadow color is a tint of `on_surface`, never pure black.
*   **The Ghost Border Fallback:** If a container requires definition against a similar background, use a "Ghost Border": `outline_variant` (#bdcabc) at **15% opacity**. It should be felt, not seen.

---

## 5. Components: Intentional Primitives

### Buttons
*   **Primary:** High-impact. Uses the signature Emerald gradient. Large corner radius (`full` or `xl`). No border.
*   **Secondary:** `surface_container_high`. Text color is `on_surface`. This allows the button to recede into the layout until needed.
*   **Tertiary:** Ghost style. No background, `primary` text weight at "Semi-bold".

### Cards & Lists (The "No Divider" Rule)
*   **Standard List:** Forbid the use of 1px dividers. Separate list items using `spacing-4` (1.4rem) of vertical whitespace. 
*   **Receipt Cards:** Use `surface_container_lowest` with a `lg` (1rem) corner radius. Information should be grouped via typographic hierarchy (Manrope for amounts, Inter for vendors).

### Input Fields
*   **Minimalist Inputs:** No box. Use a simple `surface_container_highest` background with a `sm` bottom-radius only, or a subtle `outline_variant` at 20% opacity. Focus states should transition the background to `surface_container_lowest` and animate a 2px `primary` underline.

### Specialized Component: The "Receipt Scan" Overlay
*   **Styling:** A semi-transparent `surface_dim` overlay with a "Scanning" line using a `primary` glow. The scanning frame should use "Ghost Borders" to maintain the minimalist aesthetic.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** embrace asymmetry. An account balance can be left-aligned while the "Add Receipt" button is centered-bottom to create a dynamic visual path.
*   **Do** use `tertiary` (Orange) and `secondary` (Blue) sparingly as semantic accents for categories (Dining vs. Transport). They should never compete with the Emerald `primary`.
*   **Do** use `spacing-12` (4rem) and `spacing-16` (5.5rem) to separate major content groups. Space is a luxury; use it.

### Don't:
*   **Don't** use 100% opaque borders. They create "visual noise" that contradicts the clean, professional aesthetic.
*   **Don't** use standard "drop shadows." If it looks like a default plugin setting, it is wrong for this system.
*   **Don't** crowd the edges of the screen. Maintain a minimum outer margin of `spacing-6` (2rem) for all content.
*   **Don't** use "Alert Red" for everything. Use `error_container` with `on_error_container` text for a sophisticated, less "alarming" notification style.

---

## 7. Scaling & Spacing
All spacing must follow the defined scale. 
*   **Small (Labels to Body):** `spacing-1.5` or `spacing-2`.
*   **Medium (Inside Cards):** `spacing-4`.
*   **Large (Section to Section):** `spacing-8` or `spacing-10`.

*Note: When in doubt, increase the spacing. If the layout feels "full," it is likely too crowded for this system's editorial intent.*