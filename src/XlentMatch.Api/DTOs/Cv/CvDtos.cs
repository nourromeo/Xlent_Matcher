using XlentMatch.Api.DTOs.Assignments;
using XlentMatch.Api.DTOs.Consultants;

namespace XlentMatch.Api.DTOs.Cv;

public class TemporaryCvSuggestionRequestDto
{
    public ConsultantDraftDto Consultant { get; set; } = new();
    public TemporaryAssignmentDraftDto Assignment { get; set; } = new();
}

public class TemporaryAssignmentDraftDto
{
    public string CustomerName { get; set; } = "";
    public string Title { get; set; } = "";
    public string? Description { get; set; }
    public string? Seniority { get; set; }
    public int MinYearsExperience { get; set; }
    public string? Availability { get; set; }
    public List<RequirementDraftDto> Requirements { get; set; } = new();
}

public class CvAdaptationSuggestionDto
{
    public string Summary { get; set; } = "";
    public List<string> HighlightedExperiences { get; set; } = new();
    public string AdaptedCvText { get; set; } = "";
    public List<string> Notes { get; set; } = new();
}
