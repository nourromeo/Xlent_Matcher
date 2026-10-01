using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using XlentMatch.Api.DTOs.Assignments;
using XlentMatch.Api.DTOs.Consultants;
using XlentMatch.Api.DTOs.Cv;

namespace XlentMatch.Api.Services;

public class OpenAiTextService(HttpClient http, IOptions<OpenAiOptions> options) : IAiTextService
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    private const string NoInventionRule =
        "STRICT RULES: Use ONLY information explicitly present in the provided text. " +
        "Never invent, assume or embellish skills, experiences, certifications, dates or numbers. " +
        "If something is unknown, use null, 0 or an empty list. Respond with valid JSON only.";

    public Task<ConsultantDraftDto> ExtractConsultantProfileAsync(string text, CancellationToken ct)
    {
        var stockholm = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("Europe/Stockholm"));
        var today = DateOnly.FromDateTime(stockholm.DateTime).ToString("yyyy-MM-dd");
        var system = $$"""
            You extract structured consultant profiles from CV text.
            {{NoInventionRule}}
            Extract skill names exactly enough for later normalization, but do NOT classify skills into categories.
            Seniority: provide a suggestedSeniority using only Junior, Mid, Senior or Staff, based only on evidence actually present in the CV. Consider explicit roles/titles, technical ownership, independent delivery, architecture/design responsibility, technical leadership, mentoring and scope or cross-team responsibility. Total years may support the suggestion but must never determine it by itself. Do not invent responsibilities. If evidence is insufficient, return null. This is a suggestion for human review.
            Experience: yearsOfExperience should be null unless the CV explicitly states total professional years. The application may calculate an estimate from dated roles and will label its source.
            Do not infer or extract consultant availability. Availability is maintained manually by an admin.
            For human languages, put only the language name in name. Set proficiency only when an explicit descriptor maps to Low, Medium, High or Native; otherwise use Not specified. Do not infer proficiency. Do not use CEFR levels.
            The application's canonical Skill Catalog is the source of truth for skill names, aliases and categories.
            Return a JSON object with exactly this shape:
            {
              "firstName": string, "lastName": string, "email": string|null, "title": string|null,
              "summary": string|null, "seniority": null, "suggestedSeniority": "Junior"|"Mid"|"Senior"|"Staff"|null, "yearsOfExperience": int|null,
              "yearsOfExperienceSource": "ExplicitInCv"|null, "office": string|null,
              "skills": [{ "name": string, "level": int, "years": int, "evidence": string|null }],
              "experiences": [{ "company": string, "role": string, "description": string|null,
                                 "startDate": "yyyy-MM"|null, "endDate": "yyyy-MM"|null }],
              "projects": [{ "name": string, "description": string|null, "technologies": "comma, separated"|null }],
              "education": [{ "degree": string, "school": string|null, "year": string|null }],
              "languages": [{ "name": canonical language name only (for example "Swedish", "English", "Arabic"), "proficiency": "Not specified"|"Low"|"Medium"|"High"|"Native" }],
              "industries": [string],
              "certifications": [{ "name": string, "issuer": string|null, "issuedDate": "yyyy-MM"|null }]
            }
            """;

        return AskForJsonAsync<ConsultantDraftDto>(system, text, ct);
    }

    public Task<RequirementExtractionResultDto> ExtractRequirementsAsync(string text, CancellationToken ct)
    {
        var stockholm = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("Europe/Stockholm"));
        var today = DateOnly.FromDateTime(stockholm.DateTime).ToString("yyyy-MM-dd");
        var system = NoInventionRule + $$"""
            
            You extract structured information from a customer assignment / requirement specification.
            The current date in Europe/Stockholm is {{today}}.

            Separate assignment metadata from actual consultant requirements.

            Assignment metadata:
            - seniority: only values such as Junior, Mid, Senior or Staff when explicitly stated; otherwise null.
            - minYearsExperience: the overall minimum years of professional experience when explicitly stated; otherwise null.
            - availability: preserve explicit availability wording; otherwise null. Resolve relative timing against today={{today}} into requiredStartDate (yyyy-MM-dd); otherwise null.
            - location: an explicit work location or Remote/Hybrid arrangement; otherwise null.

            Requirements:
            - Include concrete technical skills, technologies, platforms, tools, certifications, methods or clearly named competencies with category "Skill".
            - Include explicit human language requirements (for example Swedish or English) as separate requirements with category "HumanLanguage". Do not treat programming languages such as C# or Python as human languages.
            - Do NOT create requirements such as "senior consultant", ".NET consultant", role titles, availability, location, customer name, start date, or general years-of-experience statements.
            - If a requirement has its own explicit minimum years, put that number in minYears.
            - For human languages, set proficiency only when the assignment explicitly requires one of Not specified, Low, Medium, High or Native. Otherwise use null.
            - Classify as "Mandatory" when the text says must, required, mandatory, shall, need, or equivalent.
            - Classify as "Desired" when the text says preferred, meriting, bonus, nice to have, or equivalent.
            - If the text lists a skill without clearly saying preferred/optional, treat it as Mandatory.
            - Keep technology names concise, for example "C#", "ASP.NET Core", "SQL Server", "Azure", "React", "Docker".

            Return a JSON object with exactly this shape:
            {
              "seniority": string|null,
              "minYearsExperience": int|null,
              "availability": string|null, "requiredStartDate": "yyyy-MM-dd"|null,
              "location": string|null,
              "requirements": [
                { "name": string, "category": "Skill"|"HumanLanguage", "type": "Mandatory"|"Desired", "minYears": int|null, "minLevel": int|null, "proficiency": string|null }
              ]
            }
            """;

        return AskForJsonAsync<RequirementExtractionResultDto>(system, text, ct);
    }

    public Task<CvAdaptationSuggestionDto> SuggestCvAdaptationAsync(
        ConsultantDraftDto consultant, TemporaryAssignmentDraftDto assignment, CancellationToken ct)
    {
        var system = $$"""
            You help a consultant tailor an existing CV to a customer assignment.
            {{NoInventionRule}}
            You may reorder, emphasize and rephrase EXISTING CV content so relevant experience is highlighted.
            You must NOT invent skills, experiences, certifications, employers, dates or achievements.
            If the assignment asks for something missing from the CV, mention the gap in notes instead of adding it.
            The result is temporary and intended for user review, copying or printing.
            Return a JSON object with exactly this shape:
            {
              "summary": string,
              "highlightedExperiences": [string],
              "adaptedCvText": string,
              "notes": [string]
            }
            """;

        var user = JsonSerializer.Serialize(new
        {
            assignment,
            consultant
        }, Json);

        return AskForJsonAsync<CvAdaptationSuggestionDto>(system, user, ct);
    }


    private async Task<T> AskForJsonAsync<T>(string systemPrompt, string userContent, CancellationToken ct) where T : new()
    {
        var o = options.Value;

        if (string.IsNullOrWhiteSpace(o.ApiKey) ||
            string.IsNullOrWhiteSpace(o.Endpoint) ||
            string.IsNullOrWhiteSpace(o.Model))
        {
            throw new InvalidOperationException(
                "Azure OpenAI is not configured. Set OpenAi:Endpoint, OpenAi:ApiKey and OpenAi:Model using configuration or user secrets.");
        }

        var requestUrl = $"{o.Endpoint.TrimEnd('/')}/chat/completions";

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

        using var request = new HttpRequestMessage(HttpMethod.Post, requestUrl);
        request.Headers.Add("api-key", o.ApiKey);
        request.Content = JsonContent.Create(body);

        using var response = await http.SendAsync(request, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"Azure OpenAI request failed ({(int)response.StatusCode}): {raw}");

        using var doc = JsonDocument.Parse(raw);
        var content = doc.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString() ?? "{}";

        return JsonSerializer.Deserialize<T>(content, Json) ?? new T();
    }
}
