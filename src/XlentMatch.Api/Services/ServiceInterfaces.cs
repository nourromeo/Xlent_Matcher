using XlentMatch.Api.DTOs.Assignments;
using XlentMatch.Api.DTOs.Consultants;
using XlentMatch.Api.DTOs.Cv;
using XlentMatch.Api.Models;

namespace XlentMatch.Api.Services;

public interface IPdfTextExtractor
{
    string Extract(Stream pdfStream);
}

public interface IAiTextService
{
    Task<ConsultantDraftDto> ExtractConsultantProfileAsync(string text, CancellationToken ct);
    Task<RequirementExtractionResultDto> ExtractRequirementsAsync(string text, CancellationToken ct);
    Task<CvAdaptationSuggestionDto> SuggestCvAdaptationAsync(
        Consultant consultant, Assignment assignment, MatchResult? match, CancellationToken ct);
}
