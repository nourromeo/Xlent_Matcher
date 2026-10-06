# Xlent Matcher

Xlent Matcher är ett internt verktyg för att jämföra **kunduppdrag** med **befintliga konsulter** på XLENT.

Systemets huvudfråga är:

> Vilken av våra befintliga konsulter passar bäst för det här kunduppdraget?

Det är inte ett ATS- eller rekryteringssystem. Systemet arbetar endast med kunduppdrag och konsulter som redan finns i organisationen. Det slutliga beslutet tas alltid av användaren.

## Funktioner i MVP

- Visa befintliga konsulter
- Skapa och redigera kunduppdrag
- Lägga till Mandatory och Desired requirements
- Matcha ett kunduppdrag mot konsulter
- Beräkna ett deterministiskt Match Score
- Visa ranking
- Visa matched och missing requirements
- Visa evidence och motivering
- Ladda upp CV och extrahera strukturerad information
- Anpassa ett CV till ett kunduppdrag med AI-stöd
- Administrera central Skill Taxonomy
- Ändra Matching Weights i Admin

## Teknik

- **Frontend:** React 19, TypeScript, Vite
- **Backend:** ASP.NET Core Web API (.NET 10)
- **Databas:** Entity Framework Core och SQL Server LocalDB under utveckling
- **Matching:** deterministisk och förklarbar logik i backend
- **AI:** Azure OpenAI där fri text behöver analyseras eller struktureras

## Enkel arkitektur

```text
React Web
   |
   v
ASP.NET Core API
   |
   +--> MatchingService
   +--> SkillNormalizationService
   +--> Azure OpenAI
   |
   v
Entity Framework Core
   |
   v
SQL Server LocalDB
```

MatchingService räknar Match Score. AI bestämmer inte själva poängen.

## Projektstruktur

```text
Xlent_Matcher/
├── .github/
│   └── workflows/
├── docs/
│   ├── architecture/
│   ├── database/
│   └── testing/
├── src/
│   ├── XlentMatch.Api/
│   └── XlentMatch.Web/
├── tests/
├── .gitignore
├── XlentMatch.slnx
└── README.md
```

## Starta backend

Förutsättningar:

- .NET 10 SDK
- SQL Server LocalDB

Kör:

```powershell
cd src/XlentMatch.Api
dotnet restore
dotnet ef database update
dotnet run
```

API:t använder EF Core migrations. I Development kör applikationen automatiskt `Database.MigrateAsync()` vid start för att förenkla lokal utveckling. I andra miljöer körs migrationer som ett explicit deploysteg, till exempel:

```powershell
dotnet ef database update --project src/XlentMatch.Api
```

Icke-Development kräver `ConnectionStrings:DefaultConnection` från miljökonfiguration eller secret storage. LocalDB finns endast i `appsettings.Development.json`.

## Starta frontend

Öppna en ny terminal:

```powershell
cd src/XlentMatch.Web
npm install
npm run dev
```

Kontrollera production build med:

```powershell
npm run build
```

## Databas och migrations

Databasen hanteras med EF Core migrations.

Viktiga migrations i nuvarande MVP:

- `20260923193000_AdoptEfMigrations`
- `20260923230644_CanonicalSkillCleanup`

Den senare gör `SkillId` obligatoriskt i consultant skills och assignment requirements och tar bort de gamla redundanta skill-kolumnerna.

För att kontrollera migrations:

```powershell
dotnet ef migrations list
dotnet ef migrations has-pending-model-changes
```

## Azure OpenAI

API-nyckeln ska inte ligga i GitHub.

För lokal utveckling används User Secrets:

```powershell
cd src/XlentMatch.Api
dotnet user-secrets init
dotnet user-secrets set "OpenAi:ApiKey" "YOUR_KEY"
```

Endpoint och modell finns i vanlig configuration. API:t kräver:

- `OpenAi:Endpoint`
- `OpenAi:ApiKey`
- `OpenAi:Model`

Om AI-tjänsten inte är tillgänglig returnerar API:t ett användarvänligt fel i stället för provider-detaljer.

## Match Score

Match Score är deterministiskt, testbart och justerbart.

Standardvärden:

| Faktor | Standard |
| --- | ---: |
| Mandatory requirements | 60 |
| Desired requirements | 25 |
| Experience | 15 |
| Missing mandatory penalty | -10 per saknat krav |

De tre positiva vikterna måste tillsammans vara **100**.

Admin kan ändra vikterna. De sparas lokalt i:

```text
src/XlentMatch.Api/App_Data/matching-weights.json
```

Filen ligger utanför Git och laddas igen när API:t startar. `MatchingService` använder de aktuella värdena vid nästa matching.

## Skill Taxonomy

Systemet använder en central Skill Taxonomy.

- `Skill` innehåller canonical name och category.
- `SkillAlias` innehåller alternativa namn.
- `ConsultantSkill` och `AssignmentRequirement` länkas med `SkillId`.
- AI får extrahera ett skill-namn men bestämmer inte den slutliga kategorin.
- Okända skills hamnar som `Unclassified` tills de granskas.

Admin kan lägga till och redigera skills. Dubbletter mellan canonical names och aliases stoppas av backend.

## AI-användning

AI används där vanlig C#-logik inte är tillräcklig, till exempel:

- extrahera struktur från CV-text
- extrahera krav från fri text
- ge tillfälliga förslag på CV-anpassning

AI används inte för att skapa Match Score och får inte hitta på erfarenhet, skills eller certifieringar.

## Privacy

CV:n kan innehålla personuppgifter.

MVP:n följer därför några enkla principer:

- bara data som behövs för funktionen ska behandlas
- AI ska få så lite data som möjligt för aktuell uppgift
- API-nycklar och andra secrets får inte sparas i Git
- original PDF-filen lagras inte i databasen i MVP
- AI-extraherad information granskas av användaren innan den blir konsultdata
- CV Adaptation är stateless och det genererade resultatet sparas inte i databasen

## Felhantering

MVP:n hanterar bland annat:

- backend kan inte nås
- ogiltig eller tom PDF/TXT
- PDF utan läsbar text
- Azure OpenAI är inte tillgänglig
- duplicate canonical skill eller alias
- assignment utan requirements
- matching utan valda konsulter

## Test och kvalitet

GitHub Actions kör:

- API restore/build
- kontroll av EF Core pending model changes
- frontend typecheck/build

Manuell end-to-end-kontroll finns i:

`docs/testing/MVP_SMOKE_TEST.md`

## Viktig avgränsning

Följande är inte del av nuvarande Match Score om det inte beslutas senare:

- semantic matching / embeddings
- seniority score
- availability score
- industry score

Detta håller MVP:n enkel, förklarbar och möjlig att testa.
