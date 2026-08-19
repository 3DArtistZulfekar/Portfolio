# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences visit the same single page, roughly equally:

- Recruiters and art directors at studios evaluating craft, tooling, and experience for hiring.
- Potential clients (brands, e-commerce, agencies) evaluating product visualization, AR/VR, and 3D modeling capability for commissioning.

Both judge the work quickly and decide whether to make contact.

## Product Purpose

Zulfekar Ahmad's professional portfolio: it makes his 3D artistry, tool stack, experience, and sample projects visible and credible, with one conversion goal — the visitor contacts him (email, phone, ArtStation).

## Positioning

A working 3D artist's portfolio where the site itself demonstrates 3D craft instead of only describing it. The interface reads as made by someone who lives in 3D software, so visitors know within seconds that they are looking at a 3D artist's work.

## Operating Context

- Reviewed on desktop and mobile, often from ArtStation, resume links, or a LinkedIn profile.
- Static single-page site; content is data-driven from `data/personal.json` (fetched at runtime, so it must be served over HTTP, not opened as a local file).
- Reviewed in the same session as the artist's ArtStation gallery; the site should feel complementary, not repetitive.

## Capabilities and Constraints

- Static HTML/CSS/JS, no build step, no framework. Three.js 0.160 available via CDN.
- Data lives in `data/personal.json`: personal info, professional summary, hard skills, professional experience, projects, education, certification. The `js/main.js` fetch/render pipeline must keep working against the same JSON shape.
- `data/personal_photo.png` is the only real image asset. `assets/thumbnails/` and `assets/models/` are empty — no real project render thumbnails exist; the design must not fabricate or fake artwork thumbnails.
- Contact facts (phone, email, ArtStation URL, location) and all professional claims in the JSON are real and must be preserved verbatim.
- Must remain accessible: semantic HTML, keyboard-operable, reasonable contrast, `prefers-reduced-motion` respected.

## Brand Commitments

- Name: Zulfekar Ahmad. Mark: "ZULFI". Title: 3D Artist & Model Developer.
- Real copy from `data/personal.json` is binding; presentation labels around it may be redesigned.
- No binding visual identity beyond these facts; the incumbent neon/dark look is not a commitment.

## Evidence on Hand

- Real: full personal profile, 10 hard skills, 3 professional experiences with responsibilities, 3 project entries, certification (Threekit), education, languages, contact details — all in `data/personal.json`.
- Real: `data/personal_photo.png`.
- Absent: project render thumbnails, 3D model files, portfolio images, testimonials. None of these may be fabricated.

## Product Principles

1. The craft is the product: the interface itself should demonstrate 3D sensibility rather than describe it in copy.
2. Real facts only: every claim traces to `personal.json`; nothing commercial is invented.
3. One page serves both audiences: craft credibility for studios, clear capability for clients.
4. Fast and dependency-light: static assets, minimal payloads, graceful degradation when WebGL is unavailable.
5. Contact is the single conversion goal; everything else earns that moment.
