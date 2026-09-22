namespace XlentMatch.Api.Models;

public class AssignmentRequirement
{
    public int Id { get; set; }
    public int AssignmentId { get; set; }
    public string Name { get; set; } = "";
    public RequirementType Type { get; set; } = RequirementType.Mandatory;
    public int? MinYears { get; set; }
    public int? MinLevel { get; set; }
}
