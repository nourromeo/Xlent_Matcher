using XlentMatch.Api.Models;

namespace XlentMatch.Api.DTOs.Assignments;

public class RequirementDraftDto
{
    public string Name { get; set; } = "";
    public RequirementType Type { get; set; } = RequirementType.Mandatory;
    public int? MinYears { get; set; }
    public int? MinLevel { get; set; }
}

public class RequirementExtractionResultDto
{
    public List<RequirementDraftDto> Requirements { get; set; } = new();
}
