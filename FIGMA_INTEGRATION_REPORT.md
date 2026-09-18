# Figma integration report

Date: 2026-09-18. Scope: the entire current working tree, including hidden/ignored project files, source imports, configuration, lockfile metadata, and Git status. Git internals are not application source. This was a static analysis; the Figma export was subsequently copied to the root frontend and the original `Figma_design/` folder was deleted with explicit approval. The root frontend remains backend-free.

## Current project structure

```text
AI_Consultant_Matcher/
├── .git/
├── .gitignore                 # Visual Studio-oriented; also ignores node_modules
├── README.md                  # Project name only
└── Figma_design/
    └── Build Internal ATS Frontend/
```

**No separate existing application or backend was found in this checkout.** Only `README.md` and the root `.gitignore` are tracked on `main` (initial commit `b8bee7b`). The export is untracked. There are 36 project files before this report: two at the root and 34 in the export. There are no solution/project files, root package manifest, tests, or separate frontend/backend directories. The root ignore template alone does not establish a .NET application.

The only application source present is the Figma export. If an existing application lives elsewhere, its location must be established before planning a merge into it.

## Figma export structure

All paths below are relative to `Figma_design/Build Internal ATS Frontend/`.

```text
├── package.json, pnpm-lock.yaml
├── index.html, vite.config.ts, tsconfig.json
├── .mise.toml, .gitignore, .gitattributes
├── AGENTS.md, CLAUDE.md
├── .figma/make/
│   ├── site.json, dev.json
│   └── analyze-routes, deploy, deploy-preview, dev, format, install, langserver
└── src/
    ├── main.tsx, App.tsx, index.css, vite-env.d.ts
    ├── theme.tsx, i18n.tsx
    ├── components/Layout.tsx
    └── pages/
        ├── Dashboard.tsx, TalentPool.tsx, CandidateDetail.tsx
        ├── Jobs.tsx, Matching.tsx, Upload.tsx
        └── Admin.tsx, CvCoach.tsx
```

There are no bundled images, fonts, CV documents, `public/`, `node_modules/`, or build output. Fonts are loaded from Google Fonts. All eight pages are routed by `App.tsx`; none is an unused page file.

## Stack, required files, and missing dependencies

Versions below come from the supplied lockfile, not a verified installation.

| Purpose | Dependencies / versions |
| --- | --- |
| UI | React and React DOM 19.2.4 |
| Routing | react-router-dom 7.18.3 (`BrowserRouter`) |
| Styling | Tailwind CSS and @tailwindcss/vite 4.2.2 |
| Icons / charts | lucide-react 1.43.0; recharts 3.10.1 |
| Build | Vite 8.0.5; @vitejs/plugin-react 6.0.1; TypeScript 5.9.3 |
| Development | @types/node, @types/react, @types/react-dom; oxfmt 0.2.0 |

- **Required for the unchanged frontend:** `index.html`, `src/main.tsx`, `App.tsx`, `index.css`, both providers, `Layout.tsx`, and all eight imported pages; `package.json`, installed dependencies, and `vite.config.ts` supply the toolchain.
- **Also required by the current configuration:** `.figma/make/site.json`. Vite imports it and replaces Figma placeholders in `index.html`. The Figma plugins are defined inside `vite.config.ts`, not missing npm packages.
- **Keep for reproducibility and development:** `pnpm-lock.yaml`, `tsconfig.json`, and `src/vite-env.d.ts`. `.mise.toml` specifies Node 22 and pnpm 10.34.3; mise itself is optional if versions are provisioned another way.
- **Missing locally:** no installed project dependencies; `pnpm` was not found on PATH. Node is available as v25.6.1, which differs from the export's Node 22 configuration. The lockfile records Vite's Node requirement as `^20.19.0 || >=22.12.0`.
- All external source imports have corresponding manifest dependencies. Recharts' `react-is` peer is present through the lockfile's automatic peer installation. No missing relative import targets were found. Registry availability and successful installation/build remain unverified.
- Tailwind v4 is wired through CSS and Vite; missing `tailwind.config.*` or PostCSS configuration is not a gap in this scaffold. There is no backend SDK requirement for this mock UI.

## Duplicated, reusable, and mergeable files

SHA-256 comparison found **no byte-identical project files**. The only repeated filename is `.gitignore`; the root and export versions differ and apply at different directory scopes. Mock consultant data and scoring settings overlap across pages but are independently hardcoded, not duplicate files.

