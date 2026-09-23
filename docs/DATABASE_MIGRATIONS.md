# Database migrations

The API now uses EF Core migrations as the database lifecycle mechanism.

## Current migration

`20260923193000_AdoptEfMigrations`

This migration is intentionally safe for the existing LocalDB used during development:

- Existing tables are kept.
- Missing canonical skill tables are created.
- `SkillId` links are added to consultant skills and assignment requirements when missing.
- The obsolete `AdaptedCvs` table is removed if it still exists.
- Fresh development databases can also create the current schema through the same migration.

After migrations run, `SkillNormalizationService`:

1. ensures the canonical Skill Catalog exists,
2. resolves aliases,
3. links existing `ConsultantSkill` rows to `SkillId`,
4. links existing `AssignmentRequirement` rows to `SkillId`.

## Temporary compatibility columns

These columns remain for the moment:

- `ConsultantSkill.Name`
- `ConsultantSkill.Category`
- `AssignmentRequirement.Name`

They are kept until the migrated data has been verified locally. They should only be removed in a later migration after confirming that every relevant row has a valid `SkillId`.

## Startup

The application now calls:

`Database.MigrateAsync()`

The old `EnsureCreated()` and startup schema-creation SQL have been removed from `Program.cs`.

## Verification queries

After running the API, verify:

```sql
SELECT COUNT(*) AS SkillsWithoutCanonicalLink
FROM ConsultantSkills
WHERE SkillId IS NULL;

SELECT COUNT(*) AS RequirementsWithoutCanonicalLink
FROM AssignmentRequirements
WHERE SkillId IS NULL;

SELECT CanonicalName, Category
FROM Skills
ORDER BY CanonicalName;
```

The first two counts should be 0 for non-empty skill/requirement names before removing the compatibility columns.
