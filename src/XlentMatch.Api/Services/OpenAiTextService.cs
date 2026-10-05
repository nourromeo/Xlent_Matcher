using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using XlentMatch.Api.DTOs.Assignments;
using XlentMatch.Api.DTOs.Consultants;
using XlentMatch.Api.DTOs.Cv;

namespace XlentMatch.Api.Services;

public class OpenAiTextService(HttpClient http, IOptions<OpenAiOptions> options, IPromptService prompts, ILogger<OpenAiTextService> logger) : IAiTextService
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    private const string NoInventionRule =
        "STRICT RULES: Use ONLY information explicitly present in the provided text. " +
        "Never invent, assume or embellish skills, experiences, certifications, dates or numbers. " +
        "If something is unknown, use null, 0 or an empty list. Respond with valid JSON only.";

    public async Task<ConsultantDraftDto> ExtractConsultantProfileAsync(string text, CancellationToken ct)
    {
        var system = await GetPromptAsync(PromptKeys.CvExtraction, ct);
        return await AskForJsonAsync<ConsultantDraftDto>(PromptKeys.CvExtraction, system, text, ct);
    }

    public async Task<RequirementExtractionResultDto> ExtractRequirementsAsync(string text, CancellationToken ct)
    {
        var stockholm = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("Europe/Stockholm"));
        var today = DateOnly.FromDateTime(stockholm.DateTime).ToString("yyyy-MM-dd");
        var system = (await GetPromptAsync(PromptKeys.AssignmentExtraction, ct)).Replace("{{today}}", today, StringComparison.Ordinal) + "\n\nRUNTIME OUTPUT CONTRACT:\n" + AssignmentExtractionSchemaInstruction;
        return await AskForJsonAsync<RequirementExtractionResultDto>(PromptKeys.AssignmentExtraction, system, text, ct);
    }

    public const string AssignmentExtractionSchemaInstruction =
        "Return exactly the DTO-compatible JSON types for every property. " +
        "For minYearsExperience, extract an explicit overall minimum experience requirement when the source states one, such as 'at least 5 years of experience', and return the JSON integer 5. If no explicit overall minimum is stated, return JSON null. Never return numeric strings, units or descriptive text. " +
        "For each requirement, Type must be the JSON string Mandatory or Desired; Name and Category must be JSON strings; MinYears and MinLevel must be JSON integers or JSON null; Proficiency, MatchMode and MaximumSeniority must be JSON strings or JSON null. Do not return empty strings for numeric fields. " +
        "Skill requirements may populate skill-specific minYears only when skill-specific years are explicitly stated, and may populate MinLevel only when an explicit numeric skill level on the existing 1-5 scale is stated; otherwise return null. Do not use MinLevel for language proficiency or seniority labels. " +
        "HumanLanguage requirements may populate Proficiency only with exactly null or one of: Not specified, Low, Medium, High, Native; MinYears and MinLevel must be null. Never return display translations or CEFR levels. " +
        "Seniority requirements should use the seniority fields and match mode; MinYears, MinLevel and Proficiency must be null. " +
        "Arrays must remain arrays, and fields that do not apply or are not explicitly present in the source must be JSON null. Preserve the no-invention rule.";

    public async Task<CvAdaptationSuggestionDto> SuggestCvAdaptationAsync(ConsultantDraftDto consultant, TemporaryAssignmentDraftDto assignment, string? locale, CancellationToken ct)
    {
        var system = await GetPromptAsync(PromptKeys.CvAdaptation, ct) + "\n\nRUNTIME OUTPUT LANGUAGE INSTRUCTION:\n" + LanguageInstruction(locale) + "\n\nRUNTIME JSON SCHEMA INSTRUCTION:\n" + AdaptationSchemaInstruction;
        var user = JsonSerializer.Serialize(new { assignment, consultant }, Json);
        return await AskForJsonAsync<CvAdaptationSuggestionDto>(PromptKeys.CvAdaptation, system, user, ct);
    }

    public static string LanguageInstruction(string? locale) => locale?.Trim().ToLowerInvariant() switch
    {
        "sv" => "Generate all user-facing prose fields in Swedish. Preserve names, companies, technologies, certifications and other factual CV data exactly; do not invent or translate technical data.",
        "es" => "Generate all user-facing prose fields in Spanish. Preserve names, companies, technologies, certifications and other factual CV data exactly; do not invent or translate technical data.",
        _ => "Generate all user-facing prose fields in English. Preserve names, companies, technologies, certifications and other factual CV data exactly; do not invent or translate technical data."
    };

    public const string AdaptationSchemaInstruction =
        "Return exactly one JSON object with exactly these properties: summary (string), highlightedExperiences (array of strings), adaptedCvText (string), and notes (array of strings). " +
        "Do not rename properties. Do not return objects inside highlightedExperiences or notes; every item in both arrays must be a string. Change only textual values to the requested language, never the JSON structure or types.";

    private async Task<string> GetPromptAsync(string key, CancellationToken ct)
    {
        var prompt = await prompts.GetActivePromptAsync(key, ct);
        if (prompt is null || string.IsNullOrWhiteSpace(prompt.Content))
            throw new InvalidOperationException($"No active AI prompt is configured for '{key}'.");
        return prompt.Content.Replace("{{NoInventionRule}}", NoInventionRule, StringComparison.Ordinal);
    }

    private async Task<T> AskForJsonAsync<T>(string operation, string systemPrompt, string userContent, CancellationToken ct) where T : new()
    {
        var o = options.Value;
        if (string.IsNullOrWhiteSpace(o.ApiKey) || string.IsNullOrWhiteSpace(o.Endpoint) || string.IsNullOrWhiteSpace(o.Model))
            throw new InvalidOperationException("Azure OpenAI is not configured. Set OpenAi:Endpoint, OpenAi:ApiKey and OpenAi:Model using configuration or user secrets.");

        var body = new
        {
            model = o.Model,
            response_format = new { type = "json_object" },
            messages = new object[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = userContent }
            }
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{o.Endpoint.TrimEnd('/')}/chat/completions");
        request.Headers.Add("api-key", o.ApiKey);
        request.Content = JsonContent.Create(body);
        using var response = await http.SendAsync(request, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("AI extraction failed after provider response. operation={Operation} stage={Stage} statusCode={StatusCode} responseLength={ResponseLength}", operation, "ProviderHttpFailure", (int)response.StatusCode, raw.Length);
            throw new InvalidOperationException($"Azure OpenAI request failed with HTTP {(int)response.StatusCode}.");
        }

        string content;
        try
        {
            using var doc = JsonDocument.Parse(raw);
            var choices = doc.RootElement.GetProperty("choices");
            content = choices[0].GetProperty("message").GetProperty("content").GetString() ?? string.Empty;
        }
        catch (JsonException exception)
        {
            logger.LogError(exception, "AI extraction failed after provider response. operation={Operation} stage={Stage} responseLength={ResponseLength} jsonPath={JsonPath}", operation, "ResponseEnvelopeParsing", raw.Length, exception.Path);
            throw new InvalidOperationException("The AI service returned an invalid response envelope.", exception);
        }
        catch (InvalidOperationException exception)
        {
            logger.LogError(exception, "AI extraction failed after provider response. operation={Operation} stage={Stage} responseLength={ResponseLength}", operation, "ResponseEnvelopeParsing", raw.Length);
            throw new InvalidOperationException("The AI service returned an invalid response envelope.", exception);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            logger.LogError(exception, "AI extraction failed after provider response. operation={Operation} stage={Stage} responseLength={ResponseLength} exceptionType={ExceptionType}", operation, "ResponseEnvelopeParsing", raw.Length, exception.GetType().Name);
            throw new InvalidOperationException("The AI service returned an invalid response envelope.", exception);
        }

        if (string.IsNullOrWhiteSpace(content))
        {
            logger.LogError("AI extraction failed after provider response. operation={Operation} stage={Stage} responseLength={ResponseLength}", operation, "EmptyAiResponse", raw.Length);
            throw new InvalidOperationException("The AI service returned an empty response.");
        }

        var hasCodeFence = content.Contains("```", StringComparison.Ordinal);
        try
        {
            return JsonSerializer.Deserialize<T>(content, Json) ?? new T();
        }
        catch (JsonException exception)
        {
            logger.LogError(exception, "AI extraction failed after provider response. operation={Operation} stage={Stage} responseLength={ResponseLength} contentLength={ContentLength} hasCodeFence={HasCodeFence} jsonPath={JsonPath} targetType={TargetType}", operation, "DtoDeserialization", raw.Length, content.Length, hasCodeFence, exception.Path, typeof(T).Name);
            throw new InvalidOperationException("The AI service returned an invalid response format.", exception);
        }
    }
}
