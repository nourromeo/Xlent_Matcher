using System.Security.Cryptography;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using XlentMatch.Api.Data;
using XlentMatch.Api.Models;

namespace XlentMatch.Api.Controllers;

[ApiController]
[Route("api/cv-uploads")]
public class CvUploadsController(AppDbContext db, IWebHostEnvironment environment) : ControllerBase
{
    private static readonly SemaphoreSlim UploadLock = new(1, 1);
    [HttpGet]
    public async Task<ActionResult<List<CvUploadRecord>>> GetAll(CancellationToken ct) =>
        await db.CvUploads
            .AsNoTracking()
            .OrderByDescending(x => x.UploadedAt)
            .ToListAsync(ct);

    [HttpPost("cleanup-abandoned")]
    public async Task<ActionResult<object>> CleanupAbandoned(CancellationToken ct)
    {
        // Only delete old, fileless, unlinked attempts. Never touch approved CVs,
        // review drafts, or recently started uploads.
        var cutoff = DateTime.UtcNow.AddHours(-24);
        var abandoned = await db.CvUploads
            .Where(x => x.StorageKey == null && x.ConsultantId == null &&
                        x.DraftJson == null && !x.IsActive &&
                        x.UploadedAt < cutoff &&
                        (x.Status == "Extracting" || x.Status == "Error"))
            .ToListAsync(ct);
        db.CvUploads.RemoveRange(abandoned);
        await db.SaveChangesAsync(ct);
        return Ok(new { removed = abandoned.Count });
    }

    [HttpPost("detect-consultant")]
    public async Task<ActionResult<ConsultantDetectionResult>> DetectConsultant(
        DetectConsultantRequest request, CancellationToken ct)
    {
        var email = request.Email?.Trim();
        var firstName = request.FirstName?.Trim();
        var lastName = request.LastName?.Trim();
        if (string.IsNullOrWhiteSpace(email) && (string.IsNullOrWhiteSpace(firstName) || string.IsNullOrWhiteSpace(lastName)))
            return BadRequest("Email or both first and last name are required.");

        var consultants = await db.Consultants.AsNoTracking()
            .Select(x => new { x.Id, x.FirstName, x.LastName, x.Email })
            .ToListAsync(ct);

        var emailMatches = !string.IsNullOrWhiteSpace(email)
            ? consultants.Where(x => !string.IsNullOrWhiteSpace(x.Email) &&
                string.Equals(x.Email.Trim(), email, StringComparison.OrdinalIgnoreCase)).ToList()
            : [];
        var nameMatches = !string.IsNullOrWhiteSpace(firstName) && !string.IsNullOrWhiteSpace(lastName)
            ? consultants.Where(x =>
                string.Equals(x.FirstName.Trim(), firstName, StringComparison.OrdinalIgnoreCase) &&
                string.Equals(x.LastName.Trim(), lastName, StringComparison.OrdinalIgnoreCase)).ToList()
            : [];

        var matches = emailMatches.Concat(nameMatches).DistinctBy(x => x.Id)
            .Select(x => new ConsultantDetectionMatch(
                x.Id, x.FirstName, x.LastName, x.Email,
                emailMatches.Any(e => e.Id == x.Id) ? "Email" : "Name"))
            .OrderBy(x => x.MatchReason == "Email" ? 0 : 1)
            .ThenBy(x => x.FirstName)
            .ToList();

        return Ok(new ConsultantDetectionResult(matches));
    }

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
        if (upload.StorageKey is not null || upload.Status != "Extracting")
            return Conflict("This upload already has a stored file. Create a new upload to replace a CV.");
        if (file.Length == 0 || file.Length > 10 * 1024 * 1024)
            return BadRequest("File must be between 1 byte and 10 MB.");
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (extension is not (".pdf" or ".txt"))
            return BadRequest("Only PDF and TXT files are supported.");

