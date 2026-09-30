namespace XlentMatch.Api.Models;

public class MatchResult
{
    public int Id { get; set; }
    public int AssignmentId { get; set; }
    public int ConsultantId { get; set; }
    public string ConsultantName { get; set; } = "";
    public int Score { get; set; }
    public int Rank { get; set; }
    public int MatchedMandatory { get; set; }
    public int TotalMandatory { get; set; }
    public int MatchedDesired { get; set; }
    public int TotalDesired { get; set; }
    public int ExperienceScore { get; set; }
    public string Explanation { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<MatchRequirementResult> Details { get; set; } = new();
    [System.ComponentModel.DataAnnotations.Schema.NotMapped]
    public List<MatchContextResult> ContextDetails { get; set; } = new();
}
