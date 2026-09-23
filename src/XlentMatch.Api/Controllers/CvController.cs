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
        if (string.IsNullOrWhiteSpace(request.Consultant.FirstName) &&
            string.IsNullOrWhiteSpace(request.Consultant.LastName) &&
            request.Consultant.Skills.Count == 0 &&
            request.Consultant.Experiences.Count == 0)
        {
            return BadRequest("The consultant input does not contain enough CV information.");
        }

        if (request.Assignment.Requirements.Count == 0 &&
            string.IsNullOrWhiteSpace(request.Assignment.Description))
        {
            return BadRequest("The assignment input does not contain requirements or a description.");
        }

        try
        {
            return await ai.SuggestCvAdaptationAsync(request.Consultant, request.Assignment, ct);
        }
        catch (InvalidOperationException)
        {
            return Problem(
                statusCode: StatusCodes.Status502BadGateway,
                title: "AI service unavailable",
                detail: "The AI service could not generate CV suggestions right now. Try again shortly.");
        }
    }
}
