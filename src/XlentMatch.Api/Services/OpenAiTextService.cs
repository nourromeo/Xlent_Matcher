using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using XlentMatch.Api.DTOs.Assignments;
using XlentMatch.Api.DTOs.Consultants;
using XlentMatch.Api.DTOs.Cv;
using XlentMatch.Api.Models;

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
        var system = $$"""
            You extract structured consultant profiles from CV text.
            {{NoInventionRule}}
            Return a JSON object with exactly this shape:
            {
              "firstName": string, "lastName": string, "email": string|null, "title": string|null,
              "summary": string|null, "seniority": string|null, "yearsOfExperience": int,
              "availability": string|null, "office": string|null,
              "skills": [{ "name": string, "category": string|null, "level": int, "years": int, "evidence": string|null }],
              "experiences": [{ "company": string, "role": string, "description": string|null,
                                 "startDate": "yyyy-MM"|null, "endDate": "yyyy-MM"|null }],
              "projects": [{ "name": string, "description": string|null, "technologies": "comma, separated"|null }],
              "education": [{ "degree": string, "school": string|null, "year": string|null }],
              "languages": [{ "name": string, "level": string|null }],
              "industries": [string],
              "certifications": [{ "name": string, "issuer": string|null, "issuedDate": "yyyy-MM"|null }]
            }
            """;

        return AskForJsonAsync<ConsultantDraftDto>(system, text, ct);
    }

    public Task<RequirementExtractionResultDto> ExtractRequirementsAsync(string text, CancellationToken ct)
    {
        var system = NoInventionRule + """
            
            You extract structured information from a customer assignment / requirement specification.

            Separate assignment metadata from actual consultant requirements.

            Assignment metadata:
            - seniority: only values such as Junior, Mid, Senior or Staff when explicitly stated; otherwise null.
            - minYearsExperience: the overall minimum years of professional experience when explicitly stated; otherwise null.
            - availability: an explicit availability requirement such as Immediate, 2 weeks, or a stated start date; otherwise null.

            Requirements:
            - Include only concrete skills, technologies, platforms, tools, certifications, methods or clearly named competencies.
            - Do NOT create requirements such as "senior consultant", ".NET consultant", role titles, availability, location, customer name, start date, or general years-of-experience statements.
            - If a requirement has its own explicit minimum years, put that number in minYears.
            - Classify as "Mandatory" when the text says must, required, mandatory, shall, need, or equivalent.
            - Classify as "Desired" when the text says preferred, meriting, bonus, nice to have, or equivalent.
            - If the text lists a skill without clearly saying preferred/optional, treat it as Mandatory.
            - Keep technology names concise, for example "C#", "ASP.NET Core", "SQL Server", "Azure", "React", "Docker".

            Return a JSON object with exactly this shape:
            {
              "seniority": string|null,
              "minYearsExperience": int|null,
              "availability": string|null,
              "requirements": [
                { "name": string, "type": "Mandatory"|"Desired", "minYears": int|null, "minLevel": int|null }
              ]
            }
            """;

        return AskForJsonAsync<RequirementExtractionResultDto>(system, text, ct);
    }

    public Task<CvAdaptationSuggestionDto> SuggestCvAdaptationAsync(
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
                assignment.CustomerName,
                assignment.Title,
                assignment.Description,
                assignment.Seniority,
                assignment.MinYearsExperience,
                assignment.Availability,
                requirements = assignment.Requirements.Select(r => new { r.Name, r.Type, r.MinYears, r.MinLevel })
            },
            consultant = new
            {
                consultant.FirstName,
                consultant.LastName,
                consultant.Title,
                consultant.Summary,
                consultant.Seniority,
                consultant.YearsOfExperience,
                consultant.Availability,
                consultant.Office,
                skills = consultant.Skills.Select(s => new { s.Name, s.Category, s.Level, s.Years, s.Evidence }),
                experiences = consultant.Experiences.Select(e => new { e.Company, e.Role, e.Description, e.StartDate, e.EndDate }),
                projects = consultant.Projects.Select(p => new { p.Name, p.Description, p.Technologies }),
                education = consultant.Education.Select(e => new { e.Degree, e.School, e.Year }),
                languages = consultant.Languages.Select(l => new { l.Name, l.Level }),
                industries = consultant.Industries.Select(i => i.Name),
                certifications = consultant.Certifications.Select(c => new { c.Name, c.Issuer, c.IssuedDate }),
                originalCvText = consultant.OriginalCvText
            },
            matchSummary = match is null ? null : new
            {
                matched = match.Details.Where(d => d.IsMatched).Select(d => d.RequirementName),
                missing = match.Details.Where(d => !d.IsMatched).Select(d => d.RequirementName)
            }
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
