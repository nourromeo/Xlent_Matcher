using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using XlentMatch.Api.Domain;
using XlentMatch.Api.Infrastructure;

namespace XlentMatch.Api.Controllers;

[ApiController]
[Route("api/consultants")]
public class ConsultantsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<Consultant>>> GetAll(CancellationToken ct) =>
        await db.Consultants.Include(c => c.Skills).AsNoTracking().ToListAsync(ct);

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Consultant>> GetById(int id, CancellationToken ct)
    {
        var consultant = await LoadFull(id, ct);
        return consultant is null ? NotFound() : consultant;
    }

    [HttpPost]
    public async Task<ActionResult<Consultant>> Create(Consultant consultant, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(consultant.FirstName))
            return BadRequest("FirstName is required.");

        consultant.Id = 0;
        db.Consultants.Add(consultant);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetById), new { id = consultant.Id }, consultant);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<Consultant>> Update(int id, Consultant input, CancellationToken ct)
    {
        var existing = await LoadFull(id, ct, track: true);
        if (existing is null) return NotFound();

        existing.FirstName = input.FirstName;
        existing.LastName = input.LastName;
        existing.Email = input.Email;
        existing.Title = input.Title;
        existing.Summary = input.Summary;
        existing.YearsOfExperience = input.YearsOfExperience;
        existing.OriginalCvText = input.OriginalCvText;

        // Replace child collections. Removed items are deleted by EF (required FK).
        input.Skills.ForEach(x => x.Id = 0);
        input.Experiences.ForEach(x => x.Id = 0);
        input.Projects.ForEach(x => x.Id = 0);
        input.Certifications.ForEach(x => x.Id = 0);
        existing.Skills = input.Skills;
        existing.Experiences = input.Experiences;
        existing.Projects = input.Projects;
        existing.Certifications = input.Certifications;

        await db.SaveChangesAsync(ct);
        return existing;
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var consultant = await db.Consultants.FindAsync([id], ct);
        if (consultant is null) return NotFound();
        db.Consultants.Remove(consultant);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private Task<Consultant?> LoadFull(int id, CancellationToken ct, bool track = false)
    {
        IQueryable<Consultant> query = db.Consultants
            .Include(c => c.Skills)
            .Include(c => c.Experiences)
            .Include(c => c.Projects)
            .Include(c => c.Certifications);

        if (!track) query = query.AsNoTracking();

        return query.FirstOrDefaultAsync(c => c.Id == id, ct);
    }
}
