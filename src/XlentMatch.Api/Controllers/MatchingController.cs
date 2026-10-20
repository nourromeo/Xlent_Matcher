using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using System.Text;
using Microsoft.EntityFrameworkCore;
using XlentMatch.Api.Data;
using XlentMatch.Api.DTOs.Matching;
using XlentMatch.Api.Models;
using XlentMatch.Api.Services;

namespace XlentMatch.Api.Controllers;

[ApiController]
[Route("api/matching")]
public class MatchingController(AppDbContext db, MatchingService matching, ConsultantAvailabilityService availability, IWebHostEnvironment environment, IPdfTextExtractor pdf, IAiTextService ai, ILogger<MatchingController> logger) : ControllerBase
{
    [HttpPost("run")]
    public async Task<ActionResult<List<MatchResult>>> Run(RunMatchingRequestDto request, CancellationToken ct)
    {
        var totalTimer = Stopwatch.StartNew();
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

        var queryTimer = Stopwatch.StartNew();
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

        var queryMs = queryTimer.ElapsedMilliseconds;
        var matchTimer = Stopwatch.StartNew();
        var results = matching.MatchAndRank(assignment, consultants);
        var matchingMs = matchTimer.ElapsedMilliseconds;

        var old = await db.MatchResults
            .Where(m => m.AssignmentId == assignment.Id && request.ConsultantIds.Contains(m.ConsultantId))
            .ToListAsync(ct);

        db.MatchResults.RemoveRange(old);
        db.MatchResults.AddRange(results);

        var trackedAssignment = await db.Assignments.FirstAsync(a => a.Id == assignment.Id, ct);
        trackedAssignment.Status = AssignmentStatus.Matched;

        await db.SaveChangesAsync(ct);
        logger.LogInformation("Matching completed: AssignmentId={AssignmentId}, Consultants={ConsultantCount}, Requirements={RequirementCount}, QueryMs={QueryMs}, CalculationMs={CalculationMs}, TotalMs={TotalMs}",
            assignment.Id, consultants.Count, assignment.Requirements.Count, queryMs, matchingMs, totalTimer.ElapsedMilliseconds);

        return results;
    }


    [HttpGet("assignment/{assignmentId:int}/ai-eligibility")]
    public async Task<ActionResult<object>> GetAiEligibility(int assignmentId, CancellationToken ct)
    {
        if (!await db.Assignments.AnyAsync(a => a.Id == assignmentId, ct)) return NotFound();
        var ranked = await db.MatchResults.AsNoTracking()
            .Where(m => m.AssignmentId == assignmentId)
            .OrderBy(m => m.Rank).ThenByDescending(m => m.Score)
            .Select(m => m.ConsultantId).Distinct().ToListAsync(ct);
        var uploads = await db.CvUploads.AsNoTracking()
            .Where(cv => cv.IsActive && cv.Status == "Indexed" && cv.StorageKey != null
                && cv.ConsultantId != null && ranked.Contains(cv.ConsultantId.Value))
            .OrderByDescending(cv => cv.UploadedAt).ToListAsync(ct);
        var latest = uploads.GroupBy(cv => cv.ConsultantId!.Value)
            .ToDictionary(g => g.Key, g => g.First());
        var eligible = new List<int>();
        foreach (var id in ranked)
        {
            if (!latest.TryGetValue(id, out var cv)) continue;
            var path = Path.Combine(environment.ContentRootPath, "private-cvs", Path.GetFileName(cv.StorageKey!));
            if (System.IO.File.Exists(path) &&
                (Path.GetExtension(path).Equals(".pdf", StringComparison.OrdinalIgnoreCase) ||
                 Path.GetExtension(path).Equals(".txt", StringComparison.OrdinalIgnoreCase)))
                eligible.Add(id);
        }
        return Ok(new { eligibleConsultantIds = eligible });
    }

    public sealed class AiRankingRequest
    {
        public List<int>? ConsultantIds { get; set; }
    }

    [HttpPost("assignment/{assignmentId:int}/ai-ranking")]
    public async Task<ActionResult<AiRankingResultDto>> RankOriginalCvs(int assignmentId, [FromBody] AiRankingRequest? request, CancellationToken ct)
    {
        var assignment = await db.Assignments.Include(a => a.Requirements)
            .AsNoTracking().FirstOrDefaultAsync(a => a.Id == assignmentId, ct);
        if (assignment is null) return NotFound("Assignment not found.");

        var ranked = await db.MatchResults.AsNoTracking()
            .Where(m => m.AssignmentId == assignmentId)
            .OrderBy(m => m.Rank).ThenByDescending(m => m.Score)
            .Select(m => m.ConsultantId).Distinct().ToListAsync(ct);
        if (ranked.Count == 0) return BadRequest("Run Matching before AI Ranking.");

        if (request?.ConsultantIds is { } chosen)
        {
            if (chosen.Count != 2 || chosen.Distinct().Count() != 2)
                return BadRequest("Select exactly two different consultants.");
            if (chosen.Any(id => !ranked.Contains(id)))
                return BadRequest("Selected consultants must belong to this assignment's matching results.");
            ranked = chosen;
        }

        var originals = await db.CvUploads.AsNoTracking()
            .Where(cv => cv.IsActive && cv.Status == "Indexed" && cv.StorageKey != null && cv.ConsultantId != null && ranked.Contains(cv.ConsultantId.Value))
            .ToListAsync(ct);
        var byConsultant = originals.GroupBy(cv => cv.ConsultantId!.Value)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(cv => cv.UploadedAt).First());

