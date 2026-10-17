---
name: Zulfekar Ahmad — Digital Sculpture Gallery
description: A cinematic charcoal gallery with monumental condensed type and acid-yellow controls.
colors:
  bg: "#111210"
  surface: "#1b1c19"
  fg: "#edeee8"
  muted: "#a3a59c"
  line: "#363830"
  acid: "#d5f35a"
  ink: "#171c0d"
  error: "#ffc39c"
typography:
  display:
    fontFamily: "Barlow, 'Arial Narrow', sans-serif"
    fontSize: "clamp(115px, 16.35vw, 270px)"
    fontWeight: 700
    lineHeight: 0.85
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Barlow, 'Arial Narrow', sans-serif"
    fontSize: "clamp(46px, 6.8vw, 106px)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Barlow, 'Arial Narrow', sans-serif"
    fontSize: "31px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.005em"
  body:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.65
  button:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.65
rounded:
  control: "2px"
  control-group: "4px"
  circle: "50%"
spacing:
  compact: "4px"
  small: "8px"
  control: "12px"
  metadata: "18px"
  medium: "24px"
  heading-gap: "48px"
  gutter: "clamp(22px, 4.5vw, 80px)"
  section: "120px"
components:
  button-primary:
    backgroundColor: "{colors.acid}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "12px 21px"
  button-primary-hover:
    backgroundColor: "#e6ff88"
  button-dark:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.acid}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "12px 21px"
  button-dark-hover:
    backgroundColor: "#333f19"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.fg}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "12px 21px"
  button-secondary-hover:
    backgroundColor: "#2c3025"
  field:
    backgroundColor: "#1b1e17"
    textColor: "{colors.fg}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px"
  filter:
    backgroundColor: "transparent"
    textColor: "{colors.fg}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "9px 17px"
  filter-active:
    backgroundColor: "{colors.acid}"
    textColor: "{colors.ink}"
  companion-tag:
    backgroundColor: "#252a1e"
    textColor: "#bcc6a6"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "5px 8px"
  model-card:
    backgroundColor: "#1e201a"
    textColor: "{colors.fg}"
  segmented:
    backgroundColor: "#20221d"
    textColor: "#b9bcae"
    rounded: "{rounded.control-group}"
    padding: "4px"
  drop-zone:
    backgroundColor: "#1a1e15"
    textColor: "{colors.fg}"
    padding: "25px"
---

# Design System: Zulfekar Ahmad

## Overview

**Creative North Star: "The Digital Sculpture Exhibition"**

A dark exhibition space puts real-time objects, photographic work and monumental lettering in the foreground. Charcoal carries the room; bone-white condensed typography gives it scale; acid yellow directs attention and occasionally becomes the entire surface.

The interface combines cinematic presentation with clear studio tools. Generous editorial spacing surrounds the work, while compact Manrope labels, fine rules and nearly square controls keep navigation, uploads and material changes precise. Motion follows the object or the action, with reduced-motion and non-WebGL fallbacks.

**Key Characteristics:**

- Monumental condensed display type with compact, readable interface text.
- Charcoal and bone-white neutrals punctuated by acid yellow.
- Flat architectural surfaces, fine dividers and real 3D depth.
- Small squared controls; circles reserved for directional affordances.
- Responsive editorial grids and explicit interactive states.

## Colors

The palette is warm charcoal and bone white with an electric, slightly organic yellow-green accent. The frontmatter is the normative token source; names below describe their use.

### Primary

- **Acid Yellow** (`acid`): active material modes, primary actions, links, status details and deliberate full-width accent fields.
- **Dark Ink** (`ink`): text and controls placed on acid surfaces.

### Neutral

- **Obsidian Room** (`bg`): the page canvas and the background around the work.
- **Charcoal Plinth** (`surface`): quiet backing for imagery and contained content.
- **Bone White** (`fg`): primary text and high-contrast directional controls.
- **Gallery Gray** (`muted`): supporting copy, metadata and secondary navigation.
- **Fine Rule** (`line`): dividers and low-emphasis control boundaries.
- **Warm Error** (`error`): error feedback; preserve the message as text as well as color.

**The Acid Signal Rule.** Use acid yellow for actionable emphasis, selected states and intentional full-surface inversions. Pair its filled surfaces with dark ink.

## Typography

**Display Font:** the locally hosted Barlow Condensed Bold asset, registered in CSS as `Barlow`, with Arial Narrow and sans-serif fallbacks.

**Body Font:** locally hosted Manrope, with Arial and sans-serif fallbacks. Regular and bold font files supply the declared weight ranges. There is no separate mono family.

**Character:** extremely condensed, tightly set titles contrast with calm, compact sans-serif interface text. Numeric indexes and local time use tabular figures where alignment matters.

### Hierarchy

- **Display:** the largest statements use the frontmatter display role; outlined lettering is an established treatment for secondary words. On phones the principal display switches to viewport sizing (21vw, with an outlined line at 24vw).
- **Headline:** section statements use the headline role. Gallery introductions and studio headings have their own fluid scales within the same family and weight. At the mobile breakpoint, section headings use `clamp(42px, 10.5vw, 68px)`.
- **Title:** work names use the title role; compact model titles use a smaller size (28px), reducing to 24px on phones.
- **Body:** the base body role is the default. Supporting prose is commonly compact (12px, line height 1.8–2); larger introductory prose uses 20–23px with shorter measures. Observed prose blocks are generally capped at 300–460px.
- **Label:** navigation, metadata and field labels use the label role. Select mobile annotations use 11px; retain a readable functional scale rather than shrinking text to solve collisions. Tracking is selective, generally 0.05–0.12em for formats and indexes, rather than universal uppercase styling.

