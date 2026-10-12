namespace XlentMatch.Api.DTOs.Matching;

public class RunMatchingRequestDto
{
    public int AssignmentId { get; set; }
    public List<int> ConsultantIds { get; set; } = new();
}

public sealed class AiRankingResultDto
{
    public List<AiRankedConsultantDto> Rankings { get; set; } = new();
    public int SkippedWithoutCv { get; set; }
}

public sealed class AiRankedConsultantDto
{
    public int ConsultantId { get; set; }
    public int Rank { get; set; }
    public string Reason { get; set; } = "";
    public List<string> Strengths { get; set; } = new();
    public List<string> Gaps { get; set; } = new();
    public List<string> Evidence { get; set; } = new();
}
