using XlentMatch.Api.Domain;

namespace XlentMatch.Api.Application;

public interface IPdfTextExtractor
{
    string Extract(Stream pdfStream);
}

public interface IAiTextService
{
    Task<ConsultantDraft> ExtractConsultantProfileAsync(string text, CancellationToken ct);
    Task<List<RequirementDraft>> ExtractRequirementsAsync(string text, CancellationToken ct);
    Task<CvAdaptationSuggestion> SuggestCvAdaptationAsync(
        Consultant consultant, Assignment assignment, MatchResult? match, CancellationToken ct);
}
