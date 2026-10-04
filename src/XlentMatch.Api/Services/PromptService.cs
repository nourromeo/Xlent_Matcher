using Microsoft.EntityFrameworkCore;
using XlentMatch.Api.Data;
using XlentMatch.Api.Models;

namespace XlentMatch.Api.Services;

public static class PromptKeys
{
    public const string CvExtraction = "CV_EXTRACTION";
    public const string AssignmentExtraction = "ASSIGNMENT_EXTRACTION";
    public const string CvAdaptation = "CV_ADAPTATION";
}

public sealed record PromptDefinition(string Key, string DisplayName, string Content);

public interface IPromptService
{
    Task<AiPromptVersion?> GetActivePromptAsync(string promptKey, CancellationToken ct = default);
    Task<List<AiPromptVersion>> GetVersionsAsync(string promptKey, CancellationToken ct = default);
    Task<AiPromptVersion?> GetVersionAsync(string promptKey, int version, CancellationToken ct = default);
    Task<AiPromptVersion> CreateVersionAsync(string promptKey, string content, string? changeNote, CancellationToken ct = default);
    Task<AiPromptVersion?> ActivateVersionAsync(string promptKey, int version, CancellationToken ct = default);
}

public sealed class PromptService(AppDbContext db) : IPromptService
{
    public Task<AiPromptVersion?> GetActivePromptAsync(string promptKey, CancellationToken ct = default) =>
        db.AiPromptVersions.AsNoTracking().FirstOrDefaultAsync(x => x.PromptKey == promptKey && x.IsActive, ct);

    public Task<List<AiPromptVersion>> GetVersionsAsync(string promptKey, CancellationToken ct = default) =>
        db.AiPromptVersions.AsNoTracking().Where(x => x.PromptKey == promptKey).OrderByDescending(x => x.Version).ToListAsync(ct);

    public Task<AiPromptVersion?> GetVersionAsync(string promptKey, int version, CancellationToken ct = default) =>
        db.AiPromptVersions.AsNoTracking().FirstOrDefaultAsync(x => x.PromptKey == promptKey && x.Version == version, ct);

    public async Task<AiPromptVersion> CreateVersionAsync(string promptKey, string content, string? changeNote, CancellationToken ct = default)
    {
        Validate(promptKey, content);
        await using var transaction = db.Database.IsRelational()
            ? await db.Database.BeginTransactionAsync(ct)
            : null;
        var versions = await db.AiPromptVersions.Where(x => x.PromptKey == promptKey).ToListAsync(ct);
        var nextVersion = versions.Count == 0 ? 1 : versions.Max(x => x.Version) + 1;
        foreach (var version in versions) version.IsActive = false;

        var created = new AiPromptVersion
        {
            PromptKey = promptKey,
            DisplayName = DisplayNameFor(promptKey),
            Version = nextVersion,
            Content = content,
            IsActive = true,
            ChangeNote = string.IsNullOrWhiteSpace(changeNote) ? null : changeNote.Trim(),
            CreatedAt = DateTime.UtcNow
        };
        db.AiPromptVersions.Add(created);
        await db.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return created;
    }

    public async Task<AiPromptVersion?> ActivateVersionAsync(string promptKey, int version, CancellationToken ct = default)
    {
        if (version <= 0) return null;
        await using var transaction = db.Database.IsRelational()
            ? await db.Database.BeginTransactionAsync(ct)
            : null;
        var versions = await db.AiPromptVersions.Where(x => x.PromptKey == promptKey).ToListAsync(ct);
        var selected = versions.SingleOrDefault(x => x.Version == version);
        if (selected is null) return null;
        foreach (var item in versions) item.IsActive = item.Id == selected.Id;
        await db.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return selected;
    }

    public static void Validate(string promptKey, string content)
    {
        if (string.IsNullOrWhiteSpace(promptKey)) throw new ArgumentException("Prompt key is required.");
        if (string.IsNullOrWhiteSpace(content)) throw new ArgumentException("Prompt content is required.");
        if (DisplayNameFor(promptKey) is null) throw new ArgumentException("Unknown prompt key.");
    }

    public static string DisplayNameFor(string promptKey) => promptKey switch
    {
        PromptKeys.CvExtraction => "CV Extraction",
        PromptKeys.AssignmentExtraction => "Assignment Extraction",
        PromptKeys.CvAdaptation => "CV Adaptation",
        _ => throw new ArgumentException("Unknown prompt key.")
    };
}
