using Microsoft.AspNetCore.Mvc;
using XlentMatch.Api.DTOs.Assignments;
using XlentMatch.Api.DTOs.Consultants;
using XlentMatch.Api.DTOs.Extraction;
using XlentMatch.Api.Services;

namespace XlentMatch.Api.Controllers;

[ApiController]
[Route("api/extraction")]
public class ExtractionController(IPdfTextExtractor pdf, IAiTextService ai) : ControllerBase
{
    [HttpPost("consultant")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<ConsultantDraftDto>> ExtractConsultant(
        [FromForm] ExtractionRequestDto request,
        CancellationToken ct)
    {
        var text = await GetText(request, ct);
        if (string.IsNullOrWhiteSpace(text))
            return BadRequest("Provide a PDF/text file or raw text.");

        var draft = await ai.ExtractConsultantProfileAsync(text, ct);
        draft.SourceText = text;
        return draft;
    }

    [HttpPost("requirements")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<RequirementExtractionResultDto>> ExtractRequirements(
        [FromForm] ExtractionRequestDto request,
        CancellationToken ct)
    {
        var text = await GetText(request, ct);
        if (string.IsNullOrWhiteSpace(text))
            return BadRequest("Provide a PDF/text file or raw text.");

        var draft = await ai.ExtractRequirementsAsync(text, ct);
        draft.SourceText = text;
        return draft;
    }

    private async Task<string?> GetText(ExtractionRequestDto request, CancellationToken ct)
    {
        if (request.File is null || request.File.Length == 0)
            return request.Text;

        await using var stream = request.File.OpenReadStream();

        if (request.File.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
            return pdf.Extract(stream);

        using var reader = new StreamReader(stream);
        return await reader.ReadToEndAsync(ct);
    }
}
