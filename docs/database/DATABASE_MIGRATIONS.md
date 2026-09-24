# Database migrations

API:t använder EF Core migrations som databasens lifecycle-mekanism.

## Aktuella migrations

### 20260923193000_AdoptEfMigrations

Denna migration inför migrations på den befintliga utvecklingsdatabasen utan att radera existerande data.

Den:

- behåller befintliga tabeller,
- skapar den centrala Skill Taxonomy när den saknas,
- lägger till SkillId-länkar där de saknas,
- tar bort den gamla AdaptedCvs-tabellen om den finns,
- stödjer även en ny tom utvecklingsdatabas.

Efter denna migration säkerställer SkillNormalizationService att den centrala skill-katalogen finns och att data normaliseras mot canonical skills.

### 20260923230644_CanonicalSkillCleanup

Denna migration slutför canonical skill-modellen.

Den:

- verifierar att ConsultantSkills.SkillId inte innehåller NULL,
- verifierar att AssignmentRequirements.SkillId inte innehåller NULL,
- hanterar beroende indexes och foreign keys säkert,
- gör SkillId obligatoriskt,
- tar bort de gamla redundanta Name/Category-kolumnerna,
- återskapar rätt indexes och foreign keys.

Det finns inte längre temporära compatibility-kolumner i den slutliga modellen.

## Startup

Programmet använder:

`Database.MigrateAsync()`

Det gamla `EnsureCreated()`-flödet används inte längre.

## Vanliga kommandon

```powershell
cd src/XlentMatch.Api

dotnet ef migrations list
dotnet ef database update
dotnet ef migrations has-pending-model-changes
```

Före leverans ska `has-pending-model-changes` inte rapportera någon osparad model change.

## Ny utvecklingsdatabas

En ny LocalDB kan verifieras genom att använda en ny databas och köra:

```powershell
dotnet ef database update
```

Därefter ska API:t kunna starta normalt utan `EnsureCreated()` eller manuell SQL.

## Viktigt

Ändra inte en migration som redan har distribuerats till en riktig produktionsmiljö. Under denna LIA-utveckling har migrations stabiliserats innan produktionssättning.