| Files | Recommended treatment after approval |
| --- | --- |
| `Layout.tsx`, `theme.tsx`, `i18n.tsx`, `index.css` | Reuse layout, themes, and language infrastructure; adapt XLENT branding and vocabulary. |
| `TalentPool.tsx`, `CandidateDetail.tsx` | Adapt into existing-consultant list and consultant profile views. |
| `Jobs.tsx`, `Matching.tsx`, `Upload.tsx` | Reuse assignment requirements, comparison/evidence, and CV upload presentation. |
| `Dashboard.tsx` | Reuse relevant summary UI; replace recruitment metrics and fabricated activity. |
| `Admin.tsx`, `CvCoach.tsx` | Review scope before inclusion; CV Coach currently focuses on ATS optimisation. |
| `App.tsx`, `main.tsx`, `index.css`, `i18n.tsx` | Merge routing, providers, global styles, and terminology with the destination frontend once identified. |
| `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html` | Reconcile with destination tooling; never overwrite another application's configuration wholesale. Keep manifest and lockfile consistent. |
| Both `.gitignore` files; root `README.md` | Merge only relevant ignore rules and add actual setup documentation. |

There is currently no second application into which these can actually be merged.

## Files that should not be copied blindly

- `.figma/make/` Bash tooling and `dev.json` serve Figma's environment; deployment/routing scripts also require Figma CLIs. They are unnecessary for ordinary local Vite commands. **Exception:** retain `site.json` until its Vite import and HTML transformation have been replaced deliberately.
- `AGENTS.md` and `CLAUDE.md` describe the Figma environment, including an already-running server; they are not application runtime requirements and should not become root instructions unchanged.
- `.gitattributes` applies extensive Git LFS rules despite no current binary assets. Do not propagate it to the repository root without a project need.
- `.mise.toml` and formatter tooling are optional developer conveniences, not browser runtime code. Preserve them in the original export.
- Do not carry mock identities, scores, AI status, or ATS coaching claims into a production interface as real functionality.

No whole source file is demonstrably unused. Small unused items include `ArrowUpRight` in `TalentPool.tsx`, `Clipboard`/`AlertTriangle` and the unused `t` binding in `CvCoach.tsx`, plus `beforeAngle`, `afterAngle`, `polarX`, and `polarY` in its gauge. These are future cleanup candidates, not reasons to delete pages.

## Conflicts and possible risks

1. **Product mismatch:** `Layout.tsx` says “Recruit OS” and “Recruiter”; translations and site metadata describe candidates, open positions, and recruitment. XLENT needs existing consultants compared with client assignments. Update all languages and metadata; reconsider ATS scoring/coaching rather than merely changing the logo.
2. **Prototype behaviour:** no API calls, authentication, persistence service, or actual AI integration exists. Upload stores file metadata only; advertised duplicate detection, size/batch limits, and SSE are unimplemented. New-job extraction is fixed data, creation only closes the modal, and several save/propose buttons have no action. Admin role text is not access control.
3. **Data/navigation gaps:** every consultant ID displays the same profile; Matching ignores the `?job=` query. Admin weights do not affect matches. Shared mock entities/settings will need consolidation.
4. **Visible code defects:** translated “All” availability options lack stable values; admin tabs store translated labels, so language switching can hide their content. `TalentPool.tsx` constructs invalid colours such as `var(--ats-green)18`. Coach score increments total 40 while its projected score rises only 28.
5. **Potential integration conflicts:** global CSS changes `html`, `body`, and `#root` and defines `text-base`, also a Tailwind utility name. Preserve the Vite/TypeScript alias together. BrowserRouter needs host fallback to `index.html`; subpath hosting needs routing/base alignment. The default strict port is 8443. These are integration considerations, not observed collisions with a second app.
6. **Validation limits:** `build` runs only `vite build`; there is no explicit typecheck, test, or lint script. Type compatibility, layout/accessibility, and runtime behaviour need verification after approval. External fonts require network access. The untracked export is not protected by the existing commit.

## Recommended integration plan

1. Obtain approval and establish where the existing application is, if outside this checkout. Preserve the export as the reference; do not move or delete it.
2. In a separate approved integration change, use the real frontend's structure. If this checkout is intentionally new, create a dedicated `frontend/` rather than replacing root files with the export.
3. Provision the declared toolchain, install using the lockfile, and validate the unchanged export first. Then adapt only necessary source/configuration; replace Figma-specific HTML/configuration together.
4. Apply XLENT branding and the terms **Consultants / Konsulter**, **Client assignments / Kunduppdrag**, and **CV matching / CV-matchning**. Keep any demo data clearly identified. Review Admin and CV Coach scope.
5. Consolidate mock data, fix routing/state/style defects, and verify build, explicit TypeScript checking, all routes, languages, themes, and key interactions. Keep backend integration out of this stage.
6. Present the frontend changes for review before any separately approved backend work.

**Status:** superseded by the root frontend integration. The original Figma export has been deleted after the root copy was validated. No backend was connected.
