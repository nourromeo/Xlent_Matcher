using XlentMatch.Api.DTOs.Assignments;
using XlentMatch.Api.DTOs.Consultants;
using XlentMatch.Api.DTOs.Cv;

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
        ConsultantDraftDto consultant, TemporaryAssignmentDraftDto assignment, CancellationToken ct);
}
