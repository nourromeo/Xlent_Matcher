using XlentMatch.Api.Models;

namespace XlentMatch.Api.DTOs.Assignments;

public class RequirementDraftDto
{
    public string Name { get; set; } = "";
    public RequirementType Type { get; set; } = RequirementType.Mandatory;
    public int? MinYears { get; set; }
    public int? MinLevel { get; set; }
    public string? Proficiency { get; set; }
    public SeniorityMatchMode? MatchMode { get; set; }
    public string? MaximumSeniority { get; set; }
    public string Category { get; set; } = "Skill";
}

public class RequirementExtractionResultDto
{
    public string? Seniority { get; set; }
    public string? SeniorityMatchMode { get; set; }
    public string? MinimumSeniority { get; set; }
    public string? MaximumSeniority { get; set; }
    public int? MinYearsExperience { get; set; }
    public string? Availability { get; set; }
    public DateOnly? RequiredStartDate { get; set; }
    public string? StartDateDescription { get; set; }
    public string? Location { get; set; }
    public List<RequirementDraftDto> Requirements { get; set; } = new();
    public string? SourceText { get; set; }
}
