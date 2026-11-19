---
name: ClearLedger
description: A calm, bright ledger with deep olive navigation and warm financial charts.
colors:
  olive: "#233326"
  lime: "#c4e77f"
  lime-hover: "#b4d56b"
  canvas: "#f5f6f2"
  panel: "#ffffff"
  text: "#263329"
  muted: "#5e685b"
  line: "#e0e4dc"
  navigation-text: "#e4eadf"
  navigation-hover: "#344733"
  navigation-active: "#5a703d"
  positive: "#46642d"
  negative: "#a8442d"
  focus: "#6b883b"
  budget-fill: "#8daa4e"
  budget-over: "#bd6046"
  budget-track: "#e9ece4"
  field-line: "#ccd4c5"
  badge-bg: "#e8eddc"
  badge-text: "#40522e"
  tag-bg: "#f4f3ec"
  housing: "#BC6043"
  food-dining: "#D79A48"
  shopping: "#D6BA69"
  transport: "#9BAF79"
  entertainment: "#627D50"
  other: "#C8C5B3"
typography:
  headline:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  title:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "21px"
    fontWeight: 650
    letterSpacing: "-0.025em"
  total:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "34px"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  body:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "16px"
    fontWeight: 400
  label:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "14px"
    fontWeight: 500
rounded:
  badge: "5px"
  field: "8px"
  control: "9px"
  habit: "12px"
  panel: "14px"
  dialog: "16px"
spacing:
  inline: "9px"
  control: "11px 16px"
  form-grid: "16px"
  mobile-gap: "18px"
  panel-gap: "22px"
  panel: "24px"
components:
  button-primary:
    backgroundColor: "{colors.lime}"
    textColor: "#263420"
    rounded: "{rounded.control}"
    padding: "{spacing.control}"
  button-primary-hover:
    backgroundColor: "{colors.lime-hover}"
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "{spacing.control}"
  field:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.olive}"
    rounded: "{rounded.field}"
    padding: "11px 12px"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel}"
  sample-badge:
    backgroundColor: "{colors.badge-bg}"
    textColor: "{colors.badge-text}"
    rounded: "{rounded.badge}"
    padding: "5px 8px"
  category-tag:
    backgroundColor: "{colors.tag-bg}"
    textColor: "{colors.text}"
    rounded: "{rounded.badge}"
    padding: "5px 8px"
---

# Design System: ClearLedger

## Overview

**Creative North Star: "The Calm Ledger"**

The approved balanced mockup A direction uses bright working surfaces, a deep olive navigation rail, and warm chart colors. A quiet, practical layout makes totals, remaining budgets, and transaction entry easy to find. These records describe the implemented static app in `dist/`, including the final CSS overrides.

**Key Characteristics:**
- Deep olive navigation with a lime primary action.
- White, finely bordered panels on a pale canvas.
- Clear financial numerals and exact values beside charts.
- Compact desktop review and stacked mobile totals.

## Colors

### Primary

Deep olive anchors navigation and field text; fresh lime marks the primary action and the sidebar habit note. Navigation has separate hover and selected tones.

### Secondary

Warm terracotta, ochre, sand, sage, forest, and stone identify the six categories in the order declared in `dist/model.mjs`. Keep the same category mapping across the donut, legend, and budget icons. Positive olive and negative terracotta provide status feedback, paired with amounts or explanatory text.

### Neutral

The pale canvas holds white panels. Dark olive ink supplies primary text, muted green-gray supplies supporting copy, and fine neutral strokes separate sections and fields.

**The Exact Value Rule.** Charts and budget fills accompany readable amounts and labels; color never carries financial meaning alone.

## Typography

DM Sans is used throughout, imported from Google Fonts with a sans-serif fallback. Compact headings use restrained negative tracking; body and controls remain plain and readable. The frontmatter records the desktop type roles. Monetary totals, legend amounts, and table amounts use tabular numerals.

At widths up to 1200px, the page heading and summary totals reduce to 28px. At widths up to 760px, headings use 27px, section titles use 20px, and summary totals use 23px. Small table and supporting labels use 11–14px according to context.

## Layout

The desktop sidebar is fixed at 236px; main content starts alongside it and is capped at 1800px. Above 1200px, top padding is 24px and the summary and panel spacing is compact. At widths up to 1200px, the rail narrows to 205px and main padding becomes 28px vertically and 25px horizontally.

The overview uses a three-column totals strip and a two-panel grid weighted 1.25:1 on wide screens, then equal columns up to 1200px. Panels use the documented gap and padding; up to 1200px their padding becomes 21px.

At widths up to 760px, the sidebar becomes a top navigation strip; the habit note and save-status caption disappear. Main padding is 25px 18px 20px. Overview panels stack with 18px gaps and 20px padding; totals become three horizontal label/value rows separated by rules. Transaction tables scroll when needed and hide the date column. The donut and legend sit alongside one another until 380px, when they stack.

## Elevation & Depth

Working panels are flat, separated by background tone and fine borders. Shadows belong to temporary surfaces: dialogs use `0 20px 80px #17221433`, and toast messages use `0 5px 22px #18231b22`. Dialogs dim the background with `#18231b77`.

**The Flat Workspace Rule.** Keep financial panels flat; reserve depth for dialogs and toast feedback.

## Shapes

Moderately rounded panels and dialogs contain smaller rounded fields, buttons, tags, and budget icons. Thin dividers organize totals and table rows. Donut charts are circular; their white center is inset 23% on desktop and 20% on mobile, leaving a substantial ring. Budget tracks are 9px high with rounded ends.

## Components

### Buttons

Primary actions use lime with dark text; hover uses the darker lime token. Secondary actions use white with a fine border. Plain text actions receive a pale hover surface. Buttons transition background over 150ms. Disabled buttons use half opacity and a disabled cursor.

### Inputs / Fields

Visible labels sit above white, lightly outlined controls. Standard form fields use the field radius and padding; filter and month controls have their own closely related sizing. All interactive controls share a 3px olive focus outline offset by 3px.

### Navigation

The olive rail uses light text and line SVG icons. Selected items use the active navigation tone; hovered items use the separate hover tone. On mobile, three main destinations form the top strip and Settings becomes an icon button.

### Cards / Containers

White panels use the panel radius, fine neutral border, and responsive padding documented above. The summary strip is one shared container with internal separators. The sample badge is a compact green-tinted status label; category tags have a warm neutral fill.

### Financial Displays

The donut is 220px on wide desktop and uses a warm category palette. Legends always list exact amounts, including zero values. Budget rows show category icons, spent/limit amounts, a clamped progress fill, a percentage, and remaining or over-budget text. Desktop budget icons occupy a separate left gutter; mobile rows return to normal flow.

### Dialogs and Feedback

Native dialogs have a 520px maximum width and 28px padding, reduced to 22px on mobile. Form grids use two columns and reduce their gap on mobile. Opening motion lasts 200ms with `cubic-bezier(.16,1,.3,1)` and runs only when reduced motion is not requested. Toast messages use olive with white text; errors use the negative tone and explicit copy.

## Do's and Don'ts

### Do:
- **Do** preserve the approved olive, lime, bright-panel direction.
- **Do** pair chart and status colors with exact text values.
- **Do** retain tabular financial numerals and visible keyboard focus.
- **Do** keep mobile totals as separated label/value rows.

### Don't:
- **Don't** replace the warm category mapping with an unrelated palette.
- **Don't** add elevation to ordinary ledger panels.
- **Don't** make chart color the only way to read an amount or status.
