namespace XlentMatch.Api.Models;

public class Education
{
    public int Id { get; set; }
    public int ConsultantId { get; set; }
    public string Degree { get; set; } = "";
    public string? School { get; set; }
    public string? Year { get; set; }
}
