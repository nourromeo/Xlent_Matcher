using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using XlentMatch.Api.Data;
using XlentMatch.Api.Models;
using XlentMatch.Api.Services;

namespace XlentMatch.Api.Controllers;

[ApiController]
[Route("api/admin")]
public class AdminController(
    AppDbContext db,
    MatchingWeightsStore matchingWeightsStore,
    IOptions<OpenAiOptions> openAiOptions,
    SkillNormalizationService skillNormalization) : ControllerBase
{
    [HttpGet("overview")]
    public async Task<ActionResult<AdminOverviewDto>> GetOverview(CancellationToken ct)
    {
        await skillNormalization.EnsureCatalogAsync(ct);

        var skills = await db.Skills
            .Include(skill => skill.Aliases)
            .AsNoTracking()
            .OrderBy(skill => skill.CanonicalName)
            .Select(skill => new AdminSkillDto
            {
                Id = skill.Id.ToString(),
                Canonical = skill.CanonicalName,
                Category = skill.Category,
                Aliases = skill.Aliases
                    .OrderBy(alias => alias.Alias)
                    .Select(alias => alias.Alias)
                    .ToList(),
                ConsultantCount = db.ConsultantSkills
                    .Where(link => link.SkillId == skill.Id)
                    .Select(link => link.ConsultantId)
                    .Distinct()
                    .Count()
            })
            .ToListAsync(ct);

        var matching = matchingWeightsStore.Get();
        var ai = openAiOptions.Value;

        return new AdminOverviewDto
        {
            Skills = skills,
            Suggestions = await db.SkillSuggestions.AsNoTracking().OrderByDescending(item => item.Occurrences).Select(item => new AdminSkillSuggestionDto { Id = item.Id, Name = item.Name, Category = item.Category, Occurrences = item.Occurrences, FirstSeenAt = item.FirstSeenAt }).ToListAsync(ct),
            MatchingFactors =
            [
                new() { Key = "mandatory", Label = "Mandatory requirements", Value = matching.MandatoryWeight, Description = "Weight used for mandatory requirement coverage." },
                new() { Key = "desired", Label = "Desired requirements", Value = matching.DesiredWeight, Description = "Weight used for desired requirement coverage." },
                new() { Key = "experience", Label = "Experience", Value = matching.ExperienceWeight, Description = "Weight used for overall years-of-experience coverage." }
            ],
            MissingMandatoryPenalty = matching.MissingMandatoryPenalty,
            Capabilities =
            [
                new()
                {
                    Key = "AzureOpenAiConfigured",
                    Label = "Azure OpenAI",
                    Description = "AI extraction and temporary CV adaptation are available when endpoint, model and API key are configured.",
                    Enabled = !string.IsNullOrWhiteSpace(ai.Endpoint) &&
                              !string.IsNullOrWhiteSpace(ai.Model) &&
                              !string.IsNullOrWhiteSpace(ai.ApiKey)
                },
                new()
                {
                    Key = "CanonicalSkillTaxonomy",
                    Label = "Canonical skill taxonomy",
                    Description = "Consultant skills and assignment requirements are normalized against the central skill catalog.",
                    Enabled = true
                },
                new()
                {
                    Key = "DeterministicMatching",
                    Label = "Deterministic matching",
                    Description = "Match Score is calculated by the backend MatchingService using canonical skill links and explicit weights.",
                    Enabled = true
                },
                new()
                {
                    Key = "PdfTextExtraction",
                    Label = "PDF text extraction",
                    Description = "Text-based PDF and TXT extraction is enabled. OCR for image-only PDFs is not enabled.",
                    Enabled = true
                },
                new()
                {
                    Key = "OriginalPdfStorage",
                    Label = "Original PDF storage",
                    Description = "The MVP does not store the original uploaded PDF file.",
                    Enabled = false
                }
            ]
        };
    }

    [HttpPost("skills")]
    public async Task<ActionResult<AdminSkillDto>> CreateSkill(
        UpdateAdminSkillRequest input,
        CancellationToken ct)
    {
        var canonical = input.CanonicalName?.Trim() ?? "";
        var category = input.Category?.Trim() ?? "";

        if (string.IsNullOrWhiteSpace(canonical))
            return BadRequest("Canonical skill name is required.");

        if (string.IsNullOrWhiteSpace(category))
            return BadRequest("Category is required.");

        var normalizedCanonical = SkillNormalizationService.NormalizeKey(canonical);

        var canonicalConflict = await db.Skills.AnyAsync(
            x => x.NormalizedName == normalizedCanonical, ct);

        var aliasConflict = await db.SkillAliases.AnyAsync(
            x => x.NormalizedAlias == normalizedCanonical, ct);

        if (canonicalConflict || aliasConflict)
            return Conflict("That canonical name is already used by another skill or alias.");

        var requestedAliases = (input.Aliases ?? [])
            .Where(alias => !string.IsNullOrWhiteSpace(alias))
            .Select(alias => alias.Trim())
            .GroupBy(SkillNormalizationService.NormalizeKey)
            .Select(group => group.First())
            .Where(alias => SkillNormalizationService.NormalizeKey(alias) != normalizedCanonical)
            .ToList();

        foreach (var alias in requestedAliases)
        {
            var normalizedAlias = SkillNormalizationService.NormalizeKey(alias);

            var usedAsCanonical = await db.Skills.AnyAsync(
                x => x.NormalizedName == normalizedAlias, ct);

            var usedAsAlias = await db.SkillAliases.AnyAsync(
                x => x.NormalizedAlias == normalizedAlias, ct);

            if (usedAsCanonical || usedAsAlias)
                return Conflict($"Alias '{alias}' is already used by another skill.");
        }

        var skill = new Skill
        {
            CanonicalName = canonical,
            NormalizedName = normalizedCanonical,
            Category = category,
            Aliases = requestedAliases
                .Select(alias => new SkillAlias
                {
                    Alias = alias,
                    NormalizedAlias = SkillNormalizationService.NormalizeKey(alias)
                })
                .ToList()
        };

        db.Skills.Add(skill);
        await db.SaveChangesAsync(ct);

        return Created($"/api/admin/skills/{skill.Id}", new AdminSkillDto
        {
            Id = skill.Id.ToString(),
            Canonical = skill.CanonicalName,
            Category = skill.Category,
            Aliases = skill.Aliases.OrderBy(x => x.Alias).Select(x => x.Alias).ToList(),
            ConsultantCount = 0
        });
    }

    [HttpPut("skills/{id:int}")]
    public async Task<ActionResult<AdminSkillDto>> UpdateSkill(
        int id,
        UpdateAdminSkillRequest input,
        CancellationToken ct)
    {
        var skill = await db.Skills
            .Include(x => x.Aliases)
            .FirstOrDefaultAsync(x => x.Id == id, ct);

        if (skill is null)
            return NotFound();

        var canonical = input.CanonicalName?.Trim() ?? "";
        var category = input.Category?.Trim() ?? "";

        if (string.IsNullOrWhiteSpace(canonical))
            return BadRequest("Canonical skill name is required.");

        if (string.IsNullOrWhiteSpace(category))
            return BadRequest("Category is required.");

        var normalizedCanonical = SkillNormalizationService.NormalizeKey(canonical);

        var canonicalConflict = await db.Skills.AnyAsync(
            x => x.Id != id && x.NormalizedName == normalizedCanonical, ct);

        var aliasConflict = await db.SkillAliases.AnyAsync(
            x => x.SkillId != id && x.NormalizedAlias == normalizedCanonical, ct);

        if (canonicalConflict || aliasConflict)
            return Conflict("That canonical name is already used by another skill or alias.");

        var requestedAliases = (input.Aliases ?? [])
            .Where(alias => !string.IsNullOrWhiteSpace(alias))
            .Select(alias => alias.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Where(alias => SkillNormalizationService.NormalizeKey(alias) != normalizedCanonical)
            .ToList();

        foreach (var alias in requestedAliases)
        {
            var normalizedAlias = SkillNormalizationService.NormalizeKey(alias);

            var usedAsCanonical = await db.Skills.AnyAsync(
                x => x.Id != id && x.NormalizedName == normalizedAlias, ct);

            var usedAsAlias = await db.SkillAliases.AnyAsync(
                x => x.SkillId != id && x.NormalizedAlias == normalizedAlias, ct);

            if (usedAsCanonical || usedAsAlias)
                return Conflict($"Alias '{alias}' is already used by another skill.");
        }

        var previousCanonical = skill.CanonicalName;
        var aliases = requestedAliases.ToList();

        if (!string.Equals(previousCanonical, canonical, StringComparison.OrdinalIgnoreCase))
            aliases.Add(previousCanonical);

        aliases = aliases
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Where(alias => SkillNormalizationService.NormalizeKey(alias) != normalizedCanonical)
            .ToList();

        db.SkillAliases.RemoveRange(skill.Aliases);

        skill.CanonicalName = canonical;
        skill.NormalizedName = normalizedCanonical;
        skill.Category = category;
        skill.Aliases = aliases
            .Select(alias => new SkillAlias
            {
                Alias = alias,
                NormalizedAlias = SkillNormalizationService.NormalizeKey(alias)
            })
            .ToList();

        await db.SaveChangesAsync(ct);

        var consultantCount = await db.ConsultantSkills
            .Where(link => link.SkillId == skill.Id)
            .Select(link => link.ConsultantId)
            .Distinct()
            .CountAsync(ct);

        return new AdminSkillDto
        {
            Id = skill.Id.ToString(),
            Canonical = skill.CanonicalName,
            Category = skill.Category,
            Aliases = skill.Aliases.OrderBy(x => x.Alias).Select(x => x.Alias).ToList(),
            ConsultantCount = consultantCount
        };
    }
    [HttpPost("suggestions/{id:int}/approve")]
    public async Task<IActionResult> ApproveSuggestion(int id, ReviewSkillSuggestionRequest input, CancellationToken ct)
    {
        var suggestion = await db.SkillSuggestions.FirstOrDefaultAsync(item => item.Id == id, ct);
        if (suggestion is null) return NotFound();
        var canonicalName = input.CanonicalName?.Trim();
        var category = input.Category?.Trim();
        if (string.IsNullOrWhiteSpace(canonicalName) || string.IsNullOrWhiteSpace(category)) return BadRequest("Canonical name and category are required.");
        var normalized = SkillNormalizationService.NormalizeKey(canonicalName);
        var skill = await db.Skills.Include(item => item.Aliases)
            .FirstOrDefaultAsync(item => item.NormalizedName == normalized || item.Aliases.Any(alias => alias.NormalizedAlias == normalized), ct);
        if (skill is null)
        {
            skill = new Skill { CanonicalName = canonicalName, NormalizedName = normalized, Category = category };
            db.Skills.Add(skill);
            await db.SaveChangesAsync(ct);
        }
        else skill.Category = category;

        foreach (var alias in (input.Aliases ?? []).Where(x => !string.IsNullOrWhiteSpace(x)))
        {
            var value = alias.Trim();
            var key = SkillNormalizationService.NormalizeKey(value);
            if (key != skill.NormalizedName && !skill.Aliases.Any(x => x.NormalizedAlias == key))
                skill.Aliases.Add(new SkillAlias { Alias = value, NormalizedAlias = key });
        }

        db.SkillSuggestions.Remove(suggestion);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("suggestions/{id:int}")]
    public async Task<IActionResult> DismissSuggestion(int id, CancellationToken ct)
    {
        var suggestion = await db.SkillSuggestions.FindAsync([id], ct);
        if (suggestion is null) return NotFound();
        db.SkillSuggestions.Remove(suggestion);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("skills/{id:int}")]
    public async Task<IActionResult> DeleteSkill(int id, CancellationToken ct)
    {
        var skill = await db.Skills.FindAsync([id], ct);
        if (skill is null) return NotFound();
        var used = await db.ConsultantSkills.AnyAsync(x => x.SkillId == id, ct) || await db.AssignmentRequirements.AnyAsync(x => x.SkillId == id, ct) || await db.SkillAliases.AnyAsync(x => x.SkillId == id, ct);
        if (used) return Conflict("This taxonomy entry is referenced and cannot be deleted.");
        db.Skills.Remove(skill);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPut("matching-weights")]
    public async Task<ActionResult<AdminOverviewDto>> UpdateMatchingWeights(
        UpdateMatchingWeightsRequest input,
        CancellationToken ct)
    {
        try
        {
            await matchingWeightsStore.UpdateAsync(new MatchingWeights
            {
                MandatoryWeight = input.MandatoryWeight,
                DesiredWeight = input.DesiredWeight,
                ExperienceWeight = input.ExperienceWeight,
                MissingMandatoryPenalty = input.MissingMandatoryPenalty
            }, ct);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }

        return await GetOverview(ct);
    }

    [HttpPost("matching-weights/reset")]
    public async Task<ActionResult<AdminOverviewDto>> ResetMatchingWeights(CancellationToken ct)
    {
        await matchingWeightsStore.ResetAsync(ct);
        return await GetOverview(ct);
    }

}

public class UpdateAdminSkillRequest
{
    public string? CanonicalName { get; set; }
    public string? Category { get; set; }
    public List<string>? Aliases { get; set; }
}

public class UpdateMatchingWeightsRequest
{
    public int MandatoryWeight { get; set; }
    public int DesiredWeight { get; set; }
    public int ExperienceWeight { get; set; }
    public int MissingMandatoryPenalty { get; set; }
}

public class AdminOverviewDto
{
    public List<AdminSkillDto> Skills { get; set; } = new();
    public List<AdminSkillSuggestionDto> Suggestions { get; set; } = new();
    public List<AdminMatchingFactorDto> MatchingFactors { get; set; } = new();
    public int MissingMandatoryPenalty { get; set; }
    public List<AdminCapabilityDto> Capabilities { get; set; } = new();
}

public class AdminSkillDto
{
    public string Id { get; set; } = "";
    public string Canonical { get; set; } = "";
    public string Category { get; set; } = "";
    public List<string> Aliases { get; set; } = new();
    public int ConsultantCount { get; set; }
}

public class AdminSkillSuggestionDto
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Category { get; set; } = "Unclassified";
    public int Occurrences { get; set; }
    public DateTime FirstSeenAt { get; set; }
}

public class ReviewSkillSuggestionRequest
{
    public string? CanonicalName { get; set; }
    public string? Category { get; set; }
    public List<string>? Aliases { get; set; }
}

public class AdminMatchingFactorDto
{
    public string Key { get; set; } = "";
    public string Label { get; set; } = "";
    public int Value { get; set; }
    public string Description { get; set; } = "";
}

public class AdminCapabilityDto
{
    public string Key { get; set; } = "";
    public string Label { get; set; } = "";
    public string Description { get; set; } = "";
    public bool Enabled { get; set; }
}
