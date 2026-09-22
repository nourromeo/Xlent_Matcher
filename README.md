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
├── Controllers/              # API endpoints
├── Models/                   # Core application and database models
├── DTOs/                     # Data sent to/from the API
│   ├── Consultants/
│   ├── Assignments/
│   ├── Matching/
│   ├── Cv/
│   └── Extraction/
├── Services/                 # Matching, AI and PDF logic
├── Data/                     # EF Core DbContext and database setup
├── Properties/
├── Program.cs
├── appsettings.json
└── XlentMatch.Api.csproj
```

## Core data model

The MVP is built around four main concepts:

- **Consultant** with skills, experience, projects, education, languages, industries and certifications
- **Assignment** with customer information and requirements
- **AssignmentRequirement** classified as Mandatory or Desired
- **MatchResult** with score, rank, matched/missing requirements, evidence and explanation

## Run the frontend

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

```powershell
cd src/XlentMatch.Api
dotnet restore
dotnet run
```

## Matching principles

The Match Score should be understandable, testable and adjustable. Deterministic logic is used for the score itself. AI must not invent consultant experience or change the Match Score.

Current deterministic factors are:

- mandatory requirements
- desired requirements
- years of experience
- penalty for missing mandatory requirements

Additional factors such as seniority, availability or semantic matching are not part of the score until explicitly decided.

## AI and privacy

Consultant CVs may contain personal data. The application should minimize what is sent to external AI services and prefer structured or anonymized data where possible.

AI-generated or extracted information must be reviewed by the user before it is saved or treated as authoritative data.

## Development workflow

The web application and API are kept in the same repository. Use task-sized branches when useful and review changes through Pull Requests before merging into `main`.
