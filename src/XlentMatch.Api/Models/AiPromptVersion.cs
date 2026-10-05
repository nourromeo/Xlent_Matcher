namespace XlentMatch.Api.Models;

public class AiPromptVersion
{
    public int Id { get; set; }
    public string PromptKey { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public int Version { get; set; }
    public string Content { get; set; } = "";
    public bool IsActive { get; set; }
    public string? ChangeNote { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
