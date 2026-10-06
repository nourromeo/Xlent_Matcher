# Xlent_Matcher Technical Audit

Branch audited: `Development-Branch`  
Scope: `src/XlentMatch.Api`, `src/XlentMatch.Web`, tests, migrations, configuration and shared UI.  
Initial status for every finding: `To Do`.

| ID | Area | Finding | Priority | Recommendation | Status |
|---|---|---|---|---|---|
| AUD-001 | Code & Cleanup | `src/XlentMatch.Web/src/pages/Matching.tsx` is about 1,200 lines and combines data loading, filter/selection state, scoring presentation, tabs, evidence and empty/error rendering. | Medium | Split only the clearly independent detail sections and data hooks after adding focused regression coverage; keep matching calculations outside the page. | To Do |
| AUD-002 | Code & Cleanup | `src/XlentMatch.Web/src/i18n.tsx` is a single large resource containing all three locales and is difficult to audit for key parity. | Medium | Keep the existing system, but separate locale resources or add a build-time key-parity check before undertaking a larger localization refactor. | To Do |
| AUD-003 | Code & Cleanup | `src/XlentMatch.Web/src/pages/Consultants.tsx` contains page-specific calendar generation/formatting and availability modal state in addition to table rendering. | Low | Extract a small availability editor only if the same interaction appears elsewhere; otherwise leave it local and add interaction tests. | To Do |
| AUD-004 | Code & Cleanup | There are repeated inline style objects for borders, surfaces, semantic colors and shadows across `Admin.tsx`, `Matching.tsx`, `ConsultantDetail.tsx`, `CvUpload.tsx` and `Consultants.tsx`. | Low | Reuse existing UI primitives/tokens first; centralize only repeated recipes with identical meaning. | To Do |
| AUD-005 | Architecture & Structure | `MatchingService` owns deterministic score calculation, ranking and explanation construction in one service (`src/XlentMatch.Api/Services/MatchingService.cs`, 264 lines). | Medium | Keep the service boundary, but isolate score calculation from explanation/ranking behind small internal methods so formula changes have a narrow test surface. | To Do |
| AUD-006 | Architecture & Structure | `MatchingController.Run` loads a broad consultant graph (skills, projects, certifications, languages and experiences) before matching, while `GetForAssignment` performs separate result and consultant queries (`src/XlentMatch.Api/Controllers/MatchingController.cs`). | Medium | Measure the endpoint with realistic data; if profile data is not required for a scoring path, project only the required graph or document the intentional graph requirement. | To Do |
| AUD-007 | Architecture & Structure | `MatchingWeightsStore` persists mutable matching configuration in `App_Data/matching-weights.json`, while the rest of application state is database-backed (`src/XlentMatch.Api/Services/MatchingWeightsStore.cs`). | Medium | Keep for MVP if single-instance deployment is guaranteed; otherwise define persistence/concurrency expectations and add an integration test for restart and concurrent updates. | To Do |
| AUD-008 | Reusability & Design System | Shared `DataTable`, `Modal`, `PageHeader`, `StatusBadge`, `Input` and `Button` components exist, but several pages still compose equivalent table/card/error/loading patterns manually. | Medium | Audit repeated patterns page by page and consolidate only exact responsibilities; prioritize shared error/loading and table-cell status patterns. | To Do |
| AUD-009 | Reusability & Design System | `DataTable` now supports optional row navigation but keeps generic row semantics and keyboard behavior in a component used by multiple pages (`src/XlentMatch.Web/src/components/ui/DataTable.tsx`). | Low | Add component-level accessibility tests for clickable rows and interactive cells to ensure controls continue to stop propagation. | To Do |
| AUD-010 | Quality & Risks | `apiRequest` exposes raw backend/transport messages to callers (`src/XlentMatch.Web/src/services/api.ts`), and pages often display those messages directly or prefix them with a generic label. | Medium | Introduce a small error-normalization boundary that preserves diagnostics for logs while presenting localized user-safe messages. | To Do |
| AUD-011 | Quality & Risks | `Program.cs` calls `Database.MigrateAsync()` during application startup. This makes every application start a schema-changing operation and couples runtime availability to migration success. | High | Make migration execution an explicit deployment/startup policy, with environment controls and documented rollback/backup expectations. | Done |
| AUD-012 | Quality & Risks | `appsettings.json` contains a LocalDB connection string (`src/XlentMatch.Api/appsettings.json`), while OpenAI settings are configuration-driven. Environment-specific secrets/connection strings need deployment verification. | High | Verify production configuration uses environment variables/user-secrets/secret storage and that development defaults cannot be deployed accidentally. | To Do (deployment verification) |
| AUD-013 | Quality & Risks | Matching formula is deterministic and tested in `MatchingServiceTests`, but the controller persists results after loading and replacing existing rows; coverage of transaction failure/partial persistence is not evident in the repository. | Medium | Add an integration test around replacement and assignment status update, or use an explicit transaction if atomicity is required. | To Do |
| AUD-014 | Quality & Risks | The repository has focused backend tests for matching, prompt contracts and skill normalization, but no frontend automated tests are present in `src/XlentMatch.Web/package.json` or the listed test tree. | Medium | Add targeted UI tests only for high-risk workflows: matching empty states, availability save/cancel/calendar, and taxonomy review. | To Do |
| AUD-015 | Quality & Risks | Several pages use `window.confirm` for destructive actions (`Admin.tsx`, `ClientAssignments.tsx`, `ConsultantDetail.tsx`), bypassing the shared `Modal` accessibility and styling model. | Low | Consolidate destructive confirmation into a reusable accessible confirmation dialog when those flows are next touched. | Done |
| AUD-016 | Quality & Risks | User-visible dates are handled through both shared `localeFormat` utilities and page-local formatting (`Consultants.tsx`), increasing the risk of inconsistent year/month/day output. | Low | Standardize date display through `localeFormat` variants while keeping API storage formats separate. | Done |
| AUD-017 | Quality & Risks | `OpenAiTextService` contains substantial prompt/schema/runtime-contract logic in one service (`src/XlentMatch.Api/Services/OpenAiTextService.cs`, 293 lines), increasing the cost of changing one extraction contract safely. | Medium | Keep the service boundary, but separate contract/schema construction from HTTP execution and retain the existing prompt tests. | To Do |
| AUD-018 | Quality & Risks | Personal CV data and extracted text are represented in `Consultant`, `CvUploadRecord` and DTOs; the audit found no authentication/authorization setup in the inspected startup/controller surface. | High | Verify deployment is behind the intended identity boundary and add explicit authorization/privacy controls before exposing the API beyond a trusted internal environment. | To Do |

## Most important findings

1. **AUD-011 — Runtime database migrations:** startup can change schema and fail application startup.
2. **AUD-018 — Access control and CV privacy:** personal data endpoints require an explicit deployment/security boundary.
3. **AUD-012 — Production configuration:** development connection defaults and AI configuration require deployment verification.
4. **AUD-006 — Matching query breadth:** the matching endpoint loads a large entity graph and should be measured against realistic data.
5. **AUD-014 — Frontend test gap:** critical interactive workflows currently lack repository-visible automated UI coverage.

## Findings requiring human verification

- **AUD-012:** confirm actual production secret and connection-string injection.
- **AUD-018:** confirm whether authentication/authorization is enforced by an external reverse proxy or hosting environment.
- **AUD-006:** confirm which related collections are required by every current matching rule before reducing the query graph.
- **AUD-007:** confirm deployment topology; file-backed weights are unsafe for multiple API instances.
- **AUD-013:** confirm required atomicity between result replacement and assignment status update.
- **AUD-004/AUD-008:** confirm repeated UI recipes represent the same responsibility before consolidating them.

## Audit constraints

This is a read-only audit. No application code was refactored, deleted, moved, renamed or fixed as part of this audit.
