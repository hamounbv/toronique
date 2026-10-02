# Gotchas

A running log of things that cost time on this project. Agents read it at
the start of every session and add to it when they hit something new (see
the Session protocol in `AGENTS.md`). Never delete an entry — update its
`Status` instead.

Entries tagged `Scope: template-candidate` are harvested across all client
repos to improve `brandvm/wf-template`.

## Entry format

```md
### YYYY-MM-DD · Short title
- Area: designer | css | loader | release | mcp | ci | js | perf
- Scope: project | template-candidate
- Symptom: what was observed
- Cause: why it happened
- Fix: what was done, or the workaround
- Status: open | fixed <sha> | upstreamed wf-template <sha>
- Found by: claude | codex | human
```

## This project

<!-- Add new entries here, newest first. -->

### 2026-08-21 · Site stylesheet shipped twice
- Area: css
- Scope: project
- Symptom: The same global CSS loaded from an inline copy in the body Embed
  and from a CodeSandbox `<link>`, plus a separate "staging test" `<style>`.
- Cause: Copies added over time in different places.
- Fix: merged and deduped into `css/toronique.css`; the `G | Embed Code`
  component is deleted at cutover (README).
- Status: fixed 0141a23
- Found by: human

### 2026-08-21 · Font preload used `type="font/tff"`
- Area: perf
- Scope: project
- Symptom: The PublicSans preload had an invalid MIME type.
- Cause: Typo in the old head code.
- Fix: corrected to `font/ttf` in `webflow/_header.html`. Converting to
  WOFF2 is still an optional cleanup.
- Status: fixed 0141a23
- Found by: human

### 2026-08-21 · GoToTop uses native scroll, not Lenis
- Area: js
- Scope: project
- Symptom: Go-to-top does not ride Lenis smoothing.
- Cause: `lenis` is deliberately not exposed on `window` in v1.0.0, to stay
  behaviour-identical (README "House rules").
- Fix: expose `window.lenis` if GoToTop should use it.
- Status: open
- Found by: human

### 2026-08-21 · Repo CSS is not visible on the Designer canvas
- Area: designer
- Scope: project
- Symptom: Designer canvas renders without the site's custom styles.
- Cause: The CSS `<link>` is in head custom code, which the canvas does not
  run.
- Fix: temporary Embed with an inline copy while designing, deleted before
  publish; it drifts unless refreshed (README "Known trade-off"). Prefer
  moving styles into the Designer.
- Status: documented
- Found by: human

## Known from previous projects

Inherited from `wf-template`. Found across earlier client repos; listed so
they are not rediscovered. Status refers to the template. Only the entries
that apply to this repo's setup are copied.

### 2026-10-02 · Root font-size scale drifts from Designer tokens
- Area: css
- Scope: template-candidate
- Symptom: Designer variables named for px values ("Max Width - 1280px")
  render at different sizes; the scale is retuned again and again.
- Cause: The §01 fluid scale sets `:root` font-size, so every rem/em value
  coming out of the Designer scales with it. reformdd retuned it seven times
  (1680 → 1440 → 1680 → clamp → revert → 1920 → 1440); threestars found em
  layout tokens rendering 6.25% short.
- Fix: none general. Agree the scale with the designer before building, or
  drop it and let Webflow variables own sizing.
- Status: open
- Found by: human

### 2026-10-02 · Renaming a Webflow variable silently breaks repo CSS
- Area: css
- Scope: template-candidate
- Symptom: A container cap or token-driven value quietly stops applying.
- Cause: Container/Max Width was renamed to Section/Max Width in Webflow.
  Webflow rewrites its own references but cannot reach this bundle, so
  `var(--_layout---container--max-width, none)` fell back to `none`
  (reformdd 1ca59f6).
- Fix: avoid referencing Webflow variable names in repo CSS; if one is
  needed, log it here so renames get checked.
- Status: open
- Found by: human
