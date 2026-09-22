namespace XlentMatch.Api.Domain;

// A CV version adapted for a specific assignment. Stored separately from the original.
public class AdaptedCv
{
    public int Id { get; set; }
    public int ConsultantId { get; set; }
    public int AssignmentId { get; set; }
    public string Content { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
