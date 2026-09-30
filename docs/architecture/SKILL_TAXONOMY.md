# Canonical Skill Taxonomy

MVP:n använder en central skill-katalog som source of truth för skill-namn och kategorier.

## Data model

### Skill

- Id
- CanonicalName
- NormalizedName
- Category

### SkillAlias

- Id
- SkillId
- Alias
- NormalizedAlias

### ConsultantSkill

- ConsultantId
- SkillId
- Years
- Level
- Evidence

### AssignmentRequirement

- AssignmentId
- SkillId
- Type
- MinYears
- MinLevel

De gamla fysiska Name/Category-kolumnerna har tagits bort efter EF Core cleanup migration.

## Flow

```text
CV / assignment text
        |
        v
AI extracts skill names
        |
        v
SkillNormalizationService
        |
        v
canonical Skill / Alias lookup
        |
        v
SkillId
        |
        v
deterministic matching
```

AI bestämmer inte den slutliga skill-kategorin. För mänskliga språk läser extraktionen bara språkets namn och uttrycklig nivå; kända namn och aliases normaliseras mot den seedade katalogen. En parentes som `Svenska (Flytande nivå)` sparas som `Swedish` med nivån `Flytande nivå`.

Den seedade katalogen är source of truth för vanliga språk. Extrahering skapar inte taxonomy-poster för konsultens språk. Okända språk i konsultens profilutkast sparas utan att skapas i taxonomy. Okända språkkrav från kunduppdrag sparas som `Unclassified` så att de syns i Admin för granskning innan de kategoriseras. Katalogsynken är idempotent och körs både vid API-start och när Admin hämtar översikten, så saknade seed-rader och kategorier repareras utan en databas-migration.

Okända skills skapas som `Unclassified` så att de kan granskas i Admin.

## Matching

Matching använder `SkillId` direkt mellan AssignmentRequirement och ConsultantSkill.

Detta gör logiken:

- tydligare,
- mindre beroende av stavning,
- lättare att testa,
- lättare att förklara.

## Admin

Admin -> Skill Taxonomy läser direkt från `Skill` och `SkillAlias`.

Nuvarande funktioner:

- sök och filter,
- pagination,
- Add Skill,
- Edit Skill,
- duplicate validation för canonical names och aliases,
- antal kopplade consultants.

Delete Skill är medvetet disabled i nuvarande MVP.

## Persistence

Skills och aliases sparas i SQL Server via EF Core.

Ändringar i canonical names bevarar det tidigare canonical name som alias när det behövs, så att normalisering fortfarande kan känna igen äldre namn.
