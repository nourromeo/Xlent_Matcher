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
            var skill = await db.Skills
                .Include(x => x.Aliases)
                .FirstOrDefaultAsync(x =>
                    x.NormalizedName == normalizedName ||
                    x.Aliases.Any(alias => alias.NormalizedAlias == normalizedName),
                    ct);

            if (skill is null)
            {
                skill = new Skill
                {
                    CanonicalName = item.Name,
                    NormalizedName = normalizedName,
                    Category = item.Category
                };
                db.Skills.Add(skill);
                await db.SaveChangesAsync(ct);
            }

            foreach (var alias in item.Aliases)
            {
                var normalizedAlias = NormalizeKey(alias);
                if (skill.Aliases.Any(x => x.NormalizedAlias == normalizedAlias))
                    continue;

                var usedElsewhere = await db.SkillAliases.AnyAsync(
                    x => x.SkillId != skill.Id && x.NormalizedAlias == normalizedAlias, ct);
                var isAnotherCanonical = await db.Skills.AnyAsync(
                    x => x.Id != skill.Id && x.NormalizedName == normalizedAlias, ct);

                if (usedElsewhere || isAnotherCanonical)
                    continue;

                skill.Aliases.Add(new SkillAlias
                {
                    Alias = alias,
                    NormalizedAlias = normalizedAlias
                });
            }
        }

        await db.SaveChangesAsync(ct);
    }

    public async Task<Skill> ResolveAsync(string rawName, CancellationToken ct = default)
    {
        var normalized = NormalizeKey(rawName);

        var skill = await db.Skills
            .Include(x => x.Aliases)
            .FirstOrDefaultAsync(x =>
                x.NormalizedName == normalized ||
                x.Aliases.Any(alias => alias.NormalizedAlias == normalized),
                ct);

        if (skill is not null)
            return skill;

        skill = new Skill
        {
            CanonicalName = Regex.Replace(rawName.Trim(), @"\s+", " "),
            NormalizedName = normalized,
            Category = "Unclassified"
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

            var skill = await ResolveAsync(requirement.Name, ct);
            requirement.SkillId = skill.Id;
            requirement.Skill = null;
            requirement.Name = skill.CanonicalName;
        }
    }
}
