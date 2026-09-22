using Microsoft.AspNetCore.Mvc;
using XlentMatch.Api.Application;

namespace XlentMatch.Api.Controllers;

/// <summary>
/// Hybrid flow: upload a PDF (or paste text) -> extract -> return a draft for the user to review.
/// Nothing is saved here. The user saves via /api/consultants or /api/assignments after review.
/// </summary>
[ApiController]
[Route("api/extraction")]
public class ExtractionController(IPdfTextExtractor pdf, IAiTextService ai) : ControllerBase
{
    [HttpPost("consultant")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<ConsultantDraft>> ExtractConsultant([FromForm] ExtractionRequest request, CancellationToken ct)
    {
        var text = await GetText(request, ct);
        if (string.IsNullOrWhiteSpace(text))
            return BadRequest("Provide a PDF/text file or raw text.");

        var draft = await ai.ExtractConsultantProfileAsync(text, ct);
        draft.SourceText = text; // so the frontend can store it as OriginalCvText
        return draft;
    }

    [HttpPost("requirements")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<List<RequirementDraft>>> ExtractRequirements([FromForm] ExtractionRequest request, CancellationToken ct)
    {
        var text = await GetText(request, ct);
        if (string.IsNullOrWhiteSpace(text))
            return BadRequest("Provide a PDF/text file or raw text.");

        return await ai.ExtractRequirementsAsync(text, ct);
    }

    private async Task<string?> GetText(ExtractionRequest request, CancellationToken ct)
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
