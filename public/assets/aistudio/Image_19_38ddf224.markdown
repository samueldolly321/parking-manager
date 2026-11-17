---
name: Parking Manager Madagascar
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
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#00687a'
  on-secondary: '#ffffff'
  secondary-container: '#57dffe'
  on-secondary-container: '#006172'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#001e2f'
  on-tertiary-container: '#008cc7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#c9e6ff'
  tertiary-fixed-dim: '#89ceff'
  on-tertiary-fixed: '#001e2f'
  on-tertiary-fixed-variant: '#004c6e'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
  mono-metric:
    fontFamily: JetBrains Mono
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.02em
  mono-data:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.02em
  mono-plate:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 18px
    letterSpacing: 0.08em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-compact: 0.75rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system establishes an enterprise-grade, high-density operational aesthetic tailored for multi-site parking logistics, revenue tracking, and automated barrier control across Madagascar.

### Personality & Tone
- **Authoritative & Industrial:** Rooted in rock-solid uptime, auditability, and infrastructural precision.
- **Data-Dense & Efficient:** Prioritizes screen real estate, fast scanning of license plate numbers, quick cash reconciliations, and low-latency interaction.
- **Pragmatic Modernism:** Combines the crisp, deliberate utility of modern developer platforms with accessible enterprise UI conventions.

### Aesthetic Paradigm
The visual direction fuses **Modern Enterprise Functionalism** with **Linear/Shadcn-inspired clarity**:
- Flat 1px structural hairline divisions instead of heavy dimensional surfaces.
- High-contrast, tabular data layouts optimized for operators managing rapid entry/exit lanes.
- Strict visual hierarchy separating operational telemetry (status tags, occupancy meters, live gates) from routine reporting.

## Colors

The palette balances authoritative midnight tones with luminous cyan accents to provide focal points without inducing visual fatigue during prolonged dispatch or administrative shifts.

### Foundational Colors
- **Primary (`#0F172A`):** Deep Midnight Navy. Anchors navigation headers, sidebars, active toggles, and high-impact structural frames.
- **Secondary (`#06B6D4`):** Vivid Cyan. Reserved for active interactive accents, focus rings, primary action states, and real-time gate occupancy indicators.
- **Tertiary (`#0EA5E9`):** Sky Info Blue. Utilized for non-blocking notifications, live telemetry, and neutral operational callouts.
- **Neutral (`#64748B`):** Slate Neutral base. Deployed for iconography, secondary labels, and structural hairpins.

### Canvas & Surface Hierarchy
- **Canvas Base (`#F8FAFC`):** Main viewport background, neutral and matte.
- **Surface Elevation 0 (`#FFFFFF`):** Base container fill for cards, tables, and inspection panes.
- **Surface Muted (`#F1F5F9`):** Subdued striping, inactive inputs, table header rows.
- **Hairline Border (`#E2E8F0`):** Default 1px dividing border across all containers.
- **Dark Mode Border Equivalent (`#1E293B`):** Structural perimeter in inverse contexts.

### Semantic Status Colors
- **Success (`#10B981`):** Cleared transactions, available bays, confirmed Mobile Money / Cash validation.
- **Warning (`#F59E0B`):** Expiring seasonal passes, grace-period lane dwell times, occupancy reaching 90%+.
- **Danger (`#EF4444`):** Unauthorized barriers, unpaid tailgating, blacklisted plates, offline barrier hardware.
- **Info (`#0EA5E9`):** Audit records, scheduled shift handovers, routine system broadcasts.

### Contextual Location Colors
For multi-site distinction across the capital network:
- **Analakely Hub:** Indigo-tinted slate chip.
- **Ankorondrano Business Park:** Cyan-tinted slate chip.
- **Ivato Airport Terminal:** Teal-tinted slate chip.

## Typography

The typographic strategy balances human scanning readability, high-density layout constraints, and uncompromising monospaced fidelity for mission-critical telemetry.

### Font Roles
- **Headlines & KPI Metrics (`Space Grotesk`):** Delivers a crisp, modern, engineered appearance for dashboards, capacity ratios, and section headers.
- **Body & Standard UI (`Inter`):** Clean and neutral with superior tabular support, high x-height, and optimal readability across varied pixel densities.
- **Monospace Identification (`JetBrains Mono`):** Dedicated exclusively to vehicle license registration plates (e.g., `1234 TAB`), access card UIDs, barcode payloads, and financial figures denominated in Malagasy Ariary.

### Regional Formatting Rules
- **Currency:** Denominated in Malagasy Ariary with a non-breaking space separator for thousands (e.g., `150 000 Ar`, `2 500 Ar`). Never use commas or periods for thousands separators.
- **Plate Numbers:** Always uppercase, rendered with `mono-plate`, padded with tracking for immediate legibility in high-stress gate scenarios.
- **Date/Time Display:** Fixed to `Indian/Antananarivo` (UTC+3) using 24-hour presentation: `DD/MM/YYYY HH:mm:ss`.

## Layout & Spacing

This design system uses a strict **8-point grid rhythm with a secondary 4-point micro-density sub-grid** to maximize horizontal and vertical information density across operator interfaces.

