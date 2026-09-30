namespace XlentMatch.Api.Models;

public class MatchContextResult
{
    public string Name { get; set; } = "";
    public bool? IsMatched { get; set; }
    public bool AffectsScore { get; set; }
    public string Evidence { get; set; } = "";
}
