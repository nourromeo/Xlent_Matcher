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
    private const long MaxFileSize = 10 * 1024 * 1024;

    [HttpPost("consultant")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<ConsultantDraftDto>> ExtractConsultant(
        [FromForm] ExtractionRequestDto request,
        CancellationToken ct)
    {
        var input = await GetText(request, ct);
        if (input.Error is not null) return BadRequest(input.Error);

        try
        {
            var draft = await ai.ExtractConsultantProfileAsync(input.Text!, ct);
            draft.SourceText = input.Text;
            return draft;
        }
        catch (InvalidOperationException)
        {
            return Problem(
                statusCode: StatusCodes.Status502BadGateway,
                title: "AI service unavailable",
                detail: "The AI service could not process the CV right now. Try again shortly.");
        }
    }

    [HttpPost("requirements")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<RequirementExtractionResultDto>> ExtractRequirements(
        [FromForm] ExtractionRequestDto request,
        CancellationToken ct)
    {
        var input = await GetText(request, ct);
        if (input.Error is not null) return BadRequest(input.Error);

        try
        {
            var draft = await ai.ExtractRequirementsAsync(input.Text!, ct);
            draft.SourceText = input.Text;
            return draft;
        }
        catch (InvalidOperationException)
        {
            return Problem(
                statusCode: StatusCodes.Status502BadGateway,
                title: "AI service unavailable",
                detail: "The AI service could not process the assignment requirements right now. Try again shortly.");
        }
    }

    private async Task<(string? Text, string? Error)> GetText(ExtractionRequestDto request, CancellationToken ct)
    {
        if (request.File is null || request.File.Length == 0)
        {
            if (string.IsNullOrWhiteSpace(request.Text))
                return (null, "Provide a PDF/TXT file or paste text.");

            return (request.Text.Trim(), null);
        }

        if (request.File.Length > MaxFileSize)
            return (null, "File is larger than 10 MB.");

        var extension = Path.GetExtension(request.File.FileName);
        if (!extension.Equals(".pdf", StringComparison.OrdinalIgnoreCase) &&
            !extension.Equals(".txt", StringComparison.OrdinalIgnoreCase))
        {
            return (null, "Unsupported file type. Use PDF or TXT.");
        }

        await using var stream = request.File.OpenReadStream();

        string text;
        if (extension.Equals(".pdf", StringComparison.OrdinalIgnoreCase))
        {
            text = pdf.Extract(stream);
        }
        else
        {
            using var reader = new StreamReader(stream);
            text = await reader.ReadToEndAsync(ct);
        }

        if (string.IsNullOrWhiteSpace(text))
            return (null, "No readable text was found in the file. Scanned/image-only PDFs are not supported in the MVP.");

        return (text.Trim(), null);
    }
}
