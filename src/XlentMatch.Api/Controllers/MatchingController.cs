using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using XlentMatch.Api.Data;
using XlentMatch.Api.DTOs.Matching;
using XlentMatch.Api.Models;
using XlentMatch.Api.Services;

namespace XlentMatch.Api.Controllers;

[ApiController]
[Route("api/matching")]
public class MatchingController(AppDbContext db, MatchingService matching) : ControllerBase
{
    [HttpPost("run")]
    public async Task<ActionResult<List<MatchResult>>> Run(RunMatchingRequestDto request, CancellationToken ct)
    {
        if (request.ConsultantIds.Count == 0)
            return BadRequest("Select at least one consultant before running matching.");

        var assignment = await db.Assignments.Include(a => a.Requirements)
            .AsNoTracking().FirstOrDefaultAsync(a => a.Id == request.AssignmentId, ct);
        if (assignment is null) return NotFound($"Assignment {request.AssignmentId} not found.");

        if (assignment.Requirements.Count == 0)
            return BadRequest("The assignment has no requirements to match.");

        var consultants = await db.Consultants
            .Include(c => c.Skills)
            .Include(c => c.Projects)
            .Include(c => c.Certifications)
            .Include(c => c.Experiences)
            .Where(c => request.ConsultantIds.Contains(c.Id))
            .AsNoTracking()
            .ToListAsync(ct);

        if (consultants.Count == 0)
            return BadRequest("No consultants found for the given ids.");

        var results = matching.MatchAndRank(assignment, consultants);

        var old = await db.MatchResults
            .Where(m => m.AssignmentId == assignment.Id && request.ConsultantIds.Contains(m.ConsultantId))
            .ToListAsync(ct);

        db.MatchResults.RemoveRange(old);
        db.MatchResults.AddRange(results);

        var trackedAssignment = await db.Assignments.FirstAsync(a => a.Id == assignment.Id, ct);
        trackedAssignment.Status = AssignmentStatus.Done;

        await db.SaveChangesAsync(ct);

        return results;
    }

    [HttpGet("assignment/{assignmentId:int}")]
    public async Task<ActionResult<List<MatchResult>>> GetForAssignment(int assignmentId, CancellationToken ct) =>
        await db.MatchResults
            .Include(m => m.Details)
            .Where(m => m.AssignmentId == assignmentId)
            .OrderByDescending(m => m.Score)
            .AsNoTracking()
            .ToListAsync(ct);
}
