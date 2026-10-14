using System.Text.Json;
using System.Text.Json.Serialization;
using System.Diagnostics;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using XlentMatch.Api.DTOs.Assignments;
using XlentMatch.Api.DTOs.Consultants;
using XlentMatch.Api.DTOs.Cv;
using XlentMatch.Api.DTOs.Matching;

namespace XlentMatch.Api.Services;

public class OpenAiTextService(HttpClient http, IOptions<OpenAiOptions> options, IPromptService prompts, ILogger<OpenAiTextService> logger) : IAiTextService
{
    public sealed record AssignmentExtractionDiagnostic(string PromptKey, int PromptVersion, bool PromptActive, string Model, int RequirementCount, int SkillRequirementCount, int HumanLanguageRequirementCount, int OtherRequirementCount);

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    private const string NoInventionRule =
        "STRICT RULES: Use ONLY information explicitly present in the provided text. " +
        "Never invent, assume or embellish skills, experiences, certifications, dates or numbers. " +
        "If something is unknown, use null, 0 or an empty list. Respond with valid JSON only.";


    public async Task<AiRankingResultDto> RankOriginalCvsAsync(string assignmentText, IReadOnlyList<(int ConsultantId, string CvText)> cvs, CancellationToken ct)
    {
        const string operation = "ai_original_cv_ranking";
        const string system = "You compare exactly two existing consultants for an internal customer assignment. " +
            "Use ONLY the original CV text and the assignment text provided. Never invent qualifications. " +
            "Return both consultant IDs once each, ordered by fit with rank 1 and 2. " +
            "Give concise reasons, strengths, gaps, and specific factual evidence from the documents. " +
            "Do not use or invent numeric match scores. Respond in valid JSON using the required schema.";
        var input = JsonSerializer.Serialize(new
        {
            assignmentText,
            consultants = cvs.Select(x => new { consultantId = x.ConsultantId, originalCvText = x.CvText })
        }, Json);
        var result = await AskForJsonAsync<AiRankingResultDto>(operation, system, input, ct);
        var ids = cvs.Select(x => x.ConsultantId).ToHashSet();
        if (result.Rankings.Count != 2 ||
            result.Rankings.Select(x => x.ConsultantId).Distinct().Count() != 2 ||
            result.Rankings.Any(x => !ids.Contains(x.ConsultantId)) ||
            result.Rankings.Select(x => x.Rank).Order().SequenceEqual(new[] { 1, 2 }) == false)
            throw new InvalidOperationException("AI returned an invalid consultant ranking.");
        return result;
    }

    public async Task<ConsultantDraftDto> ExtractConsultantProfileAsync(string text, CancellationToken ct)
    {
        var system = (await GetPromptAsync(PromptKeys.CvExtraction, ct)).Content + "\n\nRUNTIME OUTPUT CONTRACT:\n" + CvExtractionSchemaInstruction;
        return await AskForJsonAsync<ConsultantDraftDto>(PromptKeys.CvExtraction, system, text, ct);
    }

    public const string CvExtractionSchemaInstruction =
        "Optional scalar profile fields may be JSON null when the CV does not state them. Collection items must not be fabricated: only include a skill with a non-empty name, an experience with a non-empty company or role, a project with a non-empty name, education with a non-empty degree, a language with a non-empty name, or a certification with a non-empty name. Prefer competencies explicitly listed in a skills/competence section. Extract matchable professional competencies, technologies, tools, frameworks, platforms and explicitly stated methodologies, but do not turn generic responsibilities or activities in prose into skills. Do not deliberately combine unrelated competencies into a new skill label. Do not return collection items with null or empty identifying fields. Language proficiency must be exactly null or one of: Not specified, Low, Medium, High, Native; when a language is present but proficiency is not explicitly stated, return Not specified and do not infer it from the language name. Numeric skill level must be a JSON integer; skill years must be a JSON integer or null; preserve explicit skill-specific years, do not sum overlapping work periods, do not use total experience as skill years, and use null for unknown skill years; use 0 only when the CV explicitly establishes zero professional years for that skill. Do not invent skill years. When a CV explicitly states a language proficiency, preserve its meaning: flytande/fluent/professionell nivå -> High, god nivå -> Medium, modersmål/native -> Native; use Not specified only when the source provides no proficiency. Negative statements such as 'ingen tidigare yrkesanställning', 'no work experience', or 'har inte haft någon anställning' must never become experience records; return an empty experiences list when no actual job is described. For total years of professional experience, use explicitly stated total years when available; otherwise derive completed whole years from dated professional employment without double-counting overlapping periods. For example, 1 year and 9 months becomes 1 completed year, not 2. Do not count school projects as professional employment. Preserve original employment dates. For certifications: issuedDate must be null unless a month/day is explicitly stated; when only the issue year is stated (e.g. 2023), set issuedYear to that four-digit year and issuedDate to null. Never invent January or any other month. When an exact date is stated, populate issuedDate and issuedYear with its year.";

