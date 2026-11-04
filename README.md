# NONONICK — The Digital Experience

A static, GitHub Pages-ready cinematic web experience built with HTML, CSS, JavaScript, Three.js, GSAP/ScrollTrigger and Lenis.

## Run locally

Because the project fetches `projects.json`, serve the folder over HTTP (do not open `index.html` as a `file://` URL).

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Publish to GitHub Pages

1. Upload the contents of this folder to the repository root (or to the folder configured for Pages).
2. In **Settings → Pages**, select the branch and folder.
3. No build step is required. All asset references are relative (`./`), so the site works at a repository subpath.

## Add a project

Edit `projects.json`. Add an item to `projects` and set its `category` to one of the category IDs below.

```json
{
  "id": "my-tool",
  "category": "software",
  "title": "My Tool",
  "description": "A short description.",
  "image": "./assets/my-tool.webp",
  "url": "https://example.com"
}
```

Category IDs: `ai`, `web`, `software`, `digital`, `experimental`, `research`, `about`, `contact`.

Put preview images in an `assets/` folder and use relative paths. Use real project URLs only; empty categories intentionally show an editable empty state rather than invented portfolio items.

## Engineering notes

- One shared Three.js canvas; adaptive particle count and pixel ratio for smaller devices.
- If WebGL initialization fails, the interface remains usable as a 2D experience.
- Reduced-motion preference disables the continuous 3D animation and scroll choreography.
- GPU geometries/materials and the renderer are disposed on `pagehide`.
- Third-party libraries and Google Fonts load from CDNs; an internet connection is required for those enhancements. The HTML/CSS dashboard remains available if WebGL is unavailable.
