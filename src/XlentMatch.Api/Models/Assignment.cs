namespace XlentMatch.Api.Models;

public class Assignment
{
    public int Id { get; set; }
    public string CustomerName { get; set; } = "";
    public string Title { get; set; } = "";
    public string? Description { get; set; }
    public string? Seniority { get; set; }
    public int MinYearsExperience { get; set; }
    public string? Availability { get; set; }
    public DateOnly? RequiredStartDate { get; set; }
    public string? StartDateDescription { get; set; }
    public string? Location { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public AssignmentStatus Status { get; set; } = AssignmentStatus.Draft;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<AssignmentRequirement> Requirements { get; set; } = new();
}
