namespace XlentMatch.Api.Models;

public class Project
{
    public int Id { get; set; }
    public int ConsultantId { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public string? Technologies { get; set; }
}
