# XlentMatch Backend

Internal tool for XLENT that matches consultants against customer assignments.

**Stack:** .NET 10, ASP.NET Core Web API, Entity Framework Core, SQL Server LocalDB, OpenAI (gpt-5-mini).

## Setup

1. Open `XlentMatch.Api/appsettings.json` and replace:
   - `"Endpoint": "AQUI_PONES_EL_ENDPOINT"` -> `https://api.openai.com/v1/chat/completions`
   - `"ApiKey": "AQUI_PONES_LA_KEY"` -> your OpenAI API key
2. Run:

```bash
cd XlentMatch.Api
dotnet restore
dotnet run
```

Swagger UI: `https://localhost:7180/swagger`

The LocalDB database `XlentMatchDb` is created automatically on first start.

## Project structure

| Folder | Responsibility |
|---|---|
| `Controllers/` | API layer: receives requests, validates input, returns responses |
| `Application/` | Workflows, DTOs, interfaces for external services, `MatchingService` |
| `Domain/` | Entities and enums. No dependency on database or AI |
| `Infrastructure/` | `AppDbContext` (EF Core), `PdfTextExtractor` (PdfPig), `OpenAiTextService` |

## Matching rules (configurable in `appsettings.json` -> `Matching`)

| Factor | Weight |
|---|---|
| Mandatory requirements matched (proportional) | 60 |
| Desired requirements matched (proportional) | 25 |
| Total years of experience vs minimum required (capped at 100%) | 15 |
| Penalty per missing mandatory requirement | -10 |

Score is clamped to 0..100. Matching is deterministic and does not use AI.

A requirement is matched when the consultant has a skill with the same name (case-insensitive) that
satisfies `MinYears` / `MinLevel` if specified. A certification with the same name also counts.
Projects using the technology are added as supporting evidence.

## Endpoints

| Method | Route | Description |
|---|---|---|
| GET / POST | `/api/consultants` | List / create consultant (with skills, experiences, projects, certifications) |
| GET / PUT / DELETE | `/api/consultants/{id}` | Get / update / delete consultant |
| GET / POST | `/api/assignments` | List / create assignment with requirements |
| GET / PUT / DELETE | `/api/assignments/{id}` | Get / update / delete assignment |
| POST | `/api/extraction/consultant` | PDF or text -> consultant draft (AI, nothing saved) |
| POST | `/api/extraction/requirements` | PDF or text -> requirements draft (AI, nothing saved) |
| POST | `/api/matching/run` | `{ assignmentId, consultantIds[] }` -> ranked results, saved |
| GET | `/api/matching/assignment/{id}` | Stored results for an assignment |
| POST | `/api/cv/suggest` | `{ consultantId, assignmentId }` -> CV adaptation suggestion (AI, nothing saved) |
| POST | `/api/cv/adapted` | Save a user-approved adapted CV (original CV is never modified) |
| GET | `/api/cv/adapted/consultant/{id}` | Adapted CV versions for a consultant |

## AI rules

- AI only extracts and structures information that exists in the source text.
- AI never invents skills or experiences, never changes the match score, and never overwrites the original CV.
- The user reviews every AI output before saving.

## Production note

Do not keep the API key in `appsettings.json`. Use `dotnet user-secrets` or the environment variable `OpenAi__ApiKey`.
