using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using XlentMatch.Api.Data;
using XlentMatch.Api.Models;

namespace XlentMatch.Api.Controllers;

[ApiController]
[Route("api/assignments")]
public class AssignmentsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<Assignment>>> GetAll(CancellationToken ct) =>
        await db.Assignments.Include(a => a.Requirements).AsNoTracking().ToListAsync(ct);

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Assignment>> GetById(int id, CancellationToken ct)
    {
        var assignment = await db.Assignments.Include(a => a.Requirements)
            .AsNoTracking().FirstOrDefaultAsync(a => a.Id == id, ct);
        return assignment is null ? NotFound() : assignment;
    }

    [HttpPost]
    public async Task<ActionResult<Assignment>> Create(Assignment assignment, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(assignment.Title))
            return BadRequest("Title is required.");

        assignment.Id = 0;
        db.Assignments.Add(assignment);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetById), new { id = assignment.Id }, assignment);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<Assignment>> Update(int id, Assignment input, CancellationToken ct)
    {
        var existing = await db.Assignments.Include(a => a.Requirements)
            .FirstOrDefaultAsync(a => a.Id == id, ct);
        if (existing is null) return NotFound();

        existing.CustomerName = input.CustomerName;
        existing.Title = input.Title;
        existing.Description = input.Description;
        existing.Seniority = input.Seniority;
        existing.MinYearsExperience = input.MinYearsExperience;
        existing.Availability = input.Availability;
        existing.Status = input.Status;

        input.Requirements.ForEach(r => r.Id = 0);
        existing.Requirements = input.Requirements;

        await db.SaveChangesAsync(ct);
        return existing;
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var assignment = await db.Assignments.FindAsync([id], ct);
        if (assignment is null) return NotFound();

        db.Assignments.Remove(assignment);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
