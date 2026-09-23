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

        assignment.Id = 0;
        assignment.CreatedAt = DateTime.UtcNow;

        foreach (var requirement in assignment.Requirements)
        {
            requirement.Id = 0;
            requirement.AssignmentId = 0;
            requirement.SkillId = null;
            requirement.Skill = null;
        }

        await skills.NormalizeRequirementsAsync(assignment.Requirements, ct);

        db.Assignments.Add(assignment);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetById), new { id = assignment.Id }, assignment);
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
                MinLevel = requirement.MinLevel
            })
            .ToList();

        if (input.Requirements.Count == 0)
            return BadRequest("At least one assignment requirement is required.");

        await skills.NormalizeRequirementsAsync(input.Requirements, ct);

        existing.CustomerName = input.CustomerName.Trim();
        existing.Title = input.Title.Trim();
        existing.Description = input.Description;
        existing.Seniority = input.Seniority;
        existing.MinYearsExperience = input.MinYearsExperience;
        existing.Availability = input.Availability;
        existing.Status = input.Status;

        db.AssignmentRequirements.RemoveRange(existing.Requirements);
        existing.Requirements = input.Requirements;

        await db.SaveChangesAsync(ct);

        return await db.Assignments
            .Include(a => a.Requirements).ThenInclude(r => r.Skill)
            .AsNoTracking()
            .FirstAsync(a => a.Id == id, ct);
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
