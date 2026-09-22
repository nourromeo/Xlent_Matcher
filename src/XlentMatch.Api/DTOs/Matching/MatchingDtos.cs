namespace XlentMatch.Api.DTOs.Matching;

public class RunMatchingRequestDto
{
    public int AssignmentId { get; set; }
    public List<int> ConsultantIds { get; set; } = new();
}
