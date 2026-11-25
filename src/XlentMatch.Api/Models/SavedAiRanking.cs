namespace XlentMatch.Api.Models;

public class SavedAiRanking
{
    public int Id { get; set; }
    public int AssignmentId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string SnapshotJson { get; set; } = "";
}
