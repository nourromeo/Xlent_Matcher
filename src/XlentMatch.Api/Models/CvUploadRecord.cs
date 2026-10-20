namespace XlentMatch.Api.Models;

public class CvUploadRecord
{
    public int Id { get; set; }
    public string FileName { get; set; } = "";
    public long FileSize { get; set; }
    public string Status { get; set; } = "Extracting";
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public string? ErrorMessage { get; set; }
    public int? ConsultantId { get; set; }
    public string? DraftJson { get; set; }
    public string? StorageKey { get; set; }
    public string? ContentHash { get; set; }
    public string? ContentType { get; set; }
    public bool IsActive { get; set; }
}