### Grid Architecture
- **Desktop (1200px+):** 12-column fluid framework with fixed standard sidebar (compact 64px collapsed, 240px expanded). Outer margins set at `1.5rem`, column gutters at `1rem`.
- **Tablet (768px – 1199px):** 8-column layout. Sidebar collapses to icon navigation rail automatically.
- **Mobile Handheld (Field Attendant / Barrier Unit, <768px):** 4-column flow. Outer margins reduce to `1rem`, gutters compress to `0.75rem`.

### Density Calibration
- Administrative consoles and table rows utilize high-density padding (`space-xs` and `space-sm`) to support high row counts above the fold.
- Primary metric panels and analytical graphs operate on `space-lg` and `space-xl` intervals to ensure instant spatial clarity for lane monitoring.

## Elevation & Depth

Visual hierarchy is maintained through structured surfaces and low-contrast borders rather than deep, theatrical shadows. This ensures clarity in bright outdoor dispatch huts and low-light control rooms alike.

### Elevation Tiers
- **Tier 0 (Background Canvas):** Hex `#F8FAFC`. Zero elevation, non-interactive foundation.
- **Tier 1 (Cards, Tables, Panels):** Hex `#FFFFFF` with a crisp `1px solid #E2E8F0` border and an ambient micro-shadow: `0 1px 3px 0 rgba(15, 23, 42, 0.04)`.
- **Tier 2 (Popovers, Dropdowns, Hovered Rows):** Hex `#FFFFFF` accompanied by a localized border `1px solid #CBD5E1` and ambient shadow: `0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`.
- **Tier 3 (Modals, Overlays, Barrier Emergency Controls):** Backdrop scrim `rgba(15, 23, 42, 0.60)` with heavy blur `backdrop-filter: blur(4px)`. Container shadow: `0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.06)`.

### Border Integrity
Every container possesses a definitive 1px border. Depth is never communicated by shadow alone; edge boundaries are strictly visible under all lighting conditions.

## Shapes

The interface embraces a precise, calibrated **Soft (Tier 1)** shape radius across core elements to maintain an architectural, software-instrument feel.

### Geometric Rules
- **Standard Controls & Elements (`4px` / `0.25rem`):** Buttons, inputs, search fields, segment controllers, and inline badge containers.
- **Structural Surfaces (`8px` / `0.5rem` - `rounded-lg`):** Cards, modal panels, table wrappers, and flyout navigation draw surfaces.
- **Pills / Status Dots (`9999px`):** Live telemetry indicators, round sensor badges, and ping pulses.
- **Vehicle Plate Display Plates:** Strict `4px` borders featuring a distinct high-contrast internal bevel to mimic physical license plates.

## Components

### Buttons
- **Primary:** Solid `#0F172A` background, `#FFFFFF` text, `4px` radius. Hover: `#1E293B`. Active: `#334155`. Focus: `2px` offset ring `#06B6D4`.
- **Secondary / Subtle:** Surface `#FFFFFF`, border `1px solid #E2E8F0`, text `#334155`. Hover: background `#F8FAFC`, border `#CBD5E1`.
- **Destructive:** Border `1px solid #EF4444`, background `#FEF2F2`, text `#B91C1C`. Hover: background `#FEE2E2`.
- **Lane Control Action (Special):** Accent fill `#06B6D4`, text `#FFFFFF`, bold `Space Grotesk` uppercase typography.

### Input Fields & Controls
- **Standard Field:** Background `#FFFFFF`, border `1px solid #E2E8F0`, padding `0.5rem 0.75rem`, text `#0F172A`, placeholder `#94A3B8`.
- **Focus State:** Border `#06B6D4`, box-shadow `0 0 0 1px #06B6D4`.
- **Plate Input:** JetBrains Mono font, uppercase forced, letter-spacing `0.08em`, centered text alignment.

### Badges & Chips
- **Site Badges:**
  - *Site Analakely:* `#EEF2FF` fill, `#4338CA` text, `1px solid #C7D2FE`.
  - *Site Ankorondrano:* `#ECFEFF` fill, `#0E7490` text, `1px solid #A5F3FC`.
  - *Site Ivato:* `#F0FDF4` fill, `#15803D` text, `1px solid #BBF7D0`.
- **Status Badges:** Compact padding (`2px 6px`), JetBrains Mono or Inter 11px uppercase weight 600.
  - *Confirmed/Success:* Background `#ECFDF5`, text `#065F46`, border `#A7F3D0`.
  - *Expiring/Warning:* Background `#FFFBEB`, text `#92400E`, border `#FDE68A`.
  - *Critical/Unpaid:* Background `#FEF2F2`, text `#991B1B`, border `#FECACA`.

### Data Tables (High-Density)
- Row height fixed to `36px` (compact) or `44px` (standard).
- Table headers set in Inter 12px semi-bold uppercase, color `#64748B`, background `#F8FAFC`, bottom border `1px solid #E2E8F0`.
- Numeric and monetary columns right-aligned using `mono-data`.
- Hover state on rows: `#F8FAFC`.

### Specialized Domain Components
- **Vehicle License Plate Tag:** Boxed `mono-plate` component with a subtle slate inset border, simulating physical vehicle registration.
- **Barrier Gate Status Node:** Real-time pulse indicator featuring a two-state LED dot (Green = Gate Open/Armed, Red = Closed/Locked).
- **Ariary Financial Metric Stat Box:** Space Grotesk headline figure followed by monospaced `Ar` unit indicator, coupled with period delta change pills.