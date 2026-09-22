namespace XlentMatch.Api.Models;

public class AdaptedCv
{
    public int Id { get; set; }
    public int ConsultantId { get; set; }
    public int AssignmentId { get; set; }
    public string Content { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
