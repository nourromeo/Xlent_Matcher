namespace XlentMatch.Api.Domain;

public class MatchResult
{
    public int Id { get; set; }
    public int AssignmentId { get; set; }
    public int ConsultantId { get; set; }
    public string ConsultantName { get; set; } = "";
    public int Score { get; set; }          // 0-100
    public int Rank { get; set; }
    public int MatchedMandatory { get; set; }
    public int TotalMandatory { get; set; }
    public int MatchedDesired { get; set; }
    public int TotalDesired { get; set; }
    public string Explanation { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<MatchRequirementResult> Details { get; set; } = new();
}

public class MatchRequirementResult
{
    public int Id { get; set; }
    public int MatchResultId { get; set; }
    public string RequirementName { get; set; } = "";
    public RequirementType Type { get; set; }
    public bool IsMatched { get; set; }
    public string Evidence { get; set; } = "";
}
