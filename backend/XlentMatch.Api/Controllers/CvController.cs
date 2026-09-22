using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using XlentMatch.Api.Application;
using XlentMatch.Api.Domain;
using XlentMatch.Api.Infrastructure;

namespace XlentMatch.Api.Controllers;

[ApiController]
[Route("api/cv")]
public class CvController(AppDbContext db, IAiTextService ai) : ControllerBase
{
    /// <summary>AI suggestion for adapting a consultant's CV to an assignment. Nothing is saved.</summary>
    [HttpPost("suggest")]
    public async Task<ActionResult<CvAdaptationSuggestion>> Suggest(CvSuggestionRequest request, CancellationToken ct)
    {
        var consultant = await db.Consultants
            .Include(c => c.Skills).Include(c => c.Experiences)
            .Include(c => c.Projects).Include(c => c.Certifications)
            .AsNoTracking().FirstOrDefaultAsync(c => c.Id == request.ConsultantId, ct);
        if (consultant is null) return NotFound("Consultant not found.");

        var assignment = await db.Assignments.Include(a => a.Requirements)
            .AsNoTracking().FirstOrDefaultAsync(a => a.Id == request.AssignmentId, ct);
        if (assignment is null) return NotFound("Assignment not found.");

        var match = await db.MatchResults.Include(m => m.Details)
            .Where(m => m.AssignmentId == request.AssignmentId && m.ConsultantId == request.ConsultantId)
            .OrderByDescending(m => m.CreatedAt)
            .AsNoTracking().FirstOrDefaultAsync(ct);

        return await ai.SuggestCvAdaptationAsync(consultant, assignment, match, ct);
    }

    /// <summary>Saves a user-approved adapted CV as a separate version. The original CV is never modified.</summary>
    [HttpPost("adapted")]
    public async Task<ActionResult<AdaptedCv>> SaveAdapted(SaveAdaptedCvRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Content)) return BadRequest("Content is required.");
        if (!await db.Consultants.AnyAsync(c => c.Id == request.ConsultantId, ct)) return NotFound("Consultant not found.");
        if (!await db.Assignments.AnyAsync(a => a.Id == request.AssignmentId, ct)) return NotFound("Assignment not found.");

        var adapted = new AdaptedCv
        {
            ConsultantId = request.ConsultantId,
            AssignmentId = request.AssignmentId,
            Content = request.Content
        };

        db.AdaptedCvs.Add(adapted);
        await db.SaveChangesAsync(ct);
        return Created($"/api/cv/adapted/{adapted.Id}", adapted);
    }

    [HttpGet("adapted/{id:int}")]
    public async Task<ActionResult<AdaptedCv>> GetAdapted(int id, CancellationToken ct)
    {
        var cv = await db.AdaptedCvs.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return cv is null ? NotFound() : cv;
    }

    [HttpGet("adapted/consultant/{consultantId:int}")]
    public async Task<ActionResult<List<AdaptedCv>>> GetAdaptedForConsultant(int consultantId, CancellationToken ct) =>
        await db.AdaptedCvs.Where(x => x.ConsultantId == consultantId)
            .OrderByDescending(x => x.CreatedAt).AsNoTracking().ToListAsync(ct);
}
