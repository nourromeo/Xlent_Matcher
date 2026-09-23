namespace XlentMatch.Api.Models;

public class ConsultantSkill
{
    public int Id { get; set; }
    public int ConsultantId { get; set; }

    // Compatibility columns kept until the migration cleanup step.
    public string Name { get; set; } = "";
    public string? Category { get; set; }

    public int? SkillId { get; set; }
    public Skill? Skill { get; set; }

    public int Years { get; set; }
    public int Level { get; set; }
    public string? Evidence { get; set; }
}
