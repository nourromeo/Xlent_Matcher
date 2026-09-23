namespace XlentMatch.Api.Models;

public class Skill
{
    public int Id { get; set; }
    public string CanonicalName { get; set; } = "";
    public string NormalizedName { get; set; } = "";
    public string Category { get; set; } = "Unclassified";
    public List<SkillAlias> Aliases { get; set; } = new();
}
