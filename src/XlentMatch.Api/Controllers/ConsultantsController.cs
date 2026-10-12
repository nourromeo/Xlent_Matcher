using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using XlentMatch.Api.Data;
using XlentMatch.Api.Models;
using XlentMatch.Api.Services;

namespace XlentMatch.Api.Controllers;

[ApiController]
[Route("api/consultants")]
public class ConsultantsController(AppDbContext db, SkillNormalizationService skills, ConsultantAvailabilityService availability, IWebHostEnvironment environment) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<Consultant>>> GetAll(CancellationToken ct)
    {
        await availability.ResolveExpiredAsync(ct);
        return await db.Consultants
            .Include(c => c.Skills).ThenInclude(s => s.Skill)
            .AsNoTracking()
            .ToListAsync(ct);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Consultant>> GetById(int id, CancellationToken ct)
    {
        await availability.ResolveExpiredAsync(ct);
        var consultant = await LoadFull(id, ct);
        return consultant is null ? NotFound() : consultant;
    }

    [HttpPost]
    public async Task<ActionResult<Consultant>> Create(
        Consultant consultant,
        [FromQuery] int? cvUploadId,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(consultant.FirstName))
            return BadRequest("FirstName is required.");

        var validation = ValidateConsultant(consultant);
        if (validation is not null) return BadRequest(validation);

        // CV imports must not silently create a second consultant with the same identity.
        if (cvUploadId.HasValue)
        {
            var first = consultant.FirstName.Trim();
            var last = consultant.LastName.Trim();
            var email = consultant.Email?.Trim();
            var existingProfiles = await db.Consultants.AsNoTracking()
                .Select(x => new { x.Id, x.FirstName, x.LastName, x.Email })
                .ToListAsync(ct);
            var duplicate = existingProfiles.FirstOrDefault(x =>
                (!string.IsNullOrWhiteSpace(email) && !string.IsNullOrWhiteSpace(x.Email) &&
                 string.Equals(x.Email.Trim(), email, StringComparison.OrdinalIgnoreCase)) ||
                (string.Equals(x.FirstName.Trim(), first, StringComparison.OrdinalIgnoreCase) &&
                 string.Equals(x.LastName.Trim(), last, StringComparison.OrdinalIgnoreCase)));
            if (duplicate is not null)
                return Conflict(new {
                    code = "CONSULTANT_ALREADY_EXISTS",
                    consultantId = duplicate.Id,
                    message = "An existing consultant matches this CV. Link the CV to that consultant instead of creating a duplicate."
                });
        }

        await using var transaction = await db.Database.BeginTransactionAsync(ct);

        CvUploadRecord? upload = null;
        if (cvUploadId.HasValue)
        {
            upload = await db.CvUploads.FirstOrDefaultAsync(x => x.Id == cvUploadId.Value, ct);
            if (upload is null)
                return NotFound($"CV upload {cvUploadId.Value} not found.");

            // Makes a retry safe if the consultant was created but the client did not receive the response.
            if (upload.ConsultantId is int existingConsultantId)
            {
                var existingConsultant = await LoadFull(existingConsultantId, ct);
                if (existingConsultant is not null)
                {
                    await transaction.CommitAsync(ct);
                    return Ok(existingConsultant);
                }
            }
        }

        consultant.Id = 0;
        consultant.Availability = NormalizeAvailability(consultant.Availability);

        foreach (var skill in consultant.Skills) { skill.Id = 0; skill.ConsultantId = 0; }
        foreach (var experience in consultant.Experiences) { experience.Id = 0; experience.ConsultantId = 0; }
        foreach (var project in consultant.Projects) { project.Id = 0; project.ConsultantId = 0; }
        foreach (var education in consultant.Education) { education.Id = 0; education.ConsultantId = 0; }
        foreach (var language in consultant.Languages) { language.Id = 0; language.ConsultantId = 0; }
        foreach (var industry in consultant.Industries) { industry.Id = 0; industry.ConsultantId = 0; }
        foreach (var certification in consultant.Certifications) { certification.Id = 0; certification.ConsultantId = 0; }

        await skills.NormalizeConsultantSkillsAsync(consultant.Skills, ct);
        await skills.NormalizeConsultantLanguagesAsync(consultant.Languages, ct);

        db.Consultants.Add(consultant);
        await db.SaveChangesAsync(ct);

        if (upload is not null)
        {
            if (upload.StorageKey is null || upload.Status != "Review")
                return BadRequest("A reviewed CV with a stored original file is required.");
            upload.Status = "Indexed";
            upload.ConsultantId = consultant.Id;
            upload.IsActive = true;
            upload.ErrorMessage = null;
            upload.DraftJson = null;
            await db.SaveChangesAsync(ct);
        }

        await transaction.CommitAsync(ct);
        return CreatedAtAction(nameof(GetById), new { id = consultant.Id }, consultant);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<Consultant>> Update(int id, Consultant input, CancellationToken ct)
    {
        var existing = await LoadFull(id, ct, track: true);
        if (existing is null) return NotFound();

        if (string.IsNullOrWhiteSpace(input.FirstName))
            return BadRequest("FirstName is required.");

        var validation = ValidateConsultant(input);
        if (validation is not null) return BadRequest(validation);

        existing.FirstName = input.FirstName;
        existing.LastName = input.LastName;
        existing.Email = input.Email;
        existing.Title = input.Title;
        existing.Summary = input.Summary;
        existing.Seniority = input.Seniority;
        existing.YearsOfExperience = input.YearsOfExperience;
        existing.YearsOfExperienceSource = input.YearsOfExperienceSource;
        existing.Availability = input.Availability;
        existing.AvailableAgainDate = input.AvailableAgainDate;
        existing.Availability = NormalizeAvailability(input.Availability);
        existing.Office = input.Office;
        existing.OriginalCvText = input.OriginalCvText;

        input.Skills.ForEach(x => { x.Id = 0; x.ConsultantId = 0; x.SkillId = 0; x.Skill = null; });
        input.Experiences.ForEach(x => x.Id = 0);
        input.Projects.ForEach(x => x.Id = 0);
        input.Education.ForEach(x => x.Id = 0);
        input.Languages.ForEach(x => x.Id = 0);
        input.Industries.ForEach(x => x.Id = 0);
        input.Certifications.ForEach(x => x.Id = 0);

        await skills.NormalizeConsultantSkillsAsync(input.Skills, ct);
        await skills.NormalizeConsultantLanguagesAsync(input.Languages, ct);

        db.ConsultantSkills.RemoveRange(existing.Skills);
        existing.Skills = input.Skills;
        existing.Experiences = input.Experiences;
        existing.Projects = input.Projects;
        existing.Education = input.Education;
        existing.Languages = input.Languages;
        existing.Industries = input.Industries;
        existing.Certifications = input.Certifications;

        var staleMatches = await db.MatchResults.Where(m => m.ConsultantId == id).ToListAsync(ct);
        db.MatchResults.RemoveRange(staleMatches);

        await db.SaveChangesAsync(ct);
        return await LoadFull(id, ct) ?? existing;
    }

    [HttpPut("{id:int}/approve-cv/{uploadId:int}")]
    public async Task<ActionResult<Consultant>> ApproveCv(
        int id, int uploadId, Consultant input, CancellationToken ct)
    {
        var upload = await db.CvUploads.FirstOrDefaultAsync(x => x.Id == uploadId, ct);
        if (upload is null) return NotFound("CV upload not found.");
        if (upload.StorageKey is null || upload.Status is not ("Review" or "Indexed"))
            return BadRequest("A reviewed CV with a stored original file is required.");
        if (upload.ConsultantId is not null && upload.ConsultantId != id)
            return Conflict("This CV belongs to another consultant.");
        if (!await db.Consultants.AnyAsync(x => x.Id == id, ct))
            return NotFound("Consultant not found.");

        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var updated = await Update(id, input, ct);
        if (updated.Result is BadRequestObjectResult or NotFoundResult or NotFoundObjectResult)
            return updated;

        // The consultant update and CV activation commit together.
        var previous = await db.CvUploads
            .Where(x => x.ConsultantId == id && x.IsActive && x.Id != uploadId)
            .ToListAsync(ct);
        foreach (var item in previous) item.IsActive = false;
        await db.SaveChangesAsync(ct);

        upload.ConsultantId = id;
        upload.Status = "Indexed";
        upload.DraftJson = null;
        upload.ErrorMessage = null;
        upload.IsActive = true;
        await db.SaveChangesAsync(ct);

        db.CvUploads.RemoveRange(previous);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        var directory = Path.Combine(environment.ContentRootPath, "private-cvs");
        foreach (var item in previous.Where(x => x.StorageKey is not null))
        {
            var path = Path.Combine(directory, Path.GetFileName(item.StorageKey!));
            try { if (System.IO.File.Exists(path)) System.IO.File.Delete(path); }
            catch (IOException) { /* Unreferenced file can be cleaned up later. */ }
            catch (UnauthorizedAccessException) { /* Approval already committed. */ }
        }
        return await LoadFull(id, ct) ?? input;
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var consultant = await db.Consultants.FindAsync([id], ct);
        if (consultant is null) return NotFound();

        var matchResults = await db.MatchResults
            .Where(m => m.ConsultantId == id)
            .ToListAsync(ct);

        db.MatchResults.RemoveRange(matchResults);
        db.Consultants.Remove(consultant);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private Task<Consultant?> LoadFull(int id, CancellationToken ct, bool track = false)
    {
        IQueryable<Consultant> query = db.Consultants
            .Include(c => c.Skills).ThenInclude(s => s.Skill)
            .Include(c => c.Experiences)
            .Include(c => c.Projects)
            .Include(c => c.Education)
            .Include(c => c.Languages)
            .Include(c => c.Industries)
            .Include(c => c.Certifications)
            .AsSplitQuery();

        if (!track) query = query.AsNoTracking();
        return query.FirstOrDefaultAsync(c => c.Id == id, ct);
    }

    private static string NormalizeAvailability(string? value) =>
        string.Equals(value, ConsultantAvailability.Unavailable, StringComparison.OrdinalIgnoreCase)
            ? ConsultantAvailability.Unavailable
            : ConsultantAvailability.Available;

    private static string? ValidateConsultant(Consultant consultant)
    {
        if (consultant.YearsOfExperience is < 0)
            return "YearsOfExperience cannot be negative.";

        if (!string.IsNullOrWhiteSpace(consultant.Seniority) &&
            SeniorityLevel(consultant.Seniority) is null)
            return "Seniority must be Junior, Mid, Senior, or Staff.";

        if (consultant.Skills.Any(skill => skill.Years < 0))
            return "Skill years cannot be negative.";

        if (consultant.Skills.Any(skill => skill.Level < 0 || skill.Level > 5))
            return "Skill level must be between 0 and 5.";

        if (consultant.Experiences.Any(experience => experience.StartDate is not null &&
            experience.EndDate is not null && experience.EndDate < experience.StartDate))
            return "Experience end date cannot be before its start date.";

        return null;
    }

    private static int? SeniorityLevel(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "junior" => 1,
        "mid" => 2,
        "senior" => 3,
        "staff" => 4,
        _ => null
    };
}
