namespace XlentMatch.Api.DTOs.Extraction;

public class ExtractionRequestDto
{
    public IFormFile? File { get; set; }
    public string? Text { get; set; }
}
