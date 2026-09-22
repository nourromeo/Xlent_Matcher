using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using XlentMatch.Api.Application;
using XlentMatch.Api.Domain;

namespace XlentMatch.Api.Infrastructure;

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

    public Task<ConsultantDraft> ExtractConsultantProfileAsync(string text, CancellationToken ct)
    {
        var system = $$"""
            You extract structured consultant profiles from CV text.
            {{NoInventionRule}}
            Return a JSON object with exactly this shape:
            {
              "firstName": string, "lastName": string, "email": string|null, "title": string|null,
              "summary": string|null, "yearsOfExperience": int,
              "skills": [{ "name": string, "level": int (1-5, 0 if unknown), "years": int }],
              "experiences": [{ "company": string, "role": string, "description": string|null,
                                 "startDate": "yyyy-MM"|null, "endDate": "yyyy-MM"|null }],
              "projects": [{ "name": string, "description": string|null, "technologies": "comma, separated"|null }],
              "certifications": [{ "name": string, "issuer": string|null, "issuedDate": "yyyy-MM"|null }]
            }
            """;

        return AskForJsonAsync<ConsultantDraft>(system, text, ct);
    }

    public async Task<List<RequirementDraft>> ExtractRequirementsAsync(string text, CancellationToken ct)
    {
        var system = $$"""
            You extract requirements from customer assignment / requirement specification text.
            {{NoInventionRule}}
            Classify each requirement as "Mandatory" (must have, required, krav, ska) or "Desired"
            (nice to have, meriterande, önskvärt, bör).
            Return a JSON object with exactly this shape:
            {
              "requirements": [
                { "name": string, "type": "Mandatory"|"Desired", "minYears": int|null, "minLevel": int|null }
              ]
            }
            """;

        var result = await AskForJsonAsync<RequirementExtractionResult>(system, text, ct);
        return result.Requirements;
    }

    public Task<CvAdaptationSuggestion> SuggestCvAdaptationAsync(
        Consultant consultant, Assignment assignment, MatchResult? match, CancellationToken ct)
    {
        var system = $$"""
            You help a consultant tailor an existing CV to a customer assignment.
            {{NoInventionRule}}
            You may reorder, emphasize and rephrase EXISTING content so relevant experience is highlighted.
            You must NOT add skills or experiences that are not in the profile, and you must NOT change
            or comment on the numeric match score. The user reviews everything before use.
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
            assignment = new
            {
                assignment.CustomerName, assignment.Title, assignment.Description,
                assignment.MinTotalYearsExperience,
                requirements = assignment.Requirements.Select(r => new { r.Name, r.Type, r.MinYears, r.MinLevel })
            },
            consultant = new
            {
                consultant.FirstName, consultant.LastName, consultant.Title, consultant.Summary,
                consultant.YearsOfExperience,
                skills = consultant.Skills.Select(s => new { s.Name, s.Level, s.Years }),
                experiences = consultant.Experiences.Select(e => new { e.Company, e.Role, e.Description, e.StartDate, e.EndDate }),
                projects = consultant.Projects.Select(p => new { p.Name, p.Description, p.Technologies }),
                certifications = consultant.Certifications.Select(c => new { c.Name, c.Issuer, c.IssuedDate }),
                originalCvText = consultant.OriginalCvText
            },
            matchSummary = match is null ? null : new
            {
                matched = match.Details.Where(d => d.IsMatched).Select(d => d.RequirementName),
                missing = match.Details.Where(d => !d.IsMatched).Select(d => d.RequirementName)
            }
        }, Json);

        return AskForJsonAsync<CvAdaptationSuggestion>(system, user, ct);
    }

    private async Task<T> AskForJsonAsync<T>(string systemPrompt, string userContent, CancellationToken ct) where T : new()
    {
        var o = options.Value;

        if (string.IsNullOrWhiteSpace(o.ApiKey) || o.ApiKey.StartsWith("AQUI_") ||
            string.IsNullOrWhiteSpace(o.Endpoint) || o.Endpoint.StartsWith("AQUI_"))
        {
            throw new InvalidOperationException(
                "OpenAI is not configured. Set OpenAi:Endpoint and OpenAi:ApiKey in appsettings.json.");
        }

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

        using var request = new HttpRequestMessage(HttpMethod.Post, o.Endpoint);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", o.ApiKey);
        request.Content = JsonContent.Create(body);

        using var response = await http.SendAsync(request, ct);
        var raw = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"OpenAI request failed ({(int)response.StatusCode}): {raw}");

        using var doc = JsonDocument.Parse(raw);
        var content = doc.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString() ?? "{}";

        return JsonSerializer.Deserialize<T>(content, Json) ?? new T();
    }
}
