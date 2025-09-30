Agent Guidance (Repo‑Scoped)

Scope
- Applies to this entire repository. Use as a checklist before pushing changes that affect build/lint/deploy.

Next.js (App Router) conventions
- Pages are Server Components by default. Only add 'use client' if you truly need client‑side hooks/state.
- You may export `metadata` only from server components. If a file has 'use client', do NOT export `metadata` there — move metadata to a server page or layout.

ESLint/Formatting gotchas
- react/no-unescaped-entities is enforced as an error in CI. In JSX text nodes, escape literal apostrophes:
  - Use &apos; or &#39; (e.g., Don&apos;t, partner&apos;s, it&apos;s, other&apos;s).
- Prefer semantic HTML and accessible links. For standard “dofollow” links, omit `rel="nofollow"`.

Content pages checklist (before committing)
1) Is this a server component? (No 'use client' unless necessary.)
2) If exporting `metadata`, confirm the file is a server component.
3) Escape apostrophes in text content (&apos; / &#39;).
4) Run type check and lint locally if possible (npm run build / next build) to catch CI errors.
5) Keep headings logical (h1 → h2 → h3) and links contextual.

Patterns
- New top‑level page: place at `src/app/<route>/page.tsx` as a server component, export `metadata` alongside the default export.
- Client interactivity: lift `metadata` to a wrapping server page/layout, and keep interactive bits in child client components.

Operational notes
- When adding external API calls in app routes, respect serverless timeouts (prefer smaller payloads, short timeouts, and parallelism).
- Log clearly and avoid leaking secrets (mask tokens, don’t print credentials).

Pitfalls to avoid (enforced for future changes)
- API route syntax hygiene
  - Close Array.map blocks with `});` before returning from the handler. Missing closures cause “Expected ',' got 'catch' or ';'” in build.
  - Return plain objects from map (i.e., `return { ... };`), not wrapped in `return ({ ... });` that can lead to mismatched braces.
  - Don’t chain `.filter` on a `Set`. Build an array first, then `.filter(Boolean)`.
- React hooks
  - Functions referenced by `useEffect` should be wrapped in `useCallback` and included in deps to satisfy `react-hooks/exhaustive-deps`.
- Briefs data flow
  - Persist briefs only to `article_briefs` with `user_token` and `website_token` so UI filters match. No fallbacks to other tables.
  - Expose a GET route to verify persisted rows with the same filters the UI uses.
- Keyword/title normalization
  - Deduplicate consecutive tokens (avoid strings like `importer importer`). Clean titles/keywords before saving.
