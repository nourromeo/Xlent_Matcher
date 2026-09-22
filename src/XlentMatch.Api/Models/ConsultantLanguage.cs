namespace XlentMatch.Api.Models;

public class ConsultantLanguage
{
    public int Id { get; set; }
    public int ConsultantId { get; set; }
    public string Name { get; set; } = "";
    public string? Level { get; set; }
}
