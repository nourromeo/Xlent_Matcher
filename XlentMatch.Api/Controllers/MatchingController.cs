using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using XlentMatch.Api.Application;
using XlentMatch.Api.Domain;
using XlentMatch.Api.Infrastructure;

namespace XlentMatch.Api.Controllers;

[ApiController]
[Route("api/matching")]
public class MatchingController(AppDbContext db, MatchingService matching) : ControllerBase
{
    /// <summary>Runs matching for one assignment against selected consultants and stores the results.</summary>
    [HttpPost("run")]
    public async Task<ActionResult<List<MatchResult>>> Run(RunMatchingRequest request, CancellationToken ct)
    {
        var assignment = await db.Assignments.Include(a => a.Requirements)
            .AsNoTracking().FirstOrDefaultAsync(a => a.Id == request.AssignmentId, ct);
        if (assignment is null) return NotFound($"Assignment {request.AssignmentId} not found.");

        var consultants = await db.Consultants
            .Include(c => c.Skills)
            .Include(c => c.Projects)
            .Include(c => c.Certifications)
            .Include(c => c.Experiences)
            .Where(c => request.ConsultantIds.Contains(c.Id))
            .AsNoTracking()
            .ToListAsync(ct);

        if (consultants.Count == 0) return BadRequest("No consultants found for the given ids.");

        var results = matching.MatchAndRank(assignment, consultants);

        // Keep only the latest run per assignment + consultant.
        var old = await db.MatchResults
            .Where(m => m.AssignmentId == assignment.Id && request.ConsultantIds.Contains(m.ConsultantId))
            .ToListAsync(ct);
        db.MatchResults.RemoveRange(old);

        db.MatchResults.AddRange(results);
        await db.SaveChangesAsync(ct);

        return results;
    }

    /// <summary>Returns stored results for an assignment, ranked.</summary>
    [HttpGet("assignment/{assignmentId:int}")]
    public async Task<ActionResult<List<MatchResult>>> GetForAssignment(int assignmentId, CancellationToken ct) =>
        await db.MatchResults
            .Include(m => m.Details)
            .Where(m => m.AssignmentId == assignmentId)
            .OrderByDescending(m => m.Score)
            .AsNoTracking()
            .ToListAsync(ct);
}
