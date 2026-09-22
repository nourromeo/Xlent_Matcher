# Xlent Matcher

Internal XLENT application for matching client assignments with existing consultants and explaining why a consultant matches or does not match the assignment requirements.

## Tech stack

- **Web:** React 19, TypeScript, Vite
- **API:** ASP.NET Core Web API (.NET 10)
- **Data:** Entity Framework Core, SQL Server LocalDB
- **Matching:** deterministic and explainable matching logic
- **AI:** used only where it provides clear value, such as extracting or structuring free text and supporting CV adaptation

## Repository structure

```text
Xlent_Matcher/
├── src/
│   ├── XlentMatch.Web/       # React frontend
│   └── XlentMatch.Api/       # ASP.NET Core backend API
├── .gitignore
└── README.md
```

### Backend structure

```text
XlentMatch.Api/
├── Application/              # Application workflows, DTOs and services
├── Controllers/              # HTTP API endpoints
├── Domain/                   # Domain entities and enums
├── Infrastructure/           # EF Core, persistence and external integrations
├── Properties/
├── Program.cs
├── appsettings.json
└── XlentMatch.Api.csproj
```

## Run the frontend

From the repository root:

```powershell
cd src/XlentMatch.Web
npm install
npm run dev
```

Production build:

```powershell
npm run build
```

## Run the backend

From the repository root:

```powershell
cd src/XlentMatch.Api
dotnet restore
dotnet run
```

## Matching principles

The Match Score should be understandable, testable and adjustable. Deterministic logic is used for the score itself. AI must not invent consultant experience or change the Match Score.

Typical matching factors include:

- required skills
- preferred skills
- years of experience
- relevant projects
- industry experience

## AI and privacy

Consultant CVs may contain personal data. The application should minimize what is sent to external AI services and prefer structured or anonymized data where possible.

AI-generated or extracted information should be reviewed by the user before it is saved or used as authoritative data.

## Development workflow

The project uses one repository for both the web application and API. Work should be split into task-sized branches when useful, followed by a Pull Request and review before merging into `main`.
