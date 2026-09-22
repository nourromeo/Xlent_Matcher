namespace XlentMatch.Api.Models;

public class Experience
{
    public int Id { get; set; }
    public int ConsultantId { get; set; }
    public string Company { get; set; } = "";
    public string Role { get; set; } = "";
    public string? Description { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
}
