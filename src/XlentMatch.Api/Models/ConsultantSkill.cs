namespace XlentMatch.Api.Models;

public class ConsultantSkill
{
    public int Id { get; set; }
    public int ConsultantId { get; set; }
    public string Name { get; set; } = "";
    public string? Category { get; set; }
    public int Years { get; set; }
    public int Level { get; set; }
    public string? Evidence { get; set; }
}
