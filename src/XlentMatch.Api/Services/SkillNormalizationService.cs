using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using XlentMatch.Api.Data;
using XlentMatch.Api.Models;

namespace XlentMatch.Api.Services;

public class SkillNormalizationService(AppDbContext db)
{
    private static readonly SemaphoreSlim CatalogSyncGate = new(1, 1);
    private static readonly Regex TrailingParenthetical = new(@"^(?<name>.*?)\s*\((?<level>[^()]*)\)\s*$", RegexOptions.Compiled);

    public static string NormalizeKey(string value)
    {
        var collapsed = Regex.Replace(value.Trim(), @"\s+", " ");
        return collapsed.ToUpperInvariant();
    }

    public static (string Name, string Proficiency) NormalizeHumanLanguage(string? rawName, string? level)
    {
        var name = Regex.Replace((rawName ?? "").Trim(), @"\s+", " ");
        var proficiency = NormalizeLanguageProficiency(level);

        var suffix = TrailingParenthetical.Match(name);
        if (suffix.Success && IsProficiencyDescription(suffix.Groups["level"].Value))
        {
            name = suffix.Groups["name"].Value.Trim();
            if (string.Equals(proficiency, HumanLanguageProficiency.NotSpecified, StringComparison.Ordinal))
                proficiency = NormalizeLanguageProficiency(suffix.Groups["level"].Value);
        }

        var normalized = NormalizeKey(name);
        var catalogItem = SkillCatalogSeed.Items.FirstOrDefault(item =>
            string.Equals(item.Category, "Human language", StringComparison.OrdinalIgnoreCase) &&
            (NormalizeKey(item.Name) == normalized ||
             item.Aliases.Any(alias => NormalizeKey(alias) == normalized)));

        return (catalogItem.Name is not null ? catalogItem.Name : name, proficiency);
    }

    private static bool IsProficiencyDescription(string value)
    {
        var normalized = NormalizeKey(value);
        return normalized is "BASIC" or "BEGINNER" or "CONVERSATIONAL" or "INTERMEDIATE" or "FLUENT" or "NATIVE" ||
               normalized.Contains("FLUENT", StringComparison.Ordinal) ||
               normalized.Contains("FLYTANDE", StringComparison.Ordinal) ||
               normalized.Contains("MODERSMAL", StringComparison.Ordinal) ||
               normalized.Contains("MODERSMÅL", StringComparison.Ordinal) ||
               normalized.Contains("MOTHER TONGUE", StringComparison.Ordinal) ||
               normalized.Contains("NATIVE", StringComparison.Ordinal) ||
               normalized.Contains("PROFICIENT", StringComparison.Ordinal) ||
               normalized.Contains("GODA KUNSKAPER", StringComparison.Ordinal) ||
               normalized.Contains("OBEHINDRAT", StringComparison.Ordinal);
    }

    public async Task EnsureCatalogAsync(CancellationToken ct = default)
    {
        // Seed the approved catalog only on an empty catalog. Admin edits and deletions
        // are authoritative after initial bootstrap and must survive restarts.
        if (await db.Skills.AnyAsync(ct)) return;

        await CatalogSyncGate.WaitAsync(ct);
        try
        {
        foreach (var item in SkillCatalogSeed.Items)
        {
            var normalizedName = NormalizeKey(item.Name);
            var existing = await db.Skills
                .Include(x => x.Aliases)
                .FirstOrDefaultAsync(x => x.NormalizedName == normalizedName, ct);

            if (existing is null)
            {
                existing = await db.Skills
                    .Include(x => x.Aliases)
                    .FirstOrDefaultAsync(x => x.Aliases.Any(alias => alias.NormalizedAlias == normalizedName), ct);

                if (existing is not null)
                {
                    var previousCanonical = existing.CanonicalName;
                    var conflictingAlias = existing.Aliases.FirstOrDefault(alias => alias.NormalizedAlias == normalizedName);
                    if (conflictingAlias is not null)
                    {
                        existing.Aliases.Remove(conflictingAlias);
                        db.SkillAliases.Remove(conflictingAlias);
                    }

                    existing.CanonicalName = item.Name;
                    existing.NormalizedName = normalizedName;
                    existing.Category = item.Category;
                    await AddAliasIfAvailableAsync(existing, previousCanonical, ct);
                }
            }

            if (existing is null)
            {
                existing = new Skill
                {
                    CanonicalName = item.Name,
                    NormalizedName = normalizedName,
                    Category = item.Category
                };
                db.Skills.Add(existing);
            }
            else
            {
                existing.Category = item.Category;
            }

            foreach (var alias in item.Aliases)
                await AddAliasIfAvailableAsync(existing, alias, ct);
        }

        await db.SaveChangesAsync(ct);
        }
        finally
        {
            CatalogSyncGate.Release();
        }
    }

