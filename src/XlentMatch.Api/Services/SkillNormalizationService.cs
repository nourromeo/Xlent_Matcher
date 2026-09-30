using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using XlentMatch.Api.Data;
using XlentMatch.Api.Models;

namespace XlentMatch.Api.Services;

public class SkillNormalizationService(AppDbContext db)
{
    public static string NormalizeKey(string value)
    {
        var collapsed = Regex.Replace(value.Trim(), @"\s+", " ");
        return collapsed.ToUpperInvariant();
    }

    public async Task EnsureCatalogAsync(CancellationToken ct = default)
    {
        foreach (var item in SkillCatalogSeed.Items)
        {
            var normalizedName = NormalizeKey(item.Name);
            var existing = await db.Skills
                .Include(x => x.Aliases)
                .FirstOrDefaultAsync(x =>
                    x.NormalizedName == normalizedName ||
                    x.Aliases.Any(alias => alias.NormalizedAlias == normalizedName),
                    ct);

            // Seed defaults only when the canonical skill does not exist.
            // Admin changes are the source of truth after a skill has been created.
            if (existing is not null)
                continue;

            db.Skills.Add(new Skill
            {
                CanonicalName = item.Name,
                NormalizedName = normalizedName,
                Category = item.Category,
                Aliases = item.Aliases
                    .Select(alias => new SkillAlias
                    {
                        Alias = alias,
                        NormalizedAlias = NormalizeKey(alias)
                    })
                    .ToList()
            });
        }

        await db.SaveChangesAsync(ct);
    }

    public async Task<Skill> ResolveAsync(string rawName, CancellationToken ct = default, string? category = null)
    {
        var normalized = NormalizeKey(rawName);

        var skill = await db.Skills
            .Include(x => x.Aliases)
            .FirstOrDefaultAsync(x =>
                x.NormalizedName == normalized ||
                x.Aliases.Any(alias => alias.NormalizedAlias == normalized),
                ct);

        if (skill is not null)
        {
            if (string.Equals(category, "Human language", StringComparison.OrdinalIgnoreCase) &&
                string.Equals(skill.Category, "Unclassified", StringComparison.OrdinalIgnoreCase))
                skill.Category = category;
            return skill;
        }

        skill = new Skill
        {
            CanonicalName = Regex.Replace(rawName.Trim(), @"\s+", " "),
            NormalizedName = normalized,
            Category = string.IsNullOrWhiteSpace(category) ? "Unclassified" : category
        };

        db.Skills.Add(skill);
        await db.SaveChangesAsync(ct);
        return skill;
    }

    public async Task NormalizeConsultantSkillsAsync(IEnumerable<ConsultantSkill> skills, CancellationToken ct = default)
    {
        foreach (var consultantSkill in skills)
        {
            if (string.IsNullOrWhiteSpace(consultantSkill.Name))
                continue;

            var skill = await ResolveAsync(consultantSkill.Name, ct);
            consultantSkill.SkillId = skill.Id;
            consultantSkill.Skill = null;
            consultantSkill.Name = skill.CanonicalName;
            consultantSkill.Category = skill.Category;
        }
    }

    public async Task NormalizeRequirementsAsync(IEnumerable<AssignmentRequirement> requirements, CancellationToken ct = default)
    {
        foreach (var requirement in requirements)
        {
            if (string.IsNullOrWhiteSpace(requirement.Name))
                continue;

            var category = string.Equals(requirement.Category, "HumanLanguage", StringComparison.OrdinalIgnoreCase)
                ? "Human language"
                : null;
            var skill = await ResolveAsync(requirement.Name, ct, category);
            requirement.SkillId = skill.Id;
            requirement.Skill = null;
            requirement.Name = skill.CanonicalName;
        }
    }
}
