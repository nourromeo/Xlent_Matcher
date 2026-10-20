using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using XlentMatch.Api.Data;
using XlentMatch.Api.Models;
using XlentMatch.Api.Services;

namespace XlentMatch.Api.Controllers;

[ApiController]
[Route("api/assignments")]
public class AssignmentsController(AppDbContext db, SkillNormalizationService skills) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<Assignment>>> GetAll(CancellationToken ct) =>
        await db.Assignments
            .Include(a => a.Requirements).ThenInclude(r => r.Skill)
            .AsNoTracking()
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync(ct);

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Assignment>> GetById(int id, CancellationToken ct)
    {
        var assignment = await db.Assignments
            .Include(a => a.Requirements).ThenInclude(r => r.Skill)
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id, ct);

        return assignment is null ? NotFound() : assignment;
    }

    [HttpPost]
    public async Task<ActionResult<Assignment>> Create(Assignment assignment, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(assignment.Title))
            return BadRequest("Title is required.");

        if (string.IsNullOrWhiteSpace(assignment.CustomerName))
            return BadRequest("CustomerName is required.");

        assignment.Requirements = assignment.Requirements
            .Where(r => !string.IsNullOrWhiteSpace(r.Name))
            .ToList();

        EnsureLegacySeniorityRequirement(assignment);

        if (assignment.Requirements.Count == 0)
            return BadRequest("At least one assignment requirement is required.");

        var validation = ValidateRequirements(assignment.Requirements, assignment.MinYearsExperience);
        if (validation is not null) return BadRequest(validation);

        assignment.Id = 0;
        assignment.Status = AssignmentStatus.Draft;
        assignment.CreatedAt = DateTime.UtcNow;
        assignment.UpdatedAt = assignment.CreatedAt;

        foreach (var requirement in assignment.Requirements)
        {
            requirement.Id = 0;
            requirement.AssignmentId = 0;
            requirement.SkillId = string.Equals(requirement.Category, "Seniority", StringComparison.OrdinalIgnoreCase) ? null : 0;
            requirement.Skill = null;
        }

        await skills.NormalizeRequirementsAsync(assignment.Requirements, ct);
        var duplicateError = ValidateDuplicateRequirements(assignment.Requirements);
        if (duplicateError is not null) return BadRequest(duplicateError);

        db.Assignments.Add(assignment);
        await db.SaveChangesAsync(ct);

        var created = await db.Assignments
            .Include(a => a.Requirements).ThenInclude(r => r.Skill)
            .AsNoTracking()
            .FirstAsync(a => a.Id == assignment.Id, ct);
        return CreatedAtAction(nameof(GetById), new { id = assignment.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<Assignment>> Update(int id, Assignment input, CancellationToken ct)
    {
        var existing = await db.Assignments
            .Include(a => a.Requirements)
            .FirstOrDefaultAsync(a => a.Id == id, ct);

        if (existing is null)
            return NotFound();

        if (string.IsNullOrWhiteSpace(input.Title))
            return BadRequest("Title is required.");

        if (string.IsNullOrWhiteSpace(input.CustomerName))
            return BadRequest("CustomerName is required.");

        input.Requirements = input.Requirements
            .Where(r => !string.IsNullOrWhiteSpace(r.Name))
            .Select(requirement => new AssignmentRequirement
            {
                Name = requirement.Name,
                Type = requirement.Type,
                MinYears = requirement.MinYears,
                MinLevel = requirement.MinLevel,
                Proficiency = requirement.Proficiency,
                MatchMode = requirement.MatchMode,
                MaximumSeniority = requirement.MaximumSeniority,
                Category = requirement.Category
            })
            .ToList();

        EnsureLegacySeniorityRequirement(input);

        if (input.Requirements.Count == 0)
            return BadRequest("At least one assignment requirement is required.");

        var validation = ValidateRequirements(input.Requirements, input.MinYearsExperience);
        if (validation is not null) return BadRequest(validation);

        await skills.NormalizeRequirementsAsync(input.Requirements, ct);
        var duplicateError = ValidateDuplicateRequirements(input.Requirements);
        if (duplicateError is not null) return BadRequest(duplicateError);

        existing.CustomerName = input.CustomerName.Trim();
        existing.Title = input.Title.Trim();
        existing.Description = input.Description;
        existing.Seniority = input.Seniority;
        existing.MinYearsExperience = input.MinYearsExperience;
        existing.Availability = input.Availability;
        existing.RequiredStartDate = input.RequiredStartDate;
        existing.StartDateDescription = input.StartDateDescription?.Trim();
        existing.Location = input.Location;
        existing.UpdatedAt = DateTime.UtcNow;
        // Any meaningful edit invalidates the previous matching snapshot.
        existing.Status = AssignmentStatus.Draft;

        var oldMatches = await db.MatchResults.Where(m => m.AssignmentId == id).ToListAsync(ct);
        db.MatchResults.RemoveRange(oldMatches);
        db.AssignmentRequirements.RemoveRange(existing.Requirements);
        existing.Requirements = input.Requirements;

        await db.SaveChangesAsync(ct);

        return await db.Assignments
            .Include(a => a.Requirements).ThenInclude(r => r.Skill)
            .AsNoTracking()
            .FirstAsync(a => a.Id == id, ct);
    }

    private static string? ValidateRequirements(IEnumerable<AssignmentRequirement> requirements, int minYearsExperience)
    {
        if (minYearsExperience < 0) return "Minimum experience cannot be negative.";
        foreach (var requirement in requirements)
        {
            if (!Enum.IsDefined(requirement.Type))
                return $"Requirement '{requirement.Name}' has an invalid type.";

            if (!new[] { "Skill", "HumanLanguage", "Seniority" }
                .Contains(requirement.Category, StringComparer.OrdinalIgnoreCase))
                return $"Requirement '{requirement.Name}' has an invalid category.";

            if (!Enum.IsDefined(requirement.MatchMode))
                return $"Requirement '{requirement.Name}' has an invalid Seniority matching mode.";

            if (requirement.MinYears < 0) return $"Minimum years for '{requirement.Name}' cannot be negative.";
            if (string.Equals(requirement.Category, "Seniority", StringComparison.OrdinalIgnoreCase))
            {
                if (requirement.MatchMode == SeniorityMatchMode.Range && string.IsNullOrWhiteSpace(requirement.MaximumSeniority))
                    return "A Seniority range requires a maximum Seniority.";
                if (SeniorityLevel(requirement.Name) is null || (requirement.MatchMode == SeniorityMatchMode.Range && SeniorityLevel(requirement.MaximumSeniority) is null))
                    return $"Seniority requirement '{requirement.Name}' is invalid.";
                if (requirement.MatchMode == SeniorityMatchMode.Range && SeniorityLevel(requirement.Name) > SeniorityLevel(requirement.MaximumSeniority))
                    return "Minimum Seniority cannot be higher than maximum Seniority.";
                continue;
            }
            var isLanguage = string.Equals(requirement.Category, "HumanLanguage", StringComparison.OrdinalIgnoreCase);
            var maximumLevel = 5;
            if (isLanguage && requirement.Proficiency is not null && !HumanLanguageProficiency.Values.Contains(requirement.Proficiency))
                return $"Language '{requirement.Name}' has an invalid proficiency level.";
            if (requirement.MinLevel is < 1 || requirement.MinLevel > maximumLevel)
                return $"Minimum level for '{requirement.Name}' must be between 1 and {maximumLevel}.";
            if (string.Equals(requirement.Category, "HumanLanguage", StringComparison.OrdinalIgnoreCase) && requirement.MinYears is not null)
                return $"Minimum skill years cannot be set for human language '{requirement.Name}'.";
        }
        return null;
    }

    private static string? ValidateDuplicateRequirements(IEnumerable<AssignmentRequirement> requirements)
    {
        var duplicate = requirements
            .GroupBy(requirement => RequirementKey(requirement), StringComparer.OrdinalIgnoreCase)
            .FirstOrDefault(group => group.Count() > 1);
        return duplicate is null
            ? null
            : $"Duplicate assignment requirement '{duplicate.First().Name}' is not allowed.";
    }

    private static string RequirementKey(AssignmentRequirement requirement)
    {
        var identity = requirement.SkillId is not null
            ? $"skill:{requirement.SkillId}"
            : $"{requirement.Category}:{Normalize(requirement.Name)}";
        return string.Join("|", identity, requirement.Type, requirement.MinYears, requirement.MinLevel,
            Normalize(requirement.Proficiency), requirement.MatchMode, Normalize(requirement.MaximumSeniority));
    }

    private static string Normalize(string? value) =>
        string.Join(" ", (value ?? "").Trim().ToLowerInvariant().Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));

    private static int? SeniorityLevel(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "junior" => 1,
        "mid" => 2,
        "senior" => 3,
        "staff" => 4,
        _ => null
    };

    private static void EnsureLegacySeniorityRequirement(Assignment assignment)
    {
        if (string.IsNullOrWhiteSpace(assignment.Seniority) ||
            assignment.Requirements.Any(r => string.Equals(r.Category, "Seniority", StringComparison.OrdinalIgnoreCase)))
            return;

        assignment.Requirements.Add(new AssignmentRequirement
        {
            Name = assignment.Seniority.Trim(),
            Category = "Seniority",
            Type = RequirementType.Mandatory,
            MatchMode = SeniorityMatchMode.Exact
        });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var assignment = await db.Assignments.FindAsync([id], ct);
        if (assignment is null)
            return NotFound();

        var matchResults = await db.MatchResults
            .Where(m => m.AssignmentId == id)
            .ToListAsync(ct);

        db.MatchResults.RemoveRange(matchResults);
        db.Assignments.Remove(assignment);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