    public async Task<RequirementExtractionResultDto> ExtractRequirementsAsync(string text, CancellationToken ct)
    {
        var stockholm = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("Europe/Stockholm"));
        var today = DateOnly.FromDateTime(stockholm.DateTime).ToString("yyyy-MM-dd");
        var prompt = await GetPromptAsync(PromptKeys.AssignmentExtraction, ct);
        var system = prompt.Content.Replace("{{today}}", today, StringComparison.Ordinal) + "\n\nRUNTIME OUTPUT CONTRACT:\n" + AssignmentExtractionSchemaInstruction;
        var result = await AskForJsonAsync<RequirementExtractionResultDto>(PromptKeys.AssignmentExtraction, system, text, ct);
        var diagnostic = CreateAssignmentExtractionDiagnostic(prompt, options.Value.Model, result);
        logger.LogInformation("Assignment extraction parsed. TraceId={TraceId} PromptKey={PromptKey} PromptVersion={PromptVersion} PromptActive={PromptActive} Model={Model} RequirementCount={RequirementCount} SkillRequirementCount={SkillRequirementCount} HumanLanguageRequirementCount={HumanLanguageRequirementCount} OtherRequirementCount={OtherRequirementCount}", Activity.Current?.TraceId.ToString() ?? "none", diagnostic.PromptKey, diagnostic.PromptVersion, diagnostic.PromptActive, diagnostic.Model, diagnostic.RequirementCount, diagnostic.SkillRequirementCount, diagnostic.HumanLanguageRequirementCount, diagnostic.OtherRequirementCount);
        return result;
    }

    public const string AssignmentExtractionSchemaInstruction =
        "First extract assignment-level facts independently of requirement filtering: preserve explicit seniority, overall minimum experience, location and work mode, availability when stated, and required start date when stated. These fields describe the assignment and must not be discarded because nearby text describes responsibilities. Then extract consultant requirements separately. Return exactly the DTO-compatible JSON types for every property. " +
        "For minYearsExperience, extract an explicit overall minimum experience requirement when the source states one, such as 'at least 5 years of experience', and return the JSON integer 5. If no explicit overall minimum is stated, return JSON null. Never return numeric strings, units or descriptive text. " +
        "Preserve explicit seniority labels using the canonical values Junior, Mid, Senior or Staff; do not default to Mid and do not infer seniority from years. " +
        "Extract availability only when the source explicitly states it; otherwise return null. Extract location exactly when stated. If both a place and an explicit work mode such as hybrid are stated and the existing single location field is used, preserve both in that field (for example, Stockholm / Hybrid). " +
        "Only create Skill or HumanLanguage requirements when the source expresses consultant competence or qualification, such as experience of, must have, required, mandatory, desirable, competence in, knowledge of, or an equivalent phrase in English, Swedish or Spanish. Responsibility or assignment-description language alone is not a requirement: do not extract activities such as working with, developing, maintaining, participating in, responsible for, or the work involves as skills. For example, 'the consultant shall work with development and further development of backend services and APIs' describes the assignment and must not become a Skill requirement. If the same sentence also explicitly requires experience with a technology, extract only that technology requirement. Do not remove a technology merely because it appears in a descriptive sentence when a separate explicit competence requirement exists. " +
        "For each requirement, Type must be the JSON string Mandatory or Desired; Name and Category must be JSON strings; MinYears and MinLevel must be JSON integers or JSON null; MaximumSeniority must be a JSON string or JSON null. MatchMode is applicable only to Seniority requirements and must be exactly one of the JSON strings \"Exact\", \"Minimum\" or \"Range\", or JSON null where not applicable. Do not return translated or descriptive values, empty strings, numbers, or alternative spellings for MatchMode. For Skill and HumanLanguage requirements, MatchMode must be JSON null. Do not return empty strings for numeric fields. " +
        "Skill requirements may populate skill-specific minYears only when skill-specific years are explicitly stated, and may populate MinLevel only when an explicit numeric skill level on the existing 1-5 scale is stated; otherwise return null. Do not use MinLevel for language proficiency or seniority labels. " +
        "HumanLanguage requirements may populate Proficiency only with exactly null or one of: Not specified, Low, Medium, High, Native; MinYears and MinLevel must be null. Never return display translations or CEFR levels. " +
        "Extract assignment seniority only into the root seniority, seniorityMatchMode, minimumSeniority and maximumSeniority fields. Do not create a Seniority item in requirements[]. Requirements[] may contain only Skill and HumanLanguage items. " +
        "Set startDateDescription to the exact source wording for relative or imprecise assignment start timing (e.g. 'Inom 1-2 månader'); otherwise null. For requiredStartDate, return only an explicitly stated complete calendar date as an ISO 8601 yyyy-MM-dd string, or JSON null. Relative or imprecise start times such as 'inom 1-2 månader', 'ASAP', 'next month', month-only or year-only expressions must result in requiredStartDate: null. Preserve the original relative wording in sourceText; never invent a calendar day. " +
        "Arrays must remain arrays, and fields that do not apply or are not explicitly present in the source must be JSON null. Preserve the no-invention rule.";

    public async Task<CvAdaptationSuggestionDto> SuggestCvAdaptationAsync(ConsultantDraftDto consultant, TemporaryAssignmentDraftDto assignment, string? locale, CancellationToken ct)
    {
        var system = (await GetPromptAsync(PromptKeys.CvAdaptation, ct)).Content + "\n\nRUNTIME OUTPUT LANGUAGE INSTRUCTION:\n" + LanguageInstruction(locale) + "\n\nRUNTIME JSON SCHEMA INSTRUCTION:\n" + AdaptationSchemaInstruction;
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
        "This feature is an internal CV analysis report, not a CV generator. Do not write or rewrite a complete CV. " +
        "Return exactly one JSON object with exactly these properties: overallAssessment (string), strengths (array of strings), relevantExperience (array of strings), missingOrWeakAreas (array of strings), suggestedImprovements (array of strings), and evidence (array of strings). " +
        "Strengths and relevantExperience must describe only facts supported by the consultant CV. MissingOrWeakAreas must identify assignment requirements that are absent, unclear or weakly evidenced in the CV. SuggestedImprovements must tell the consultant what to clarify, emphasize or verify in their own CV without inventing experience. Evidence must cite concise supporting facts from the provided CV data. " +
        "Do not rename properties. Every array item must be a string. Change only textual values to the requested language, never the JSON structure or types.";

    private async Task<ActivePromptContext> GetPromptAsync(string key, CancellationToken ct)
    {
        var prompt = await prompts.GetActivePromptContextAsync(key, ct);
        if (prompt is null || string.IsNullOrWhiteSpace(prompt.Content))
            throw new InvalidOperationException($"No active AI prompt is configured for '{key}'.");
        return prompt with { Content = prompt.Content.Replace("{{NoInventionRule}}", NoInventionRule, StringComparison.Ordinal) };
    }

    public static AssignmentExtractionDiagnostic CreateAssignmentExtractionDiagnostic(ActivePromptContext prompt, string model, RequirementExtractionResultDto draft)
    {
        return new(prompt.Key, prompt.Version, prompt.IsActive, model, draft.Requirements.Count, draft.Requirements.Count(item => string.Equals(item.Category, "Skill", StringComparison.OrdinalIgnoreCase)), draft.Requirements.Count(item => string.Equals(item.Category, "HumanLanguage", StringComparison.OrdinalIgnoreCase)), draft.Requirements.Count(item => !new[] { "Skill", "HumanLanguage" }.Contains(item.Category, StringComparer.OrdinalIgnoreCase)));
    }

    private async Task<T> AskForJsonAsync<T>(string operation, string systemPrompt, string userContent, CancellationToken ct) where T : new()
    {
        var o = options.Value;
        if (string.IsNullOrWhiteSpace(o.ApiKey) || string.IsNullOrWhiteSpace(o.Endpoint) || string.IsNullOrWhiteSpace(o.Model))
            throw new InvalidOperationException("Azure OpenAI is not configured. Set OpenAi:Endpoint, OpenAi:ApiKey and OpenAi:Model using configuration or user secrets.");

        var body = new
        {
            model = o.Model,
            response_format = CreateStructuredResponseFormat(operation),
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
            var providerError = ReadProviderErrorMetadata(raw);
            logger.LogWarning("AI extraction failed after provider response. operation={Operation} stage={Stage} statusCode={StatusCode} responseLength={ResponseLength} providerCode={ProviderCode} providerType={ProviderType} providerParam={ProviderParam} providerMessage={ProviderMessage}", operation, "ProviderHttpFailure", (int)response.StatusCode, raw.Length, providerError.Code, providerError.Type, providerError.Param, providerError.Message);
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

    public static object CreateStructuredResponseFormat(string operation) => new
    {
        type = "json_schema",
        json_schema = new
        {
            name = operation switch
            {
                PromptKeys.AssignmentExtraction => "assignment_extraction",
                PromptKeys.CvExtraction => "cv_extraction",
                PromptKeys.CvAdaptation => "cv_adaptation",
                "ai_original_cv_ranking" => "ai_original_cv_ranking",
                _ => "ai_extraction"
            },
            strict = true,
            schema = operation switch
            {
                PromptKeys.AssignmentExtraction => AssignmentSchema(),
                PromptKeys.CvExtraction => CvSchema(),
                PromptKeys.CvAdaptation => CvAdaptationSchema(),
                "ai_original_cv_ranking" => AiRankingSchema(),
                _ => throw new InvalidOperationException($"No structured schema is configured for '{operation}'.")
            }
        }
    };

    private static JsonObject AssignmentSchema() => new()
    {
        ["type"] = "object",
        ["additionalProperties"] = false,
        ["properties"] = new JsonObject
        {
            ["seniority"] = NullableString(["Junior", "Mid", "Senior", "Staff"]),
            ["seniorityMatchMode"] = NullableString(["Exact", "Minimum", "Range"]),
            ["minimumSeniority"] = NullableString(["Junior", "Mid", "Senior", "Staff"]),
            ["maximumSeniority"] = NullableString(["Junior", "Mid", "Senior", "Staff"]),
            ["minYearsExperience"] = NullableInteger(),
            ["availability"] = new JsonObject { ["type"] = new JsonArray("string", "null") },
            ["requiredStartDate"] = new JsonObject { ["type"] = new JsonArray("string", "null"), ["pattern"] = "^\\d{4}-\\d{2}-\\d{2}$" },
            ["startDateDescription"] = NullableString(),
            ["location"] = new JsonObject { ["type"] = new JsonArray("string", "null") },
            ["requirements"] = new JsonObject
            {
                ["type"] = "array",
                ["items"] = RequirementSchema()
            },
            ["sourceText"] = new JsonObject { ["type"] = new JsonArray("string", "null") }
        },
        ["required"] = Required("seniority", "seniorityMatchMode", "minimumSeniority", "maximumSeniority", "minYearsExperience", "availability", "requiredStartDate", "startDateDescription", "location", "requirements", "sourceText")
    };

    private static JsonObject RequirementSchema() => new()
    {
        ["type"] = "object",
        ["additionalProperties"] = false,
        ["properties"] = new JsonObject
        {
            ["name"] = new JsonObject { ["type"] = "string" },
            ["type"] = new JsonObject { ["type"] = "string", ["enum"] = new JsonArray("Mandatory", "Desired") },
            ["minYears"] = NullableInteger(),
            ["minLevel"] = NullableInteger(1, 5),
            ["proficiency"] = NullableString(["Not specified", "Low", "Medium", "High", "Native"]),
            ["matchMode"] = NullableString(["Exact", "Minimum", "Range"]),
            ["maximumSeniority"] = NullableString(["Junior", "Mid", "Senior", "Staff"]),
            ["category"] = new JsonObject { ["type"] = "string", ["enum"] = new JsonArray("Skill", "HumanLanguage") }
        },
        ["required"] = Required("name", "type", "minYears", "minLevel", "proficiency", "matchMode", "maximumSeniority", "category")
    };

    private static JsonObject CvSchema() => new()
    {
        ["type"] = "object", ["additionalProperties"] = false,
        ["properties"] = new JsonObject
        {
            ["firstName"] = new JsonObject { ["type"] = "string" }, ["lastName"] = new JsonObject { ["type"] = "string" },
            ["email"] = NullableString(), ["title"] = NullableString(), ["summary"] = NullableString(), ["seniority"] = NullableString(["Junior", "Mid", "Senior", "Staff"]), ["suggestedSeniority"] = NullableString(["Junior", "Mid", "Senior", "Staff"]), ["yearsOfExperience"] = NullableInteger(), ["yearsOfExperienceSource"] = NullableString(), ["office"] = NullableString(),
            ["skills"] = ArrayOf(new JsonObject { ["type"] = "object", ["additionalProperties"] = false, ["properties"] = new JsonObject { ["name"] = new JsonObject { ["type"] = "string" }, ["level"] = new JsonObject { ["type"] = "integer" }, ["years"] = NullableInteger(), ["evidence"] = NullableString() }, ["required"] = Required("name", "level", "years", "evidence") }),
            ["experiences"] = ArrayOf(new JsonObject { ["type"] = "object", ["additionalProperties"] = false, ["properties"] = new JsonObject { ["company"] = new JsonObject { ["type"] = "string" }, ["role"] = new JsonObject { ["type"] = "string" }, ["description"] = NullableString(), ["startDate"] = NullableString(), ["endDate"] = NullableString() }, ["required"] = Required("company", "role", "description", "startDate", "endDate") }),
            ["projects"] = ArrayOf(new JsonObject { ["type"] = "object", ["additionalProperties"] = false, ["properties"] = new JsonObject { ["name"] = new JsonObject { ["type"] = "string" }, ["description"] = NullableString(), ["technologies"] = NullableString() }, ["required"] = Required("name", "description", "technologies") }),
            ["education"] = ArrayOf(new JsonObject { ["type"] = "object", ["additionalProperties"] = false, ["properties"] = new JsonObject { ["degree"] = new JsonObject { ["type"] = "string" }, ["school"] = NullableString(), ["year"] = NullableString() }, ["required"] = Required("degree", "school", "year") }),
            ["languages"] = ArrayOf(new JsonObject { ["type"] = "object", ["additionalProperties"] = false, ["properties"] = new JsonObject { ["name"] = new JsonObject { ["type"] = "string" }, ["proficiency"] = NullableString(["Not specified", "Low", "Medium", "High", "Native"]) }, ["required"] = Required("name", "proficiency") }),
            ["industries"] = ArrayOf(new JsonObject { ["type"] = "string" }),
            ["certifications"] = ArrayOf(new JsonObject { ["type"] = "object", ["additionalProperties"] = false, ["properties"] = new JsonObject { ["name"] = new JsonObject { ["type"] = "string" }, ["issuer"] = NullableString(), ["issuedDate"] = NullableString(), ["issuedYear"] = NullableString() }, ["required"] = Required("name", "issuer", "issuedDate", "issuedYear") }),
            ["sourceText"] = NullableString()
        },
        ["required"] = Required("firstName", "lastName", "email", "title", "summary", "seniority", "suggestedSeniority", "yearsOfExperience", "yearsOfExperienceSource", "office", "skills", "experiences", "projects", "education", "languages", "industries", "certifications", "sourceText")
    };


    private static JsonObject AiRankingSchema() => new()
    {
        ["type"] = "object",
        ["additionalProperties"] = false,
        ["properties"] = new JsonObject
        {
            ["rankings"] = ArrayOf(new JsonObject
            {
                ["type"] = "object",
                ["additionalProperties"] = false,
                ["properties"] = new JsonObject
                {
                    ["consultantId"] = new JsonObject { ["type"] = "integer" },
                    ["rank"] = new JsonObject { ["type"] = "integer" },
                    ["reason"] = new JsonObject { ["type"] = "string" },
                    ["strengths"] = ArrayOf(new JsonObject { ["type"] = "string" }),
                    ["gaps"] = ArrayOf(new JsonObject { ["type"] = "string" }),
                    ["evidence"] = ArrayOf(new JsonObject { ["type"] = "string" })
                },
                ["required"] = Required("consultantId", "rank", "reason", "strengths", "gaps", "evidence")
            }),
            ["skippedWithoutCv"] = new JsonObject { ["type"] = "integer" }
        },
        ["required"] = Required("rankings", "skippedWithoutCv")
    };

    private static JsonObject CvAdaptationSchema() => new()
    {
        ["type"] = "object", ["additionalProperties"] = false,
        ["properties"] = new JsonObject
        {
            ["overallAssessment"] = new JsonObject { ["type"] = "string" },
            ["strengths"] = ArrayOf(new JsonObject { ["type"] = "string" }),
            ["relevantExperience"] = ArrayOf(new JsonObject { ["type"] = "string" }),
            ["missingOrWeakAreas"] = ArrayOf(new JsonObject { ["type"] = "string" }),
            ["suggestedImprovements"] = ArrayOf(new JsonObject { ["type"] = "string" }),
            ["evidence"] = ArrayOf(new JsonObject { ["type"] = "string" })
        },
        ["required"] = Required("overallAssessment", "strengths", "relevantExperience", "missingOrWeakAreas", "suggestedImprovements", "evidence")
    };

    private static JsonObject NullableString(string[]? values = null)
    {
        var schema = new JsonObject { ["type"] = new JsonArray("string", "null") };
        if (values is not null) schema["enum"] = new JsonArray(values.Select(value => (JsonNode?)value).ToArray()) { null };
        return schema;
    }

    private static JsonObject NullableInteger(int? minimum = null, int? maximum = null)
    {
        var schema = new JsonObject { ["type"] = new JsonArray("integer", "null") };
        if (minimum is not null) schema["minimum"] = minimum.Value;
        if (maximum is not null) schema["maximum"] = maximum.Value;
        return schema;
    }
    private static JsonObject ArrayOf(JsonObject items) => new() { ["type"] = "array", ["items"] = items };
    private static JsonArray Required(params string[] names) => new(names.Select(name => (JsonNode?)name).ToArray());

    private static (string Code, string Type, string Param, string Message) ReadProviderErrorMetadata(string raw)
    {
        try
        {
            using var document = JsonDocument.Parse(raw);
            var error = document.RootElement.TryGetProperty("error", out var errorElement) ? errorElement : document.RootElement;
            return (
                ReadErrorValue(error, "code"),
                ReadErrorValue(error, "type"),
                ReadErrorValue(error, "param"),
                Truncate(ReadErrorValue(error, "message")));
        }
        catch (JsonException)
        {
            return ("unparsed", "unparsed", "unparsed", "Provider returned a non-JSON error response.");
        }
    }

    private static string ReadErrorValue(JsonElement error, string property) =>
        error.TryGetProperty(property, out var value) && value.ValueKind != JsonValueKind.Null
            ? value.ToString()
            : "null";

    private static string Truncate(string value) => value.Length <= 500 ? value : value[..500];
}
