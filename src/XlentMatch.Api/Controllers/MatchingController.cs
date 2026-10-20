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
            if (chosen.Count < 2 || chosen.Count > 5 || chosen.Distinct().Count() != chosen.Count)
                return BadRequest("Select between two and five different consultants.");
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
            if (eligible.Count == (request?.ConsultantIds?.Count ?? 5)) break;
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
        if (request?.ConsultantIds is { } requested && eligible.Count != requested.Count)
            return BadRequest($"All selected consultants need readable original CVs. Requested {requested.Count}, found {eligible.Count}.");
        if (eligible.Count < 2)
            return BadRequest($"AI Ranking needs at least two original CVs. Found {eligible.Count} eligible consultant(s).");

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


    public sealed class SaveAiRankingRequest
    {
        public List<SavedAiRankingItem>? Rankings { get; set; }
        public List<SavedAiRankingMatch>? Matches { get; set; }
    }

    public sealed class SavedAiRankingItem
    {
        public int ConsultantId { get; set; }
        public int Rank { get; set; }
        public string Reason { get; set; } = "";
        public List<string> Strengths { get; set; } = new();
        public List<string> Gaps { get; set; } = new();
        public List<string> Evidence { get; set; } = new();
    }

    public sealed class SavedAiRankingMatch
    {
        public int ConsultantId { get; set; }
        public string ConsultantName { get; set; } = "";
        public int Score { get; set; }
    }

    [HttpPost("assignment/{assignmentId:int}/saved-ai-rankings")]
    public async Task<ActionResult<object>> SaveAiRanking(int assignmentId, [FromBody] SaveAiRankingRequest? request, CancellationToken ct)
    {
        if (!await db.Assignments.AnyAsync(a => a.Id == assignmentId, ct)) return NotFound();
        var rankings = request?.Rankings;
        if (rankings is null || rankings.Count is < 2 or > 5 ||
            rankings.Any(x => x.ConsultantId <= 0 || x.Rank <= 0) ||
            rankings.Select(x => x.ConsultantId).Distinct().Count() != rankings.Count ||
            rankings.Select(x => x.Rank).OrderBy(x => x).Where((rank, i) => rank != i + 1).Any())
            return BadRequest("A ranking must contain 2 to 5 distinct consultants with consecutive ranks.");
        var ids = rankings.Select(x => x.ConsultantId).ToList();
        var matches = await db.MatchResults.AsNoTracking()
            .Where(x => x.AssignmentId == assignmentId && ids.Contains(x.ConsultantId))
            .Select(x => new { x.ConsultantId, x.ConsultantName, x.Score })
            .ToListAsync(ct);
        if (matches.Count != ids.Count) return BadRequest("Consultants must belong to this assignment.");
        // Use server-side names and scores. Do not persist arbitrary client-supplied profile data.
        var snapshot = new
        {
            rankings = rankings.OrderBy(x => x.Rank).ToList(),
            matches = matches.Select(x => new { x.ConsultantId, x.ConsultantName, x.Score }).ToList(),
            skippedWithoutCv = 0
        };
        var record = new SavedAiRanking
        {
            AssignmentId = assignmentId,
            SnapshotJson = System.Text.Json.JsonSerializer.Serialize(snapshot, new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web))
        };
        db.SavedAiRankings.Add(record);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetSavedAiRanking), new { assignmentId, savedId = record.Id },
            new { id = record.Id, record.CreatedAt });
    }

    [HttpGet("assignment/{assignmentId:int}/saved-ai-rankings")]
    public async Task<ActionResult<object>> ListSavedAiRankings(int assignmentId, CancellationToken ct)
    {
        if (!await db.Assignments.AnyAsync(x => x.Id == assignmentId, ct)) return NotFound();
        var saved = await db.SavedAiRankings.AsNoTracking()
            .Where(x => x.AssignmentId == assignmentId)
            .OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id)
            .ToListAsync(ct);
        return Ok(saved.Select(x =>
        {
            using var doc = System.Text.Json.JsonDocument.Parse(x.SnapshotJson);
            var ranks = doc.RootElement.GetProperty("rankings");
            var matches = doc.RootElement.GetProperty("matches");
            var firstId = ranks.EnumerateArray().First().GetProperty("consultantId").GetInt32();
            var winner = matches.EnumerateArray().FirstOrDefault(m => m.GetProperty("ConsultantId").GetInt32() == firstId);
            return new { x.Id, x.CreatedAt, consultantCount = ranks.GetArrayLength(),
                bestMatch = winner.ValueKind == System.Text.Json.JsonValueKind.Undefined ? "Consultant" : winner.GetProperty("consultantName").GetString() };
        }).ToList());
    }

    [HttpGet("assignment/{assignmentId:int}/saved-ai-rankings/{savedId:int}")]
    public async Task<ActionResult<object>> GetSavedAiRanking(int assignmentId, int savedId, CancellationToken ct)
    {
        var saved = await db.SavedAiRankings.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == savedId && x.AssignmentId == assignmentId, ct);
        if (saved is null) return NotFound();
        return Ok(new { saved.Id, saved.CreatedAt, snapshot = System.Text.Json.JsonDocument.Parse(saved.SnapshotJson).RootElement });
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
