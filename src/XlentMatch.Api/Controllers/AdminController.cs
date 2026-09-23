using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using XlentMatch.Api.Data;
using XlentMatch.Api.Services;

namespace XlentMatch.Api.Controllers;

[ApiController]
[Route("api/admin")]
public class AdminController(
    AppDbContext db,
    IOptions<MatchingOptions> matchingOptions,
    IOptions<OpenAiOptions> openAiOptions) : ControllerBase
{
    [HttpGet("overview")]
    public async Task<ActionResult<AdminOverviewDto>> GetOverview(CancellationToken ct)
    {
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

        var matching = matchingOptions.Value;
        var ai = openAiOptions.Value;

        return new AdminOverviewDto
        {
            Skills = skills,
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
}

public class AdminOverviewDto
{
    public List<AdminSkillDto> Skills { get; set; } = new();
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
