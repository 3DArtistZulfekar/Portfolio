# Asset provenance

The portfolio's models, project photographs/renders, portrait, logo, and original social card were supplied in this repository. They represent Zulfekar Ahmad's existing portfolio; no stock art or generated image is presented as his work.

- `models/covers/model-0.png` through `model-6.png`: new real-time renders captured directly from the corresponding model at the same index in `data/models.json`. These are actual rendered meshes, using the supplied model materials. The pebble uses the viewer's clay mode. They replace legacy reference-image thumbnails without changing the models.
- `website/helmet-fallback.png`: a transparent render of the supplied `models/dggg/Helmet.fbx`, captured in Three.js with the site's metal presentation material. It is the static fallback for the interactive hero.
- `fonts/barlow-condensed-bold.ttf`: Barlow Condensed, Google Fonts / Jeremy Tribby. SIL Open Font License in `fonts/Barlow-OFL.txt`. Source: https://github.com/google/fonts/tree/main/ofl/barlowcondensed
- `fonts/manrope-regular.ttf`, `fonts/manrope-bold.ttf`: Manrope, Google Fonts / Mikhail Sharanda and contributors. SIL Open Font License in `fonts/Manrope-OFL.txt`. Source: https://github.com/google/fonts/tree/main/ofl/manrope
- `vendor/three/`: Three.js 0.170.0 from https://www.npmjs.com/package/three/v/0.170.0 (downloaded from jsDelivr), including official addons. MIT license at `vendor/three/LICENSE`.

Original project images remain at their supplied paths and are used directly in the selected-work gallery. Capturing a model or changing its display material does not invent a separate commissioned project.
