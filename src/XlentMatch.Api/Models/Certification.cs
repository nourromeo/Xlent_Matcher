namespace XlentMatch.Api.Models;

public class Certification
{
    public int Id { get; set; }
    public int ConsultantId { get; set; }
    public string Name { get; set; } = "";
    public string? Issuer { get; set; }
    public DateOnly? IssuedDate { get; set; }
}
