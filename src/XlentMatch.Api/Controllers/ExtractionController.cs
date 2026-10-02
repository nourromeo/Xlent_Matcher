using System.Globalization;
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
            draft.Seniority ??= draft.SuggestedSeniority;
            SetExperienceYears(draft);
            foreach (var language in draft.Languages)
            {
                var normalized = SkillNormalizationService.NormalizeHumanLanguage(language.Name, language.Proficiency);
                language.Name = normalized.Name;
                language.Proficiency = normalized.Proficiency;
            }
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


    private static void SetExperienceYears(ConsultantDraftDto draft)
    {
        if (draft.YearsOfExperience is not null)
        {
            draft.YearsOfExperienceSource = "ExplicitInCv";
            return;
        }

        var ranges = new List<(int Start, int End)>();
        foreach (var item in draft.Experiences)
        {
            if (!TryMonth(item.StartDate, out var start)) continue;
            var end = TryMonth(item.EndDate, out var parsedEnd) ? parsedEnd : DateOnly.FromDateTime(DateTime.UtcNow);
            if (end < start) continue;
            ranges.Add((start.Year * 12 + start.Month, end.Year * 12 + end.Month));
        }

        if (ranges.Count == 0) { draft.YearsOfExperienceSource = null; return; }
        var ordered = ranges.OrderBy(range => range.Start).ToList();
        var totalMonths = 0;
        var currentStart = ordered[0].Start;
        var currentEnd = ordered[0].End;
        foreach (var range in ordered.Skip(1))
        {
            if (range.Start <= currentEnd + 1) currentEnd = Math.Max(currentEnd, range.End);
            else { totalMonths += currentEnd - currentStart + 1; currentStart = range.Start; currentEnd = range.End; }
        }
        totalMonths += currentEnd - currentStart + 1;
        draft.YearsOfExperience = totalMonths / 12;
        draft.YearsOfExperienceSource = "CalculatedFromExperienceDates";
    }

    private static bool TryMonth(string? value, out DateOnly month)
    {
        month = default;
        if (string.IsNullOrWhiteSpace(value)) return false;
        var parts = value.Split('-', StringSplitOptions.TrimEntries);
        if (parts.Length != 2 ||
            !int.TryParse(parts[0], NumberStyles.None, CultureInfo.InvariantCulture, out var year) ||
            !int.TryParse(parts[1], NumberStyles.None, CultureInfo.InvariantCulture, out var monthNumber) ||
            monthNumber is < 1 or > 12) return false;
        month = new DateOnly(year, monthNumber, 1);
        return true;
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
            try
            {
                text = pdf.Extract(stream);
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch
            {
                return (null, "The PDF could not be read. Make sure the file is a valid PDF and try again.");
            }
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
