---
name: Antananarivo Civic Mobility
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3f4850'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#707881'
  outline-variant: '#bfc7d2'
  surface-tint: '#006397'
  primary: '#006397'
  on-primary: '#ffffff'
  primary-container: '#3498db'
  on-primary-container: '#002d47'
  inverse-primary: '#92ccff'
  secondary: '#545f73'
  on-secondary: '#ffffff'
  secondary-container: '#d5e0f8'
  on-secondary-container: '#586377'
  tertiary: '#006d37'
  on-tertiary: '#ffffff'
  tertiary-container: '#00a757'
  on-tertiary-container: '#003216'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cce5ff'
  primary-fixed-dim: '#92ccff'
  on-primary-fixed: '#001d31'
  on-primary-fixed-variant: '#004b73'
  secondary-fixed: '#d8e3fb'
  secondary-fixed-dim: '#bcc7de'
  on-secondary-fixed: '#111c2d'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#6bfe9c'
  tertiary-fixed-dim: '#4ae183'
  on-tertiary-fixed: '#00210c'
  on-tertiary-fixed-variant: '#005228'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  title-lg:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  metric-tabular:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system establishes a high-precision, institutional yet contemporary SaaS infrastructure tailored for high-density municipal and commercial parking operations in Madagascar. The interface conveys uncompromising reliability, logistical transparency, and rapid real-time decision-making. 

The aesthetic is **Modern Administrative SaaS**: high-clarity structural grids, crisp edge delineation, subtle functional elevations, and data-dense layouts. It bridges infrastructural public utility and modern cloud software. The visual tone is decisive and authoritative without feeling bureaucratic, balancing crisp `#F8FAFC` slate canvases with high-contrast slate surfaces (`#0F172A` / `#1E293B`) and vibrant semantic indicators that communicate capacity, transactional verification, and urgency at an operational glance.

## Colors

The palette balances technical precision with high-contrast operational status signaling.

### Core Canvas & Structure
- **Light Base Canvas (`#F8FAFC`)**: The global application surface, clean and cool-tinted to mitigate eye strain in multi-monitor control environments.
- **Card & Workspace Surface (`#FFFFFF`)**: Pure white containers resting on `#F8FAFC`, framed by fine slate boundary lines (`#E2E8F0`).
- **Dark Slate Anchors (`#0F172A` / `#1E293B`)**: Applied to persistent system architecture—primary navigation sidebars, high-level metric banners, contextual modal backdrops, and top-tier administrative framing.

### Primary & Functional Accents
- **Primary Cobalt (`#3498DB`)**: Used exclusively for primary interactive workflows, active navigation states, selected parking bay allocations, and primary confirmation triggers.
- **Operational Status Indicators**:
  - **Success Green (`#2ECC71`)**: Vacant parking slots, validated ticketing, processed Mobile Money/Mvola/AirtelMoney transactions, and active physical gate barriers.
  - **Warning Orange (`#F39C12`)**: Grace-period expirations, approaching time limits, sensor heartbeat warnings, and near-capacity zones (≥85%).
  - **Danger Red (`#E74C3C`)**: Unpaid departures, tailgating violations, barrier physical jams, system disconnections, and unauthorized zone breach events.

### Neutral System
- **Slate Text & Border Tiers**: Text Primary (`#0F172A`), Text Secondary (`#475569`), Text Muted (`#94A3B8`), Border Subdued (`#F1F5F9`), Border Standard (`#E2E8F0`), Border Emphasized (`#CBD5E1`).

## Typography

The typography pairing uses **Space Grotesk** for display headlines, zone identifiers, card metrics, and numerical readouts, balanced with **Inter** for core UI text, data tables, analytical readouts, and operational forms.

- **Space Grotesk** injects an engineered, geometric, architectural character suited for infrastructure management, occupancy percentages, and bay coordinates (e.g., `ZONE-A-042`).
- **Inter** provides neutral legibility across dense tabular data, vehicle registration sequences, timestamps, and multi-column administrative forms.
- All numerical and currency values (e.g., Malagasy Ariary `MGA 15 000`) must be styled with tabular numeric OpenType features (`tnum`) to maintain vertical scanning alignment across ledger and sensor logs.

## Layout & Spacing

The layout is built around a flexible, high-density 12-column administrative grid designed for large command dashboards down to on-site handheld enforcement tablets.

### Responsive Breakpoints & Mechanics
- **Desktop (≥ 1280px)**: 12-column grid. Main content area sits adjacent to a persistent 260px `#0F172A` side navigation rail. Gutter width is fixed at `1.5rem` (`24px`), with outer canvas padding at `2rem` (`32px`). Multi-bay parking heatmaps and live surveillance streams render side-by-side with tabular logs.
- **Tablet (768px – 1279px)**: 8-column layout. Navigation folds to a compact 72px icon-only rail. Heatmaps and vehicle search panels reflow into a vertically stacked configuration. Gutters remain `1rem` (`16px`).
- **Mobile Handheld (≤ 767px)**: 4-column layout for field wardens. Gutters shift to `0.75rem` (`12px`) and outer canvas padding to `1rem` (`16px`). Navigation migrates to a persistent bottom control bar or top sliding drawer.

