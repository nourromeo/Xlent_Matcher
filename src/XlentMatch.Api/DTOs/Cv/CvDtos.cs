namespace XlentMatch.Api.DTOs.Cv;

public class CvSuggestionRequestDto
{
    public int ConsultantId { get; set; }
    public int AssignmentId { get; set; }
}

public class SaveAdaptedCvRequestDto
{
    public int ConsultantId { get; set; }
    public int AssignmentId { get; set; }
    public string Content { get; set; } = "";
}

public class CvAdaptationSuggestionDto
{
    public string Summary { get; set; } = "";
    public List<string> HighlightedExperiences { get; set; } = new();
    public string AdaptedCvText { get; set; } = "";
    public List<string> Notes { get; set; } = new();
}
