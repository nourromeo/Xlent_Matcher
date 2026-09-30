using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using XlentMatch.Api.Data;
using XlentMatch.Api.Models;
using XlentMatch.Api.Services;

namespace XlentMatch.Api.Controllers;

[ApiController]
[Route("api/consultants")]
public class ConsultantsController(AppDbContext db, SkillNormalizationService skills) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<Consultant>>> GetAll(CancellationToken ct) =>
        await db.Consultants
            .Include(c => c.Skills).ThenInclude(s => s.Skill)
            .AsNoTracking()
            .ToListAsync(ct);

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Consultant>> GetById(int id, CancellationToken ct)
    {
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
        consultant.AvailabilityConfirmedAt = consultant.AvailableFromDate is not null || !string.IsNullOrWhiteSpace(consultant.Availability) ? DateTime.UtcNow : null;

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
            upload.Status = "Indexed";
            upload.ConsultantId = consultant.Id;
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

        existing.FirstName = input.FirstName;
        existing.LastName = input.LastName;
        existing.Email = input.Email;
        existing.Title = input.Title;
        existing.Summary = input.Summary;
        existing.Seniority = input.Seniority;
        existing.YearsOfExperience = input.YearsOfExperience;
        existing.YearsOfExperienceSource = input.YearsOfExperienceSource;
        existing.Availability = input.Availability;
        existing.AvailableFromDate = input.AvailableFromDate;
        existing.AvailabilityConfirmedAt = input.AvailableFromDate is not null || !string.IsNullOrWhiteSpace(input.Availability) ? DateTime.UtcNow : null;
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
            .Include(c => c.Certifications);

        if (!track) query = query.AsNoTracking();
        return query.FirstOrDefaultAsync(c => c.Id == id, ct);
    }
}