        var eligible = new List<(int ConsultantId, string CvText)>();
        var skipped = 0;
        foreach (var id in ranked)
        {
            if (eligible.Count == 2) break;
            if (!byConsultant.TryGetValue(id, out var cv)) { skipped++; continue; }
            var path = Path.Combine(environment.ContentRootPath, "private-cvs", Path.GetFileName(cv.StorageKey!));
            if (!System.IO.File.Exists(path)) { skipped++; continue; }
            string text;
            try
            {
                var extension = Path.GetExtension(path).ToLowerInvariant();
                if (extension == ".pdf")
                {
                    await using var stream = System.IO.File.OpenRead(path);
                    text = pdf.Extract(stream);
                }
                else if (extension == ".txt")
                    text = await System.IO.File.ReadAllTextAsync(path, ct);
                else { skipped++; continue; }
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or InvalidDataException)
            {
                skipped++;
                continue;
            }
            if (string.IsNullOrWhiteSpace(text)) { skipped++; continue; }
            eligible.Add((id, text.Length > 30000 ? text[..30000] : text));
        }
        if (eligible.Count < 2)
            return BadRequest($"AI Ranking needs two original CVs. Found {eligible.Count} eligible consultant(s).");

        var requirements = string.Join("\n", assignment.Requirements.Select(r =>
            $"{r.Type}: {r.Name}; minimum years: {r.MinYears?.ToString() ?? "not specified"}; proficiency: {r.Proficiency ?? "not specified"}"));
        var assignmentText = $"Start date: {assignment.RequiredStartDate?.ToString("yyyy-MM-dd") ?? "not specified"}\nStart timing: {assignment.StartDateDescription ?? "not specified"}\nAvailability requirement: {assignment.Availability ?? "not specified"}\nTitle: {assignment.Title}\nCustomer: {assignment.CustomerName}\nDescription: {assignment.Description}\nSeniority: {assignment.Seniority}\nMinimum experience: {assignment.MinYearsExperience}\nLocation: {assignment.Location}\nRequirements:\n{requirements}";
        try
        {
            var result = await ai.RankOriginalCvsAsync(assignmentText, eligible, ct);
            result.SkippedWithoutCv = skipped;
            return Ok(result);
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            logger.LogWarning("AI Ranking timed out for AssignmentId={AssignmentId}", assignmentId);
            return Problem(statusCode: StatusCodes.Status504GatewayTimeout, title: "AI Ranking timed out",
                detail: "The AI service took too long to respond. Try again later.");
        }
        catch (HttpRequestException ex)
        {
            logger.LogWarning(ex, "AI Ranking request failed for AssignmentId={AssignmentId}", assignmentId);
            return Problem(statusCode: StatusCodes.Status502BadGateway, title: "AI Ranking unavailable",
                detail: "The AI service is currently unavailable. Try again later.");
        }
        catch (InvalidOperationException ex)
        {
            logger.LogWarning(ex, "AI Ranking failed for AssignmentId={AssignmentId}", assignmentId);
            return Problem(statusCode: StatusCodes.Status502BadGateway, title: "AI Ranking unavailable",
                detail: "The AI service could not complete the ranking. Try again later.");
        }
    }

    [HttpGet("assignment/{assignmentId:int}/freshness")]
    public async Task<ActionResult<object>> GetFreshness(int assignmentId, CancellationToken ct)
    {
        if (!await db.Assignments.AnyAsync(a => a.Id == assignmentId, ct))
            return NotFound();

        var matchedIds = await db.MatchResults.AsNoTracking()
            .Where(m => m.AssignmentId == assignmentId)
            .Select(m => m.ConsultantId)
            .Distinct()
            .ToListAsync(ct);

        if (matchedIds.Count == 0)
            return Ok(new { isOutdated = false, newConsultants = 0 });

        var newCount = await db.Consultants.AsNoTracking()
            .CountAsync(c => !matchedIds.Contains(c.Id), ct);

        return Ok(new { isOutdated = newCount > 0, newConsultants = newCount });
    }

    [HttpGet("assignment/{assignmentId:int}")]
    public async Task<ActionResult<List<MatchResult>>> GetForAssignment(int assignmentId, CancellationToken ct)
    {
        var assignment = await db.Assignments
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == assignmentId, ct);
        if (assignment is null) return NotFound();

        var readTimer = Stopwatch.StartNew();
        var results = await db.MatchResults
            .Include(m => m.Details)
            .Where(m => m.AssignmentId == assignmentId)
            .OrderByDescending(m => m.Score)
            .AsSplitQuery()
            .AsNoTracking()
            .ToListAsync(ct);
        logger.LogInformation("Matching results read: AssignmentId={AssignmentId}, Results={ResultCount}, ReadMs={ReadMs}",
            assignmentId, results.Count, readTimer.ElapsedMilliseconds);

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