**The Two Voices Rule.** Use Barlow for display statements and work titles; use Manrope for reading, navigation, metadata and controls.

## Layout

The shared horizontal gutter is fluid. Standard editorial sections use the frontmatter section spacing vertically, reducing to 80px at the intermediate portfolio breakpoint and 65px on phones. Wide screens center section content within a 1600px reading and work area.

The desktop vocabulary includes asymmetric two-column editorial grids, full-width media plates and a three-column model grid. Work grids mix regular and wide images with generous gaps; most textual lists use full-width horizontal rules. Viewer and studio tools pair a broad working stage with a narrower information or editing column. The studio preview is sticky on desktop and moves before the editor on phones.

Portfolio layout changes at 1000px and 700px; the studio adds a 1100px tool-layout breakpoint. At 700px, editorial and viewer layouts stack, the model grid becomes two columns, navigation removes selected secondary links and the header contracts. At 370px the model grid and compact form groups become one column. A wide-screen adjustment begins at 1700px. Preserve these content-driven transitions rather than forcing one universal grid on every surface.

## Elevation & Depth

The interface uses tonal layering and one-pixel rules without box shadows. Actual WebGL geometry, directional lighting, overlapping display type and photographic crops supply the depth. Viewer and preview stages use subtly different dark olive-charcoal surfaces; their distinction is quieter than the work itself.

**The Object Owns Depth Rule.** Let actual geometry, lighting, imagery and tonal surfaces create depth. Keep interface panels and controls free of decorative drop shadows.

Interaction transitions are short and restrained: ordinary state changes use 0.2–0.25s, image zooms use 0.6–0.9s and the display entrance uses 1.4s. The shared editorial ease is `cubic-bezier(.16,1,.3,1)`. Object motion uses damped orbit controls, gentle rotation and small pointer response. Reduced-motion preferences disable CSS transitions and animation, title entrance, automatic object rotation and decorative model animation while preserving direct interaction.

## Shapes

Media, stages, upload panels and editorial containers are square. Small controls and fields have the frontmatter control radius; segmented containers use the slightly larger control-group radius. Circles mark directional links and status dots. Borders are generally one pixel; the upload target uses a dashed boundary. Avoid adding rounded shells around otherwise flat editorial sections.

## Components

### Buttons

Compact, almost square and definite. Primary buttons use acid with dark ink; dark buttons invert that relationship on accent surfaces; secondary buttons use a transparent fill and muted olive border. The canonical minimum height is 48px, with smaller 36–44px tool variants. Hover brightens or shifts the fill and lifts the button slightly (2px). Disabled buttons reduce opacity and show a waiting cursor.

All interactive elements retain an acid focus outline (2px, normally offset 6px); links on acid surfaces use dark ink for the outline. Tool fields and file controls use tighter offsets so the ring stays visible within their layout.

### Chips

Filters are small squared bordered buttons; the selected filter fills with acid and dark ink. Companion-file tags use a muted olive fill, pale text and a compact inline remove control. Tags wrap with their filenames instead of forcing a wider viewport.

### Cards / Containers

Work and model cards are editorial image-and-caption groupings, without an enclosing border or shadow. Media sits on a flat dark backing; titles and metadata follow beneath. Hover gently scales the image and can turn a circular open affordance acid. Use actual imagery or an honest placeholder rather than decorative UI chrome. Local drafts carry an explicit textual draft badge.

### Inputs / Fields

Fields use a dark olive-charcoal fill, a quiet one-pixel olive border, compact padding and the control radius. Labels and placeholders remain legible against the fill. The caret and keyboard focus use acid; errors use warm text. Textareas resize vertically. Long filenames, titles and feedback wrap rather than overflow.

### Navigation

A slim horizontal header pairs the condensed monogram with small Manrope links. A bottom rule separates the header from the canvas. Hover turns links acid. Mobile retains the concise navigation and contact affordance while hiding selected secondary links; it does not introduce a separate menu treatment.

### Material Controls

A shallow, rounded rectangular segmented container holds compact buttons. Active modes use acid with dark ink; inactive modes use pale gray on a transparent fill. State changes are tied to actual material changes in the 3D stage, with a readable active label.

### Upload Target and Preview Stage

The upload target is a square dashed rectangle with a small acid upload icon, straightforward text and an explicit file-selection action. Drag-over changes the surface and border. The preview stage stays flat and object-focused, with loading, empty and error feedback kept visible. The studio distinguishes local draft actions and public publishing actions in both labels and feedback.

## Do's and Don'ts

### Do:

- **Do** use the existing charcoal, bone-white and acid-yellow roles.
- **Do** preserve oversized condensed headings while letting functional text remain readable.
- **Do** use fine rules and surface changes to organize tools and metadata.
- **Do** retain visible keyboard focus, selected controls and honest loading or error feedback.
- **Do** collapse complex layouts on phones and preserve reduced-motion and non-WebGL alternatives.

### Don't:

- **Don't** add decorative panel shadows or round every container into a card.
- **Don't** use display typography for field labels, instructions or longer prose.
- **Don't** let decorative motion override reduced-motion preferences.
- **Don't** show a saved local draft as a published model.
