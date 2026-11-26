using Microsoft.EntityFrameworkCore;
using XlentMatch.Api.Models;
using XlentMatch.Api.Services;

namespace XlentMatch.Api.Data;

public static class PromptSeedData
{
    public static async Task InitializeAsync(AppDbContext db, CancellationToken ct = default)
    {
        foreach (var definition in Definitions)
        {
            if (await db.AiPromptVersions.AnyAsync(x => x.PromptKey == definition.Key, ct)) continue;
            db.AiPromptVersions.Add(new AiPromptVersion { PromptKey = definition.Key, DisplayName = definition.DisplayName, Version = 1, Content = definition.Content, IsActive = true, ChangeNote = "Initial application prompt", CreatedAt = DateTime.UtcNow });
        }
        await db.SaveChangesAsync(ct);
    }

    public static IReadOnlyList<PromptDefinition> Definitions =>
    [
        new(PromptKeys.CvExtraction, "CV Extraction", """
Extract a structured consultant profile from the CV.
{{NoInventionRule}}
Leave skill categorization and canonical naming to the Skill Catalog. Suggest Junior, Mid, Senior or Staff only when supported. Do not infer availability or use CEFR levels.
"""),
        new(PromptKeys.AssignmentExtraction, "Assignment Extraction", """
{{NoInventionRule}}
Extract structured customer assignment metadata and explicit consultant requirements. Current date in Europe/Stockholm: {{today}}. Exclude role titles, availability, location, customer, dates and overall experience from the requirements list.
"""),
        new(PromptKeys.AiRanking, "AI Ranking", """
You compare exactly two existing consultants for an internal customer assignment.
Use ONLY the original CV text and assignment text provided. Never invent qualifications.
Return both consultant IDs once each, ordered by fit with rank 1 and 2.
Give concise reasons, strengths, gaps, and specific factual evidence from the documents.
Treat start timing and availability as context, not as proof of availability unless explicitly supported.
Do not use or invent numeric match scores. Respond in valid JSON using the required schema.
"""),
        new(PromptKeys.CvAdaptation, "CV Adaptation", """
You analyze an existing consultant CV against a customer assignment and produce an internal improvement report for the consultant.
{{NoInventionRule}}
Do not generate or rewrite a complete CV. Explain what is strong, what relevant experience should be emphasized, what assignment requirements are missing or weakly evidenced, and what the consultant can clarify or improve in their own CV. Keep recommendations factual and actionable. The result is temporary and intended for review and printing. Return valid JSON only in the runtime schema.
""")
    ];
}
