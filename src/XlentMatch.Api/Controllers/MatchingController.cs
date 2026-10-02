using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using XlentMatch.Api.Data;
using XlentMatch.Api.DTOs.Matching;
using XlentMatch.Api.Models;
using XlentMatch.Api.Services;

namespace XlentMatch.Api.Controllers;

[ApiController]
[Route("api/matching")]
public class MatchingController(AppDbContext db, MatchingService matching, ConsultantAvailabilityService availability) : ControllerBase
{
    [HttpPost("run")]
    public async Task<ActionResult<List<MatchResult>>> Run(RunMatchingRequestDto request, CancellationToken ct)
    {
        await availability.ResolveExpiredAsync(ct);
        if (request.ConsultantIds.Count == 0)
            return BadRequest("Select at least one consultant before running matching.");

        var assignment = await db.Assignments
            .Include(a => a.Requirements).ThenInclude(r => r.Skill)
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == request.AssignmentId, ct);
        if (assignment is null) return NotFound($"Assignment {request.AssignmentId} not found.");

        if (assignment.Requirements.Count == 0)
            return BadRequest("The assignment has no requirements to match.");

        var consultants = await db.Consultants
            .Include(c => c.Skills).ThenInclude(s => s.Skill)
            .Include(c => c.Projects)
            .Include(c => c.Certifications)
            .Include(c => c.Languages)
            .Include(c => c.Experiences)
            .Where(c => request.ConsultantIds.Contains(c.Id))
            .AsSplitQuery()
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
    public async Task<ActionResult<List<MatchResult>>> GetForAssignment(int assignmentId, CancellationToken ct)
    {
        var assignment = await db.Assignments
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == assignmentId, ct);
        if (assignment is null) return NotFound();

        var results = await db.MatchResults
            .Include(m => m.Details)
            .Where(m => m.AssignmentId == assignmentId)
            .OrderByDescending(m => m.Score)
            .AsNoTracking()
            .ToListAsync(ct);

        var consultantIds = results.Select(result => result.ConsultantId).Distinct().ToList();
        var consultants = await db.Consultants
            .Where(consultant => consultantIds.Contains(consultant.Id))
            .AsNoTracking()
            .ToDictionaryAsync(consultant => consultant.Id, ct);

        foreach (var result in results)
        {
            result.ScoreAvailable = result.TotalWeight > 0;
            if (consultants.TryGetValue(result.ConsultantId, out var consultant))
                result.ContextDetails = matching.BuildContextDetails(assignment, consultant);
        }

        return results;
    }
}
