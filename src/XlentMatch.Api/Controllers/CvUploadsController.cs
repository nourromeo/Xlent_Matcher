using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using XlentMatch.Api.Data;
using XlentMatch.Api.Models;

namespace XlentMatch.Api.Controllers;

[ApiController]
[Route("api/cv-uploads")]
public class CvUploadsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<CvUploadRecord>>> GetAll(CancellationToken ct) =>
        await db.CvUploads
            .AsNoTracking()
            .OrderByDescending(x => x.UploadedAt)
            .ToListAsync(ct);

    [HttpPost]
    public async Task<ActionResult<CvUploadRecord>> Create(CreateCvUploadRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.FileName))
            return BadRequest("FileName is required.");

        var upload = new CvUploadRecord
        {
            FileName = request.FileName.Trim(),
            FileSize = request.FileSize,
            Status = string.IsNullOrWhiteSpace(request.Status) ? "Extracting" : request.Status.Trim(),
            ErrorMessage = request.ErrorMessage,
            UploadedAt = DateTime.UtcNow
        };

        db.CvUploads.Add(upload);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetAll), new { id = upload.Id }, upload);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<CvUploadRecord>> Update(int id, UpdateCvUploadRequest request, CancellationToken ct)
    {
        var upload = await db.CvUploads.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (upload is null) return NotFound();

        if (!string.IsNullOrWhiteSpace(request.Status))
            upload.Status = request.Status.Trim();

        upload.ErrorMessage = request.ErrorMessage;
        upload.ConsultantId = request.ConsultantId;
        upload.DraftJson = request.Status == "Indexed" ? null : request.DraftJson;

        await db.SaveChangesAsync(ct);
        return upload;
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var upload = await db.CvUploads.FindAsync([id], ct);
        if (upload is null) return NotFound();

        db.CvUploads.Remove(upload);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}

public class CreateCvUploadRequest
{
    public string FileName { get; set; } = "";
    public long FileSize { get; set; }
    public string? Status { get; set; }
    public string? ErrorMessage { get; set; }
}

public class UpdateCvUploadRequest
{
    public string Status { get; set; } = "";
    public string? ErrorMessage { get; set; }
    public int? ConsultantId { get; set; }
    public string? DraftJson { get; set; }
}
