using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using XlentMatch.Api.Data;
using XlentMatch.Api.DTOs.Cv;
using XlentMatch.Api.Services;

namespace XlentMatch.Api.Controllers;

[ApiController]
[Route("api/cv")]
public class CvController(AppDbContext db, IAiTextService ai) : ControllerBase
{
    [HttpPost("suggest")]
    public async Task<ActionResult<CvAdaptationSuggestionDto>> Suggest(
        CvSuggestionRequestDto request,
        CancellationToken ct)
    {
        var consultant = await db.Consultants
            .Include(c => c.Skills)
            .Include(c => c.Experiences)
            .Include(c => c.Projects)
            .Include(c => c.Education)
            .Include(c => c.Languages)
            .Include(c => c.Industries)
            .Include(c => c.Certifications)
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == request.ConsultantId, ct);

        if (consultant is null) return NotFound("Consultant not found.");

        var assignment = await db.Assignments
            .Include(a => a.Requirements)
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == request.AssignmentId, ct);

        if (assignment is null) return NotFound("Assignment not found.");

        var match = await db.MatchResults
            .Include(m => m.Details)
            .Where(m => m.AssignmentId == request.AssignmentId && m.ConsultantId == request.ConsultantId)
            .OrderByDescending(m => m.CreatedAt)
            .AsNoTracking()
            .FirstOrDefaultAsync(ct);

        return await ai.SuggestCvAdaptationAsync(consultant, assignment, match, ct);
    }

    [HttpPost("suggest-temporary")]
    public async Task<ActionResult<CvAdaptationSuggestionDto>> SuggestTemporary(
        TemporaryCvSuggestionRequestDto request,
        CancellationToken ct)
    {
        if (request.Consultant is null)
            return BadRequest("Consultant input is required.");

        if (request.Assignment is null)
            return BadRequest("Assignment input is required.");

        return await ai.SuggestCvAdaptationAsync(request.Consultant, request.Assignment, ct);
    }
}