### Spacing Scale Usage
- `space-xs` (4px): Inset padding for status micro-pills, input icon offsets, dense table cell buffers.
- `space-sm` (8px): Gaps between badge clusters, input labels and fields, list item vertical spacing.
- `space-md` (16px): Internal card body padding, row item grouping, table cell standard horizontal padding.
- `space-lg` (24px): Metric card internal padding, dashboard modular container spacing.
- `space-xl` (32px): Major panel separations, page header bottom margins.

## Elevation & Depth

Visual hierarchy relies on structural borders and crisp, restrained ambient shadows to maintain performance across operational screens.

### Depth Hierarchy
- **Canvas (`0dp`)**: `#F8FAFC` base level.
- **Resting Containers & Cards (`Elevation 1`)**: `#FFFFFF` fill bounded by a crisp 1px stroke of `#E2E8F0`. Shadow is hyper-subtle: `0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.02)`.
- **Active / Interactive Hover Cards (`Elevation 2`)**: Raised elements receive a border transition to `#CBD5E1` and an elevated shadow: `0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.03)`.
- **Flyouts, Dropdowns & Popovers (`Elevation 3`)**: Detached overlays with a 1px border of `#CBD5E1` and targeted depth: `0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.03)`.
- **System Modals & Critical Overlays (`Elevation 4`)**: Framed by a backdrop scrim of `#0F172A` at 60% opacity, casting `0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.04)`.

## Shapes

The design system adopts a **Soft (Level 1)** geometric standard. This geometry produces a technical, crisp aesthetic that maximizes screen utility in dense tables, live maps, and telemetry cards.

- **Base Corner Radius (`0.25rem` / `4px`)**: Text inputs, dropdowns, table selection checkboxes, secondary utility buttons, operational badges, and individual parking bay grid cells.
- **Large Corner Radius (`0.5rem` / `8px`)**: Data cards, metric containers, alert toast banners, modal dialogs, and primary structural panels.
- **Extra-Large Corner Radius (`0.75rem` / `12px`)**: System shell wrappers, main dashboard section frames, and top-level navigation blocks.
- **Pill Shape (`9999px`)**: Exclusively reserved for binary availability indicators (e.g., "LIBRE", "OCCUPÉ") and live pulse beacons.

## Components

### Buttons
- **Primary Action**: Solid `#3498DB` background, `#FFFFFF` text, `font-weight: 500`. Hover: `#2980B9`. Pressed: `#1C6CA1`. 4px radius, 0 1px 2px rgba(0,0,0,0.05) shadow.
- **Secondary / Neutral**: White surface with 1px `#E2E8F0` border, `#1E293B` text. Hover: `#F1F5F9` background, `#0F172A` text.
- **Administrative / Destructive**: Red border or fill (`#E74C3C`) reserved for impound orders, manual barrier overrides, or emergency resets.

### Badges & Status Chips
- Height of 24px, uppercase `label-sm` Space Grotesk/Inter hybrid, 4px corner radius.
- **Available / Validated**: `#2ECC71` tint at 12% opacity (`#EAFBF1`), text `#1E824C`, 1px solid `#2ECC71` (30% alpha).
- **Warning / Approaching Expiration**: `#F39C12` tint at 12% opacity, text `#A06405`, 1px solid `#F39C12` (30% alpha).
- **Overdue / Incident**: `#E74C3C` tint at 12% opacity, text `#B02A1A`, 1px solid `#E74C3C` (30% alpha).

### Form Inputs & Plate Search
- Background: `#FFFFFF`. Border: 1px `#CBD5E1`. Focus ring: 2px `#3498DB` at 20% alpha with `#3498DB` border edge.
- Height: Compact 36px for high-density tables; 42px for standard search/lookup inputs.
- Vehicle License Plate input: Space Grotesk uppercase with tracked letter-spacing (`0.08em`).

### Cards & Dashboards
- Pure white container with a 1px solid border of `#E2E8F0`. 
- Header bar features a subtle `#F8FAFC` top strip or direct `title-lg` Space Grotesk heading divider line.
- Operational metric displays feature `label-sm` uppercase muted descriptions positioned above large tabular figures.

### Interactive Parking Map Matrix
- Grid-mapped parking slot cells: 1px border. Occupied bays render in muted slate `#F1F5F9` with dark `#475569` vehicle ID; vacant bays highlighted with a subtle `#2ECC71` border and soft green tint; reserved/warning bays flagged with `#F39C12` accents.