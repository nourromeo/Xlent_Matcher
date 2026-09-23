namespace XlentMatch.Api.Models;

public class AssignmentRequirement
{
    public int Id { get; set; }
    public int AssignmentId { get; set; }

    // Compatibility name kept until the migration cleanup step.
    public string Name { get; set; } = "";

    public int? SkillId { get; set; }
    public Skill? Skill { get; set; }

    public RequirementType Type { get; set; } = RequirementType.Mandatory;
    public int? MinYears { get; set; }
    public int? MinLevel { get; set; }
}
