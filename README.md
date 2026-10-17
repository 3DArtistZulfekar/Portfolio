# Zulfekar Ahmad — 3D portfolio

A static, self-hosted Three.js portfolio with a cinematic interactive sculpture, selected projects, a 3D playground, and an artist studio. No backend or build dependencies are required. Three.js and fonts are served locally.

## Run

Requires Node.js 20 or newer.

```sh
npm run dev
```

Open http://localhost:4173. To package for static hosting, run `npm run build`; the site is written to `dist/`. `npm test` checks the GitHub publishing transaction. The existing GitHub Pages workflow builds and deploys `dist/` when `main-clean` changes.

## Add a model

1. Open **Artist studio** from the footer, or visit `admin.html`.
2. Drop a GLB, glTF, FBX, or OBJ model into the uploader. Include textures, glTF `.bin` files, and OBJ `.mtl` files as companion files, keeping their original filenames. Each file must be below 80 MB. GLB with embedded textures is the simplest export.
3. Check the interactive preview. Add a title, discipline, and description. Rotate to the cover angle you want; the studio captures it automatically, or you can upload a cover image.
4. **Save local draft** keeps the project and files in IndexedDB. Drafts also appear in the playground in this browser. Browser storage can be cleared by the browser; publish important work.
5. **Connect GitHub** to publish: enter the repository owner, name, branch, and a fine-grained token restricted to that repository with **Contents: read and write** permission. The token is kept in sessionStorage for this tab, never in source or persistent localStorage. The repository must already contain `data/models.json` and host this portfolio. A classic personal token with repository write access also works.
6. **Publish project** uploads model files and creates one commit containing all assets and the new catalog entry. The existing Pages workflow deploys that commit. Public links work after deployment finishes. Disconnect to remove the session credential.

Drafts can be edited or deleted in the studio. Published collection entries link to their viewer; manage existing public entries in `data/models.json`. Publishing never force-pushes and rejects a concurrent branch change rather than overwriting it.

## Content and implementation

- `data/personal.json`: existing profile, tools, experience, and production links.
- `data/models.json`: deployed model catalog; existing index-based model links remain valid.
- `js/viewer.js`: model loading, material preservation, orbit controls, animation, framing, captures, reduced motion, visibility pausing, and resource disposal.
- `js/studio/`: local draft storage, editor, and GitHub publishing.
- `css/portfolio.css`, `css/studio.css`: responsive visual system.
- `assets/vendor/three/`: Three.js 0.170.0 and its MIT license.
- `assets/fonts/`: self-hosted Barlow Condensed and Manrope; font licenses included.

Uploaded textures are matched by filename. Missing companion files are reported in the preview. Models must contain visible mesh geometry. Compressed models requiring external decoders should be exported as an uncompressed GLB if the preview requests a decoder. Texture files should use browser-compatible PNG, JPEG, WebP, or AVIF; TGA is supported where referenced by the model loader.

The site supports keyboard orbit controls, reduced motion, responsive layouts, and graceful messages when WebGL is unavailable. No real GitHub writes are made by the automated tests.
