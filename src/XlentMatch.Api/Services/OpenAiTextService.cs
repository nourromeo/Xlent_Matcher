using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using XlentMatch.Api.DTOs.Assignments;
using XlentMatch.Api.DTOs.Consultants;
using XlentMatch.Api.DTOs.Cv;

namespace XlentMatch.Api.Services;

public class OpenAiTextService(HttpClient http, IOptions<OpenAiOptions> options, IPromptService prompts) : IAiTextService
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
        return await AskForJsonAsync<ConsultantDraftDto>(system, text, ct);
    }

    public async Task<RequirementExtractionResultDto> ExtractRequirementsAsync(string text, CancellationToken ct)
    {
        var stockholm = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("Europe/Stockholm"));
        var today = DateOnly.FromDateTime(stockholm.DateTime).ToString("yyyy-MM-dd");
        var system = (await GetPromptAsync(PromptKeys.AssignmentExtraction, ct)).Replace("{{today}}", today, StringComparison.Ordinal);
        return await AskForJsonAsync<RequirementExtractionResultDto>(system, text, ct);
    }

    public async Task<CvAdaptationSuggestionDto> SuggestCvAdaptationAsync(ConsultantDraftDto consultant, TemporaryAssignmentDraftDto assignment, string? locale, CancellationToken ct)
    {
        var system = await GetPromptAsync(PromptKeys.CvAdaptation, ct) + "\n\nRUNTIME OUTPUT LANGUAGE INSTRUCTION:\n" + LanguageInstruction(locale);
        var user = JsonSerializer.Serialize(new { assignment, consultant }, Json);
        return await AskForJsonAsync<CvAdaptationSuggestionDto>(system, user, ct);
    }

    public static string LanguageInstruction(string? locale) => locale?.Trim().ToLowerInvariant() switch
    {
        "sv" => "Generate all user-facing prose fields in Swedish. Preserve names, companies, technologies, certifications and other factual CV data exactly; do not invent or translate technical data.",
        "es" => "Generate all user-facing prose fields in Spanish. Preserve names, companies, technologies, certifications and other factual CV data exactly; do not invent or translate technical data.",
        _ => "Generate all user-facing prose fields in English. Preserve names, companies, technologies, certifications and other factual CV data exactly; do not invent or translate technical data."
    };

    private async Task<string> GetPromptAsync(string key, CancellationToken ct)
    {
        var prompt = await prompts.GetActivePromptAsync(key, ct);
        if (prompt is null || string.IsNullOrWhiteSpace(prompt.Content))
            throw new InvalidOperationException($"No active AI prompt is configured for '{key}'.");
        return prompt.Content.Replace("{{NoInventionRule}}", NoInventionRule, StringComparison.Ordinal);
    }

    private async Task<T> AskForJsonAsync<T>(string systemPrompt, string userContent, CancellationToken ct) where T : new()
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
            throw new InvalidOperationException($"Azure OpenAI request failed ({(int)response.StatusCode}): {raw}");

        using var doc = JsonDocument.Parse(raw);
        var content = doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString() ?? "{}";
        return JsonSerializer.Deserialize<T>(content, Json) ?? new T();
    }
}
