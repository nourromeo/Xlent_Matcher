# Xlent Matcher

Internal XLENT application for matching client assignments with existing consultants.

## Project structure

```text
Xlent_Matcher/
├── frontend/                 # React + TypeScript + Vite
│   ├── src/
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── backend/
│   └── XlentMatch.Api/       # ASP.NET Core Web API
│       ├── Application/
│       ├── Controllers/
│       ├── Domain/
│       ├── Infrastructure/
│       ├── Program.cs
│       └── XlentMatch.Api.csproj
├── .gitignore
└── README.md
```

## Frontend

```powershell
cd frontend
npm install
npm run dev
```

Production build:

```powershell
npm run build
```

## Backend

```powershell
cd backend/XlentMatch.Api
dotnet restore
dotnet run
```

The frontend and backend are kept in the same repository because they are parts of the same application and MVP.
