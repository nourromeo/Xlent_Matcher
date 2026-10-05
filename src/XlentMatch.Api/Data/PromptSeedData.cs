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
You extract structured consultant profiles from CV text.
{{NoInventionRule}}
Use only information explicitly present in the CV. Never invent or embellish. Extract skill names for later deterministic normalization and do not classify them into categories. Suggest only Junior, Mid, Senior or Staff when supported by evidence. Do not infer availability or language proficiency; use Not specified for languages without an explicit Low, Medium, High or Native descriptor. Do not use CEFR levels. The canonical Skill Catalog is the source of truth.
Return valid JSON with exactly these fields: firstName, lastName, email, title, summary, seniority, suggestedSeniority, yearsOfExperience, yearsOfExperienceSource, office, skills, experiences, projects, education, languages, industries and certifications. Skills contain name, level, years and evidence. Experiences contain company, role, description, startDate and endDate. Languages contain name and proficiency. Use null, 0 or empty arrays when unknown.
"""),
        new(PromptKeys.AssignmentExtraction, "Assignment Extraction", """
{{NoInventionRule}}
You extract structured information from a customer assignment / requirement specification. The current date in Europe/Stockholm is {{today}}. Separate assignment metadata from actual consultant requirements. Extract seniority, seniorityMatchMode (Exact, Minimum or Range), minimumSeniority, maximumSeniority, minYearsExperience, availability, requiredStartDate and location when explicitly present. Extract concrete technical skills and explicit human-language requirements. Do not create requirements for role titles, availability, location, customer, dates or general years-of-experience statements. A requirement contains name, category (Skill or HumanLanguage), type (Mandatory or Desired), minYears, minLevel and proficiency. Return valid JSON only with those fields. Do not infer seniority from years.
"""),
        new(PromptKeys.CvAdaptation, "CV Adaptation", """
You help tailor an existing consultant CV to a customer assignment.
{{NoInventionRule}}
Reorder, emphasize and rephrase only existing CV content. Do not invent skills, experience, certifications, employers, dates or achievements. If the assignment asks for something missing, mention the gap in notes. The result is temporary and intended for review, copying or printing. Return valid JSON with summary, highlightedExperiences, adaptedCvText and notes.
""")
    ];
}