    private async Task AddAliasIfAvailableAsync(Skill skill, string alias, CancellationToken ct)
    {
        var normalizedAlias = NormalizeKey(alias);
        if (normalizedAlias == skill.NormalizedName ||
            skill.Aliases.Any(existing => existing.NormalizedAlias == normalizedAlias))
            return;

        var canonicalConflict = await db.Skills.AnyAsync(
            existing => existing.Id != skill.Id && existing.NormalizedName == normalizedAlias, ct);
        var aliasConflict = await db.SkillAliases.AnyAsync(
            existing => existing.SkillId != skill.Id && existing.NormalizedAlias == normalizedAlias, ct);

        if (canonicalConflict || aliasConflict)
            return;

        skill.Aliases.Add(new SkillAlias
        {
            Alias = alias,
            NormalizedAlias = normalizedAlias
        });
    }

    public async Task NormalizeConsultantLanguagesAsync(IEnumerable<ConsultantLanguage> languages, CancellationToken ct = default)
    {
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var language in languages)
        {
            var normalized = NormalizeHumanLanguage(language.Name, language.Proficiency);
            language.Name = normalized.Name;
            language.Proficiency = normalized.Proficiency;

            var key = NormalizeKey(language.Name);
            if (!seen.Add(key))
            {
                language.Name = "";
                continue;
            }
            var canonical = await db.Skills
                .Include(skill => skill.Aliases)
                .FirstOrDefaultAsync(skill =>
                    skill.Category == "Human language" &&
                    (skill.NormalizedName == key || skill.Aliases.Any(alias => alias.NormalizedAlias == key)), ct);

            if (canonical is not null)
                language.Name = canonical.CanonicalName;
            else
                await RecordSkillSuggestionAsync(language.Name, "Human language", ct);
        }
    }

    public static string NormalizeLanguageProficiency(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return HumanLanguageProficiency.NotSpecified;
        var key = NormalizeKey(value)
            .Replace("Å", "A", StringComparison.Ordinal)
            .Replace("Ä", "A", StringComparison.Ordinal)
            .Replace("Ö", "O", StringComparison.Ordinal);
        if (key is "NOT SPECIFIED" or "NOTSPECIFIED") return HumanLanguageProficiency.NotSpecified;
        if (key is "LOW" or "BASIC" or "BEGINNER" or "ELEMENTARY" or "GRUNDLAGGANDE") return HumanLanguageProficiency.Low;
        if (key is "MEDIUM" or "INTERMEDIATE" or "CONVERSATIONAL" or "MEDEL" or "MEDELNIVA" or "GODA KUNSKAPER") return HumanLanguageProficiency.Medium;
        if (key is "HIGH" or "FLUENT" or "FLYTANDE" or "PROFICIENT") return HumanLanguageProficiency.High;
        if (key is "NATIVE" or "MODERSMAL" or "MOTHER TONGUE") return HumanLanguageProficiency.Native;
        return HumanLanguageProficiency.NotSpecified;
    }

    public async Task RecordSkillSuggestionAsync(string rawName, string category, CancellationToken ct = default)
    {
        var name = Regex.Replace(rawName.Trim(), @"\s+", " ");
        if (string.IsNullOrWhiteSpace(name)) return;
        var key = NormalizeKey(name);
        var suggestion = await db.SkillSuggestions.FirstOrDefaultAsync(item => item.NormalizedName == key, ct);
        if (suggestion is null)
        {
            db.SkillSuggestions.Add(new SkillSuggestion { Name = name, NormalizedName = key, Category = category });
        }
        else
        {
            suggestion.Occurrences++;
            suggestion.LastSeenAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync(ct);
    }

    public async Task NormalizeConsultantSkillsAsync(IList<ConsultantSkill> skills, CancellationToken ct = default)
    {
        foreach (var consultantSkill in skills)
        {
            if (string.IsNullOrWhiteSpace(consultantSkill.Name))
                continue;

            var normalized = NormalizeKey(consultantSkill.Name);
            var skill = await db.Skills.Include(x => x.Aliases)
                .FirstOrDefaultAsync(x => x.NormalizedName == normalized || x.Aliases.Any(a => a.NormalizedAlias == normalized), ct);
            if (skill is null)
            {
                await RecordSkillSuggestionAsync(consultantSkill.Name, consultantSkill.Category ?? "Unclassified", ct);
                consultantSkill.SkillId = null;
                continue;
            }

            consultantSkill.SkillId = skill.Id;
            consultantSkill.Skill = null;
            consultantSkill.Name = skill.CanonicalName;
            consultantSkill.Category = skill.Category;
        }

        var unique = new Dictionary<string, ConsultantSkill>(StringComparer.OrdinalIgnoreCase);
        foreach (var consultantSkill in skills.Where(skill => !string.IsNullOrWhiteSpace(skill.Name)))
        {
            var key = consultantSkill.SkillId is int skillId
                ? $"skill:{skillId}"
                : $"raw:{NormalizeKey(consultantSkill.Name)}";

            if (!unique.TryGetValue(key, out var existing))
            {
                unique[key] = consultantSkill;
                continue;
            }

            if (consultantSkill.Years > existing.Years)
                existing.Years = consultantSkill.Years;
            if (consultantSkill.Level > existing.Level)
                existing.Level = consultantSkill.Level;
            if (string.IsNullOrWhiteSpace(existing.Evidence) && !string.IsNullOrWhiteSpace(consultantSkill.Evidence))
                existing.Evidence = consultantSkill.Evidence;
        }

        skills.Clear();
        foreach (var consultantSkill in unique.Values)
            skills.Add(consultantSkill);
    }

    public async Task NormalizeRequirementsAsync(IEnumerable<AssignmentRequirement> requirements, CancellationToken ct = default)
    {
        foreach (var requirement in requirements)
        {
            if (string.Equals(requirement.Category, "Seniority", StringComparison.OrdinalIgnoreCase))
                continue;
            if (string.IsNullOrWhiteSpace(requirement.Name))
                continue;

            if (string.Equals(requirement.Category, "HumanLanguage", StringComparison.OrdinalIgnoreCase))
            {
                requirement.Proficiency = NormalizeLanguageProficiency(requirement.Proficiency);
                var language = NormalizeHumanLanguage(requirement.Name, null).Name;
                var key = NormalizeKey(language);
                var knownLanguage = await db.Skills
                    .Include(skill => skill.Aliases)
                    .FirstOrDefaultAsync(skill =>
                        skill.Category == "Human language" &&
                        (skill.NormalizedName == key || skill.Aliases.Any(alias => alias.NormalizedAlias == key)), ct);

                if (knownLanguage is null)
                {
                    requirement.SkillId = null;
                    requirement.Skill = null;
                    requirement.Name = language;
                    requirement.Category = "HumanLanguage";
                    await RecordSkillSuggestionAsync(language, "Human language", ct);
                    continue;
                }

                requirement.SkillId = knownLanguage.Id;
                requirement.Skill = null;
                requirement.Name = knownLanguage.CanonicalName;
                requirement.Category = "HumanLanguage";
                continue;
            }

            var normalizedRequirement = NormalizeKey(requirement.Name);
            var skill = await db.Skills.Include(x => x.Aliases)
                .FirstOrDefaultAsync(x => x.NormalizedName == normalizedRequirement || x.Aliases.Any(a => a.NormalizedAlias == normalizedRequirement), ct);
            if (skill is null)
            {
                requirement.SkillId = null;
                requirement.Skill = null;
                requirement.Name = Regex.Replace(requirement.Name.Trim(), @"\s+", " ");
                requirement.Category = "Skill";
                await RecordSkillSuggestionAsync(requirement.Name, "Unclassified", ct);
                continue;
            }

            requirement.SkillId = skill.Id;
            requirement.Skill = null;
            requirement.Name = skill.CanonicalName;
            requirement.Category = "Skill";
        }
    }
}
