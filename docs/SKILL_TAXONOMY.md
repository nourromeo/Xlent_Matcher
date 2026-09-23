# Canonical Skill Taxonomy

The MVP now uses a central skill catalog as the source of truth for skill names and categories.

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

The legacy Name and Category columns remain temporarily for compatibility until the EF Core migration cleanup.

### AssignmentRequirement
- AssignmentId
- SkillId
- Type
- MinYears
- MinLevel

The legacy Name column remains temporarily for compatibility until the EF Core migration cleanup.

## Flow

CV / assignment text
→ AI extracts skill names
→ SkillNormalizationService
→ canonical Skill / Alias lookup
→ SkillId
→ deterministic matching

AI does not decide the final category.

Unknown skills are added as **Unclassified** so they can be reviewed in Admin instead of receiving an arbitrary AI category.

## Matching

Matching uses SkillId when both sides have a canonical link. Name comparison remains only as a compatibility fallback while the old LocalDB schema is being migrated.

## Admin

Skill Taxonomy now reads directly from the Skill and SkillAlias tables and shows the number of linked consultants.

## Next database step

Replace EnsureCreated and the temporary startup SQL bridge with EF Core migrations, then remove the compatibility Name/Category columns from ConsultantSkill and Name from AssignmentRequirement when the migrated data has been verified.
