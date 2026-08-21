# toronique

Version-controlled custom code for **toronique.ca** (Webflow site `69d6881d0180abb3f22d0133`), served through **jsDelivr**.

```
css/toronique.css      → all site custom CSS (single source of truth)
js/toronique.js        → all site custom JS (modules + Lenis init + counters)
webflow/_header.html   → the Site Settings → Head block (paste into Webflow)
webflow/_footer.html   → the Site Settings → Footer block (paste into Webflow)
```

`css/toronique.css` consolidates: the sandbox-hosted global stylesheet + the nav-shrink inline overrides + the in-page "staging test" style block (button-link hover + `.is_red strong`), deduped — the same stylesheet previously shipped **twice** (inline copy in the body embed AND the sandbox `<link>`). `js/toronique.js` = the cleaned module file (KeyboardIx3ShiftGToggle, GoToTop, SmartSwiper, ClickOnLoad, NavShrink) + the former footer inline Lenis init (guarded) + the former footer inline count-up counter script.

## jsDelivr rules (the important ones)

- **The repo must be public.** jsDelivr's `/gh/` endpoint doesn't serve private repos. (Fine — this code ships to every visitor's browser anyway.)
- URL shape: `https://cdn.jsdelivr.net/gh/hamounbv/toronique@VERSION/path/file`
- **Auto-minify:** request `toronique.min.css` / `toronique.min.js` and jsDelivr generates the minified file for you — commit only the readable source.
- **Pin a tag for production** (`@1.0.0`). Tagged URLs are cached permanently on the CDN — deploys are immutable and instant to roll back (just point the snippet at the previous tag).
- `@main` works for testing but is cached up to ~12 h — never use it in the production snippet.
- Emergency cache purge: `https://purge.jsdelivr.net/gh/hamounbv/toronique@1.0.0/css/toronique.min.css`
- Optional: combine Lenis + site JS into one request with the `/combine/` endpoint once things are stable.

## Release workflow

1. Edit `css/toronique.css` or `js/toronique.js`, commit.
2. Tag: `git tag v1.0.1 && git push --tags` (tag names with `v` work as `@1.0.1` on jsDelivr).
3. Bump the version in `webflow/_header.html` + `webflow/_footer.html`, commit.
4. Paste the updated snippet(s) into Webflow Site Settings → Custom Code, publish.
5. Verify the new file loads (DevTools → Network), spot-check pages.

Rollback = step 3–4 with the previous tag.

## One-time Webflow cutover

**Add (Site Settings):** replace the head custom code with `webflow/_header.html` (keeps theme-color, the PublicSans preload — `font/tff` typo corrected to `font/ttf` — and Ahrefs; moves the Phosphor icon CSS up from the body embed; swaps the sandbox CSS for the jsDelivr link; drops the duplicate pinch-zoom-disabling viewport meta; replaces the JSON-LD with the fixed global block) and the footer custom code with `webflow/_footer.html`.

**Then remove, in this order (everything is now in the repo files):**

1. `G | Embed Code` body embed → delete it entirely: its Phosphor links now live in the head, its sandbox CSS `<link>` is replaced by the jsDelivr build, its inline stylesheet copy and "staging test" `<style>` block are merged into `css/toronique.css`.
2. Footer custom code → the old block (unpkg Lenis + inline Lenis init + inline counter script + sandbox JS) is fully replaced by `webflow/_footer.html`; make sure none of it survives the paste.
3. The sandbox (`8n3dq9.csb.app`) URLs must no longer appear anywhere in Webflow — search Site Settings, page settings, and embeds.
4. Per-page schema: paste the per-page JSON-LD blocks from the fix kit into each static page's head and the three CMS template embeds (services / projects / blog) — they reference the global `#business` / `#website` ids defined in the head block.

**QA before publishing:** nav shrink on scroll, swipers (default + thumbs), Shift+G toggle, go-to-top button, click-on-load triggers, count-up counters animate once in view, smooth scroll working, Phosphor icons render in all three weights used, GA4 firing (`G-K4YFBYYRMS` via Webflow's native integration — untouched by this migration), no 404s in the Network tab, schema validates in Google's Rich Results Test.

**Known trade-off:** external stylesheets don't render in the Designer canvas (same as the sandbox setup). For canvas work, drop a temporary embed with an inline copy while designing and delete it before publish — expect it to drift from the repo unless refreshed.

## House rules

- Never edit CSS/JS inline in Webflow again — if it's style or behavior, it goes in this repo.
- v1.0.0 ships behavior-identical code (Lenis stays at 1.1.5, all three Phosphor weights kept, `lenis` deliberately not exposed on `window` so GoToTop keeps today's native fallback). Optional future cleanups: drop the Phosphor weights that aren't used, upgrade Lenis to current, convert the PublicSans TTF to WOFF2 (~50–70 % smaller) and update the preload to `type="font/woff2"`, expose `window.lenis` if GoToTop should ride Lenis, drop the console boot/ready banner.
