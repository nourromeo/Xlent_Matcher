namespace XlentMatch.Api.Domain;

public class Assignment
{
    public int Id { get; set; }
    public string CustomerName { get; set; } = "";
    public string Title { get; set; } = "";
    public string? Description { get; set; }
    public int MinTotalYearsExperience { get; set; }
    public List<AssignmentRequirement> Requirements { get; set; } = new();
}

public class AssignmentRequirement
{
    public int Id { get; set; }
    public int AssignmentId { get; set; }
    public string Name { get; set; } = "";
    public RequirementType Type { get; set; } = RequirementType.Mandatory;
    public int? MinYears { get; set; }
    public int? MinLevel { get; set; } // 1-5
}
