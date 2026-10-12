using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using XlentMatch.Api.Data;
using XlentMatch.Api.Models;

namespace XlentMatch.Api.Controllers;

[ApiController]
[Route("api/cv-uploads")]
public class CvUploadsController(AppDbContext db, IWebHostEnvironment environment) : ControllerBase
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

        if (request.FileSize <= 0)
            return BadRequest("The uploaded file is empty.");

        if (request.FileSize > 10 * 1024 * 1024)
            return BadRequest("File is larger than 10 MB.");

        var fileName = request.FileName.Trim();

        var duplicate = await db.CvUploads
            .AsNoTracking()
            .AnyAsync(x =>
                x.FileName == fileName &&
                x.FileSize == request.FileSize &&
                x.Status != "Error",
                ct);

        if (duplicate)
            return Conflict("This CV file already exists in the upload history.");

        var upload = new CvUploadRecord
        {
            FileName = fileName,
            FileSize = request.FileSize,
            Status = string.IsNullOrWhiteSpace(request.Status) ? "Extracting" : request.Status.Trim(),
            ErrorMessage = request.ErrorMessage,
            UploadedAt = DateTime.UtcNow
        };

        db.CvUploads.Add(upload);
        await db.SaveChangesAsync(ct);

        return Ok(upload);
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


    private string CvDirectory => Path.Combine(environment.ContentRootPath, "private-cvs");

    [HttpPost("{id:int}/file")]
    [RequestSizeLimit(11 * 1024 * 1024)]
    public async Task<ActionResult<CvUploadRecord>> UploadFile(int id, IFormFile file, CancellationToken ct)
    {
        var upload = await db.CvUploads.FindAsync([id], ct);
        if (upload is null) return NotFound();
        if (file.Length == 0 || file.Length > 10 * 1024 * 1024)
            return BadRequest("File must be between 1 byte and 10 MB.");
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (extension is not (".pdf" or ".txt"))
            return BadRequest("Only PDF and TXT files are supported.");

        Directory.CreateDirectory(CvDirectory);
        var key = Guid.NewGuid().ToString("N") + extension;
        var target = Path.Combine(CvDirectory, key);
        try
        {
            await using (var stream = new FileStream(target, FileMode.CreateNew))
                await file.CopyToAsync(stream, ct);

            var previousKey = upload.StorageKey;
            upload.StorageKey = key;
            upload.ContentType = extension == ".pdf" ? "application/pdf" : "text/plain";
            upload.FileName = Path.GetFileName(file.FileName);
            upload.FileSize = file.Length;
            await db.SaveChangesAsync(ct);
            if (previousKey is not null)
                System.IO.File.Delete(Path.Combine(CvDirectory, Path.GetFileName(previousKey)));
            return Ok(upload);
        }
        catch
        {
            if (System.IO.File.Exists(target)) System.IO.File.Delete(target);
            throw;
        }
    }

    [HttpGet("{id:int}/file")]
    public async Task<IActionResult> DownloadFile(int id, CancellationToken ct)
    {
        var upload = await db.CvUploads.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (upload?.StorageKey is null) return NotFound();
        var path = Path.Combine(CvDirectory, Path.GetFileName(upload.StorageKey));
        if (!System.IO.File.Exists(path)) return NotFound();
        return PhysicalFile(path, upload.ContentType ?? "application/octet-stream", upload.FileName);
    }

    [HttpPost("{id:int}/activate")]
    public async Task<ActionResult<CvUploadRecord>> Activate(int id, CancellationToken ct)
    {
        var upload = await db.CvUploads.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (upload is null) return NotFound();
        if (upload.ConsultantId is null || upload.Status != "Indexed" || upload.StorageKey is null)
            return BadRequest("A saved consultant and original CV file are required.");

        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var active = await db.CvUploads.Where(x => x.ConsultantId == upload.ConsultantId && x.IsActive && x.Id != id).ToListAsync(ct);
        foreach (var previous in active) previous.IsActive = false;
        await db.SaveChangesAsync(ct);
        upload.IsActive = true;
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Ok(upload);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var upload = await db.CvUploads.FindAsync([id], ct);
        if (upload is null) return NotFound();

        if (upload.StorageKey is not null)
            System.IO.File.Delete(Path.Combine(CvDirectory, Path.GetFileName(upload.StorageKey)));

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
