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

        if (assignment.Requirements.Count == 0)
            return BadRequest("At least one assignment requirement is required.");

        var validation = ValidateRequirements(assignment.Requirements, assignment.MinYearsExperience);
        if (validation is not null) return BadRequest(validation);

        assignment.Id = 0;
        assignment.CreatedAt = DateTime.UtcNow;

        foreach (var requirement in assignment.Requirements)
        {
            requirement.Id = 0;
            requirement.AssignmentId = 0;
            requirement.SkillId = 0;
            requirement.Skill = null;
        }

        await skills.NormalizeRequirementsAsync(assignment.Requirements, ct);

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
                Category = requirement.Category
            })
            .ToList();

        if (input.Requirements.Count == 0)
            return BadRequest("At least one assignment requirement is required.");

        var validation = ValidateRequirements(input.Requirements, input.MinYearsExperience);
        if (validation is not null) return BadRequest(validation);

        await skills.NormalizeRequirementsAsync(input.Requirements, ct);

        existing.CustomerName = input.CustomerName.Trim();
        existing.Title = input.Title.Trim();
        existing.Description = input.Description;
        existing.Seniority = input.Seniority;
        existing.MinYearsExperience = input.MinYearsExperience;
        existing.Availability = input.Availability;
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
            if (requirement.MinYears < 0) return $"Minimum years for '{requirement.Name}' cannot be negative.";
            if (requirement.MinLevel is < 1 or > 6) return $"Minimum level for '{requirement.Name}' must be between 1 and 6.";
            if (string.Equals(requirement.Category, "HumanLanguage", StringComparison.OrdinalIgnoreCase) && requirement.MinYears is not null)
                return $"Minimum skill years cannot be set for human language '{requirement.Name}'.";
        }
        return null;
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
