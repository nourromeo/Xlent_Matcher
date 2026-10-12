using XlentMatch.Api.DTOs.Assignments;
using XlentMatch.Api.DTOs.Consultants;
using XlentMatch.Api.DTOs.Cv;
using XlentMatch.Api.DTOs.Matching;

namespace XlentMatch.Api.Services;

public interface IPdfTextExtractor
{
    string Extract(Stream pdfStream);
}

public interface IAiTextService
{
    Task<AiRankingResultDto> RankOriginalCvsAsync(string assignmentText, IReadOnlyList<(int ConsultantId, string CvText)> cvs, CancellationToken ct);
    Task<ConsultantDraftDto> ExtractConsultantProfileAsync(string text, CancellationToken ct);
    Task<RequirementExtractionResultDto> ExtractRequirementsAsync(string text, CancellationToken ct);
    Task<CvAdaptationSuggestionDto> SuggestCvAdaptationAsync(
        ConsultantDraftDto consultant, TemporaryAssignmentDraftDto assignment, string? locale, CancellationToken ct);
}
