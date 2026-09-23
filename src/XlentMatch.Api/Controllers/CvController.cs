using Microsoft.AspNetCore.Mvc;
using XlentMatch.Api.DTOs.Cv;
using XlentMatch.Api.Services;

namespace XlentMatch.Api.Controllers;

[ApiController]
[Route("api/cv")]
public class CvController(IAiTextService ai) : ControllerBase
{
    [HttpPost("suggest-temporary")]
    public async Task<ActionResult<CvAdaptationSuggestionDto>> SuggestTemporary(
        TemporaryCvSuggestionRequestDto request,
        CancellationToken ct)
    {
        return await ai.SuggestCvAdaptationAsync(request.Consultant, request.Assignment, ct);
    }
}
