namespace XlentMatch.Api.Models;

public class AssignmentRequirement
{
    public int Id { get; set; }
    public int AssignmentId { get; set; }
    public int? SkillId { get; set; }
    public Skill? Skill { get; set; }

    public string Name { get; set; } = "";

    public RequirementType Type { get; set; } = RequirementType.Mandatory;
    public int? MinYears { get; set; }
    public int? MinLevel { get; set; }
    public string? Proficiency { get; set; }
    public SeniorityMatchMode MatchMode { get; set; } = SeniorityMatchMode.Exact;
    public string? MaximumSeniority { get; set; }

    public string Category { get; set; } = "Skill";
}