        // Reject identical content before saving a file or starting AI extraction.
        // The lock prevents two concurrent uploads on this API instance from bypassing the check.
        await UploadLock.WaitAsync(ct);
        try
        {
            Directory.CreateDirectory(CvDirectory);
            await using var incoming = file.OpenReadStream();
            var incomingHash = Convert.ToHexString(await SHA256.HashDataAsync(incoming, ct));

            var storedKeys = await db.CvUploads.AsNoTracking()
                .Where(x => x.StorageKey != null && x.Id != id)
                .Select(x => new { x.Id, x.StorageKey })
                .ToListAsync(ct);

            foreach (var existing in storedKeys)
            {
                var existingPath = Path.Combine(CvDirectory, Path.GetFileName(existing.StorageKey!));
                if (!System.IO.File.Exists(existingPath)) continue;

                await using var stored = System.IO.File.OpenRead(existingPath);
                var storedHash = Convert.ToHexString(await SHA256.HashDataAsync(stored, ct));
                if (incomingHash == storedHash)
                {
                    // The rejected upload must not leave a placeholder in the database.
                    db.CvUploads.Remove(upload);
                    await db.SaveChangesAsync(ct);
                    return Conflict(new
                    {
                        code = "DUPLICATE_CV",
                        message = "This CV already exists in the library. No extraction was started.",
                        existingUploadId = existing.Id
                    });
                }
            }

            var key = Guid.NewGuid().ToString("N") + extension;
            var target = Path.Combine(CvDirectory, key);
            try
            {
                await using (var stream = new FileStream(target, FileMode.CreateNew))
                    await file.CopyToAsync(stream, ct);

                upload.StorageKey = key;
                upload.ContentType = extension == ".pdf" ? "application/pdf" : "text/plain";
                upload.FileName = Path.GetFileName(file.FileName);
                upload.FileSize = file.Length;
                await db.SaveChangesAsync(ct);
                return Ok(upload);
            }
            catch
            {
                if (System.IO.File.Exists(target)) System.IO.File.Delete(target);
                throw;
            }
        }
        finally
        {
            UploadLock.Release();
        }
    }

    [HttpGet("{id:int}/file")]
    public async Task<IActionResult> DownloadFile(int id, [FromQuery(Name = "inline")] bool inlineView, CancellationToken ct)
    {
        var upload = await db.CvUploads.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (upload?.StorageKey is null) return NotFound();
        var path = Path.Combine(CvDirectory, Path.GetFileName(upload.StorageKey));
        if (!System.IO.File.Exists(path)) return NotFound();
        return inlineView
            ? PhysicalFile(path, upload.ContentType ?? "application/octet-stream")
            : PhysicalFile(path, upload.ContentType ?? "application/octet-stream", upload.FileName);
    }

    [HttpPost("{id:int}/activate")]
    public async Task<ActionResult<CvUploadRecord>> Activate(int id, CancellationToken ct)
    {
        var upload = await db.CvUploads.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (upload is null) return NotFound();
        if (upload.ConsultantId is null || upload.Status != "Indexed" || upload.StorageKey is null)
            return BadRequest("A saved consultant and original CV file are required.");

        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        // Retain the current CV until the replacement has passed review and is ready.
        var previousCvs = await db.CvUploads
            .Where(x => x.ConsultantId == upload.ConsultantId && x.Id != id && x.IsActive)
            .ToListAsync(ct);
        foreach (var previous in previousCvs) previous.IsActive = false;
        await db.SaveChangesAsync(ct);
        upload.IsActive = true;
        await db.SaveChangesAsync(ct);
        db.CvUploads.RemoveRange(previousCvs);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        // Delete old originals only after the database transaction succeeds.
        // If filesystem cleanup fails, the new active CV must remain available.
        foreach (var previous in previousCvs.Where(x => x.StorageKey is not null))
        {
            var oldPath = Path.Combine(CvDirectory, Path.GetFileName(previous.StorageKey!));
            try { if (System.IO.File.Exists(oldPath)) System.IO.File.Delete(oldPath); }
            catch (IOException) { /* An orphaned file can be cleaned up later. */ }
            catch (UnauthorizedAccessException) { /* Do not undo the approved replacement. */ }
        }
        return Ok(upload);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var upload = await db.CvUploads.FindAsync([id], ct);
        if (upload is null) return NotFound();

        // Keep the consultant and its structured profile untouched.
        // Remove the database record first so a failed save never loses the original file.
        var storageKey = upload.StorageKey;
        db.CvUploads.Remove(upload);
        await db.SaveChangesAsync(ct);

        if (storageKey is not null)
        {
            var path = Path.Combine(CvDirectory, Path.GetFileName(storageKey));
            try { if (System.IO.File.Exists(path)) System.IO.File.Delete(path); }
            catch (IOException) { /* The unreferenced file can be cleaned up later. */ }
            catch (UnauthorizedAccessException) { /* Preserve successful database deletion. */ }
        }
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

public record DetectConsultantRequest(string? FirstName, string? LastName, string? Email);
public record ConsultantDetectionMatch(int Id, string FirstName, string LastName, string? Email, string MatchReason);
public record ConsultantDetectionResult(List<ConsultantDetectionMatch> Matches);
