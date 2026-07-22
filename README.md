# AI in 2026 — Talk Slides

Slides for the talk **"AI in 2026 — A Personal Perspective"**, hosted on GitHub
Pages at **https://ai-in-2026.xiaomum.com**.

Built with [reveal.js](https://revealjs.com/) 6.0.1 (vendored in `vendor/reveal/`,
no CDN or build step required).

## Layout

```
index.html        # all slides live here
css/custom.css    # talk-wide style tweaks
images/           # images used by the slides (commit them here)
references.md     # every external source cited on the slides
vendor/reveal/    # reveal.js distribution — do not edit
CNAME             # custom domain for GitHub Pages
.nojekyll         # bypass Jekyll processing on GitHub Pages
```

## Local preview

A local server is required (the speaker-notes plugin does not work from
`file://`):

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

During the talk: press **S** for speaker view (shows the Chinese notes),
**F** for fullscreen, **ESC** for slide overview.

## Adding content

Conventions (also documented as an HTML comment at the top of `index.html`):

- Slide body in **English**; speaker notes in **Chinese** inside
  `<aside class="notes">…</aside>`.
- One idea per slide; duplicate an existing `<section>` block to add a slide.
- Images go in `images/` and are referenced as `images/xxx.png`.
- Every external fact/number/quote gets an entry in `references.md` and a
  numbered footnote on the slide: `<sup class="fn">N</sup>` at the claim plus a
  `<div class="footnotes">…</div>` block at the bottom of the slide.
- Mark personal opinions/predictions distinctly from sourced facts
  (e.g. prefix with "My take:").

## Deployment

1. Push to `main` on https://github.com/seamys/ai-in-2026.
2. Repo **Settings → Pages → Source**: "Deploy from a branch", branch `main`,
   folder `/ (root)`.
3. The `CNAME` file makes Pages serve the site at `ai-in-2026.xiaomum.com`.
4. DNS (Cloudflare, zone `xiaomum.com`): add a **CNAME** record
   `ai-in-2026` → `seamys.github.io`, TTL 60–300s, **DNS only (grey cloud)** —
   proxied mode interferes with GitHub's certificate issuance.
5. Back in **Settings → Pages**, wait for the DNS check to pass, then enable
   **Enforce HTTPS**.
