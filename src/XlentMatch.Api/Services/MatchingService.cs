using XlentMatch.Api.Models;

namespace XlentMatch.Api.Services;

public class MatchingService(MatchingWeightsStore weightsStore)
{

    public List<MatchResult> MatchAndRank(Assignment assignment, IEnumerable<Consultant> consultants)
    {
        var results = consultants
            .Select(c => Match(assignment, c))
            .OrderByDescending(r => r.Score)
            .ThenByDescending(r => r.MatchedMandatory)
            .ThenBy(r => r.ConsultantName)
            .ToList();

        for (var i = 0; i < results.Count; i++)
            results[i].Rank = i + 1;

        return results;
    }

    public MatchResult Match(Assignment assignment, Consultant consultant)
    {
        var details = assignment.Requirements.Select(r => Evaluate(r, consultant)).ToList();

        var mandatory = details.Where(d => d.Type == RequirementType.Mandatory).ToList();
        var desired = details.Where(d => d.Type == RequirementType.Desired).ToList();

        var mandatoryRatio = Ratio(mandatory);
        var desiredRatio = Ratio(desired);
        var experienceRatio = assignment.MinYearsExperience <= 0
            ? 1.0
            : Math.Min(1.0, (double)consultant.YearsOfExperience / assignment.MinYearsExperience);

        var weights = weightsStore.Get();

        var score = mandatoryRatio * weights.MandatoryWeight
                  + desiredRatio * weights.DesiredWeight
                  + experienceRatio * weights.ExperienceWeight;

        var missingMandatory = mandatory.Where(d => !d.IsMatched).ToList();
        score -= missingMandatory.Count * weights.MissingMandatoryPenalty;

        var result = new MatchResult
        {
            AssignmentId = assignment.Id,
            ConsultantId = consultant.Id,
            ConsultantName = consultant.FullName,
            Score = (int)Math.Clamp(Math.Round(score), 0, 100),
            MatchedMandatory = mandatory.Count(d => d.IsMatched),
            TotalMandatory = mandatory.Count,
            MatchedDesired = desired.Count(d => d.IsMatched),
            TotalDesired = desired.Count,
            ExperienceScore = (int)Math.Round(experienceRatio * 100),
            Details = details
        };

        result.Explanation = BuildExplanation(result, assignment, consultant, missingMandatory);
        return result;
    }

    private static double Ratio(List<MatchRequirementResult> items) =>
        items.Count == 0 ? 1.0 : (double)items.Count(i => i.IsMatched) / items.Count;

    private static MatchRequirementResult Evaluate(AssignmentRequirement req, Consultant c)
    {
        var evidence = new List<string>();
        var matched = false;

        var requirementName = req.Skill?.CanonicalName ?? req.Name;
        var isHumanLanguage = string.Equals(req.Skill?.Category, "Human language", StringComparison.OrdinalIgnoreCase);

        if (isHumanLanguage)
        {
            var language = c.Languages.FirstOrDefault(x => SameName(x.Name, requirementName));
            if (language is not null)
            {
                var languageLevel = LanguageLevel(language.Level);
                matched = req.MinLevel is null || (languageLevel is not null && languageLevel >= req.MinLevel);
                evidence.Add($"Language '{language.Name}': {language.Level ?? "level not specified"}");
                if (req.MinLevel is not null && (languageLevel is null || languageLevel < req.MinLevel))
                    evidence.Add($"Requires language level {req.MinLevel}/6, consultant level is {languageLevel?.ToString() ?? "unrecognized"}");
            }
        }
        else
        {
        var skill = c.Skills.FirstOrDefault(s => s.SkillId == req.SkillId);

        if (skill is not null)
        {
            var yearsOk = req.MinYears is null || skill.Years >= req.MinYears;
            var levelOk = req.MinLevel is null || skill.Level >= req.MinLevel;
            matched = yearsOk && levelOk;

            var skillName = skill.Skill?.CanonicalName ?? skill.Name;
            evidence.Add($"Skill '{skillName}': level {skill.Level}/5, {skill.Years} years");
            if (!string.IsNullOrWhiteSpace(skill.Evidence))
                evidence.Add(skill.Evidence);
            if (!yearsOk) evidence.Add($"Requires {req.MinYears} years, consultant has {skill.Years}");
            if (!levelOk) evidence.Add($"Requires level {req.MinLevel}, consultant has {skill.Level}");
        }

        }

        var cert = c.Certifications.FirstOrDefault(x => SameName(x.Name, requirementName));
        if (cert is not null)
        {
            if (req.MinYears is null && req.MinLevel is null) matched = true;
            evidence.Add($"Certification '{cert.Name}'" + (cert.Issuer is null ? "" : $" ({cert.Issuer})"));
        }

        foreach (var project in c.Projects.Where(p => UsesTechnology(p, requirementName)))
            evidence.Add($"Project '{project.Name}' used {requirementName}");

        if (evidence.Count == 0)
            evidence.Add(isHumanLanguage
                ? "No matching language found in consultant profile"
                : "No matching canonical skill, certification or project found in profile");

        return new MatchRequirementResult
        {
            RequirementName = requirementName,
            Type = req.Type,
            IsMatched = matched,
            Evidence = string.Join("; ", evidence)
        };
    }

    private static int? LanguageLevel(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var normalized = value.Trim().ToUpperInvariant();
        var cefr = normalized switch
        {
            "A1" => 1, "A2" => 2, "B1" => 3, "B2" => 4, "C1" => 5, "C2" => 6,
            "BEGINNER" => 1, "BASIC" => 1, "ELEMENTARY" => 2,
            "INTERMEDIATE" => 3, "UPPER-INTERMEDIATE" => 4,
            "ADVANCED" => 5, "FLUENT" => 5, "PROFESSIONAL" => 5,
            "NATIVE" => 6, "NATIVE/BILINGUAL" => 6,
            _ => 0
        };
        return cefr == 0 ? null : cefr;
    }

    private static bool UsesTechnology(Project p, string name) =>
        (p.Technologies ?? "")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Any(t => SameName(t, name));

    private static bool SameName(string a, string b) =>
        string.Equals(a.Trim(), b.Trim(), StringComparison.OrdinalIgnoreCase);

    private static string BuildExplanation(
        MatchResult r, Assignment a, Consultant c, List<MatchRequirementResult> missingMandatory)
    {
        var parts = new List<string>
        {
            $"{c.FullName} scored {r.Score}/100 for '{a.Title}'.",
            $"Mandatory requirements: {r.MatchedMandatory}/{r.TotalMandatory}.",
            $"Desired requirements: {r.MatchedDesired}/{r.TotalDesired}."
        };

        if (a.MinYearsExperience > 0)
            parts.Add($"Experience: {c.YearsOfExperience} years (minimum {a.MinYearsExperience}).");

        if (missingMandatory.Count > 0)
            parts.Add("Missing mandatory: " + string.Join(", ", missingMandatory.Select(m => m.RequirementName)) + ".");

        return string.Join(" ", parts);
    }
}
