using XlentMatch.Api.DTOs.Assignments;
using XlentMatch.Api.DTOs.Consultants;

namespace XlentMatch.Api.DTOs.Cv;

public class TemporaryCvSuggestionRequestDto
{
    public ConsultantDraftDto Consultant { get; set; } = new();
    public TemporaryAssignmentDraftDto Assignment { get; set; } = new();
    public string? Locale { get; set; }
}

public class TemporaryAssignmentDraftDto
{
    public string CustomerName { get; set; } = "";
    public string Title { get; set; } = "";
    public string? Description { get; set; }
    public string? Seniority { get; set; }
    public int MinYearsExperience { get; set; }
    public string? Availability { get; set; }
    public string? Location { get; set; }
    public List<RequirementDraftDto> Requirements { get; set; } = new();
}

public class CvAdaptationSuggestionDto
{
    public string OverallAssessment { get; set; } = "";
    public List<string> Strengths { get; set; } = new();
    public List<string> RelevantExperience { get; set; } = new();
    public List<string> MissingOrWeakAreas { get; set; } = new();
    public List<string> SuggestedImprovements { get; set; } = new();
    public List<string> Evidence { get; set; } = new();
}
