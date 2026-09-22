namespace XlentMatch.Api.Models;

public class MatchRequirementResult
{
    public int Id { get; set; }
    public int MatchResultId { get; set; }
    public string RequirementName { get; set; } = "";
    public RequirementType Type { get; set; }
    public bool IsMatched { get; set; }
    public string Evidence { get; set; } = "";
}
