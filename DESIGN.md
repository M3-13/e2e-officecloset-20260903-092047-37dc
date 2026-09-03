# Design — Project Identity

> This document is project-long-lived. Tokens are not changed without
> the Architect's approval. Developers MUST use these tokens
> instead of improvising their own colors/spacings.

## Style Direction

Edler Dark-Mode mit warmem Anthrazit, Elfenbein und gedämpftem Gold – ruhig und hochwertig wie ein Red-Carpet-Abend, glamourös ohne lauten Glitzer.

## Colors

- `--color-bg`: **#0E0C0A**
- `--color-fg`: **#F2EAD8**
- `--color-accent`: **#C9A227**
- `--color-border`: **#3A3226**
- `--color-muted`: **#8C8172**

## Typography

- `font_family`: Georgia, 'Times New Roman', serif
- `heading_weight`: 600
- `body_weight`: 400

## Spacing Scale

- `--space-0`: 4px
- `--space-1`: 8px
- `--space-2`: 12px
- `--space-3`: 16px
- `--space-4`: 24px
- `--space-5`: 32px
- `--space-6`: 48px

## Border-Radii

- `--radius-sm`: 4px
- `--radius-md`: 8px
- `--radius-lg`: 16px
- `--radius-pill`: 999px

## Components

### Button

Primär: padding 12px 24px, radius md, background accent (#C9A227), color bg (#0E0C0A), font-weight 600, letter-spacing 0.02em, min-height 44px, border none; hover background #DDB84A (accent +10% Helligkeit); active background #B08E1F (accent -8% Helligkeit); disabled opacity 0.45, cursor not-allowed; focus-visible outline 2px solid #F2EAD8, outline-offset 2px. Sekundär: background transparent, border 1px solid border (#3A3226), color fg (#F2EAD8); hover border accent, color accent; active background rgba(201,162,39,0.12). Gefahr: background transparent, border 1px solid #B8433A, color #D98A80; hover background #B8433A, color bg. Alle Varianten min-height 44px (mobile Touchfläche).

### Card

background linear-gradient(180deg, #1A1612 0%, #14110D 100%); border 1px solid border; radius lg (16px); padding 24px; box-shadow 0 12px 32px rgba(0,0,0,0.35); hover border accent, transform translateY(-2px); transition 160ms ease.

### Input

background #14110D; border 1px solid border; color fg; padding 12px 16px; radius md (8px); min-height 48px; placeholder color muted; focus border accent, box-shadow 0 0 0 3px rgba(201,162,39,0.25); invalid border #B8433A. Label: 14px, color muted, margin-bottom 8px.

### Topbar

sticky top 0, height 64px, background rgba(14,12,10,0.92), backdrop-filter blur(12px), border-bottom 1px solid border, padding 0 24px; display flex, align-items center, justify-content space-between. Logo: Georgia 20px, color accent, letter-spacing 0.08em. Links: color muted, hover color fg, active color accent.

### CategoryBadge

padding 6px 14px, radius pill, background transparent, border 1px solid border, color muted, font-size 13px, min-height 36px; ausgewählt: background accent, color bg, border accent.

### Modal

Overlay rgba(0,0,0,0.7) mit backdrop-filter blur(4px); Dialog background #1A1612, border 1px solid border, radius lg, padding 24px, max-width 480px, box-shadow 0 24px 64px rgba(0,0,0,0.5).

### OutfitCard

background linear-gradient(180deg, #1A1612, #14110D); border 1px solid border; radius lg; padding 16px; Bildbereich Seitenverhältnis 4:5, radius md, background #12100C, object-fit cover; Titel color fg, Untertitel color muted; hover border accent.

### EmptyState

text-align center; padding 64px 24px; border 1px dashed border; radius lg; Icon/Grafik color accent, opacity 0.6; Titel color fg, 20px; Beschreibung color muted.

### FileUpload

border 2px dashed border; radius lg; padding 40px 24px; background #14110D; color muted; min-height 160px; hover border accent, background rgba(201,162,39,0.06); Fehlerzustand border #B8433A, Text #D98A80.

### Alert

padding 12px 16px, radius md, border 1px solid; Erfolg: border #4E7A4A, background #172015, color #A8C8A0. Fehler: border #B8433A, background #241514, color #D98A80. Info: border border, background #1A1612, color fg.

## Layout Principles

- Container max-width 1200px, zentriert; horizontale Innenabstände 16px (mobil), 24px (ab 640px), 32px (ab 1024px).
- Breakpoints: 640px (mobil → Tablet) und 1024px (Tablet → Desktop); unter 640px einspaltig, ab 640px zweispaltige Formularbereiche, ab 1024px breitere Garderoben-Grids.
- Garderobe als CSS-Grid repeat(auto-fill, minmax(160px, 1fr)) mit 16px Abstand; Outfit-Creator ab 768px zweispaltig (Auswahl links, Vorschau rechts).
- Vertikaler Abstand zwischen Hauptabschnitten 48px, innerhalb von Karten 16–24px.
- Sticky Topbar mit 64px Höhe; nachfolgende Inhalte mit 24px Abstand darunter.
- Formulare maximal 480px breit und zentriert; Auth-Seiten als zentrierte Karte auf dunklem Grund.
