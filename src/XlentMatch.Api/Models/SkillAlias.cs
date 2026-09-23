namespace XlentMatch.Api.Models;

public class SkillAlias
{
    public int Id { get; set; }
    public int SkillId { get; set; }
    public string Alias { get; set; } = "";
    public string NormalizedAlias { get; set; } = "";
    public Skill? Skill { get; set; }
}
