using XlentMatch.Api.Models;

namespace XlentMatch.Api.Services;

public class MatchingService(MatchingWeightsStore weightsStore)
{

    public List<MatchResult> MatchAndRank(Assignment assignment, IEnumerable<Consultant> consultants)
    {
        var results = consultants
            .Where(c => string.Equals(c.Availability, ConsultantAvailability.Available, StringComparison.OrdinalIgnoreCase))
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
            : consultant.YearsOfExperience is null
                ? 0.0
                : Math.Min(1.0, (double)consultant.YearsOfExperience.Value / assignment.MinYearsExperience);

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
            Details = details,
            ContextDetails = BuildContextDetails(assignment, consultant)
        };

        result.Explanation = BuildExplanation(result, assignment, consultant, missingMandatory);
        return result;
    }

    private static double Ratio(List<MatchRequirementResult> items) =>
        items.Count == 0 ? 1.0 : (double)items.Count(i => i.IsMatched) / items.Count;

    public List<MatchContextResult> BuildContextDetails(Assignment assignment, Consultant consultant)
    {
        var details = new List<MatchContextResult>();

        if (assignment.MinYearsExperience > 0)
        {
            bool? matched = consultant.YearsOfExperience is null ? null : consultant.YearsOfExperience.Value >= assignment.MinYearsExperience;
            details.Add(new MatchContextResult
            {
                Name = "Overall experience",
                IsMatched = matched,
                AffectsScore = true,
                Evidence = consultant.YearsOfExperience is null
                    ? $"Consultant experience is not confirmed; assignment requires at least {assignment.MinYearsExperience} years."
                    : $"Consultant has {consultant.YearsOfExperience} years; assignment requires at least {assignment.MinYearsExperience}."
            });
        }

        if (!string.IsNullOrWhiteSpace(assignment.Location))
        {
            var required = NormalizeText(assignment.Location);
            var candidate = NormalizeText(consultant.Office ?? "");
            bool? matched = candidate.Length > 0 && required.Length > 0 &&
                (required == candidate);

            details.Add(new MatchContextResult
            {
                Name = "Work location",
                IsMatched = matched == true ? true : null,
                AffectsScore = false,
                Evidence = matched == true
                    ? $"Assignment location '{assignment.Location}' matches consultant office '{consultant.Office}'."
                    : $"Assignment: {assignment.Location}; consultant office: {consultant.Office ?? "not specified"}. Confirm travel, hybrid or remote fit manually."
            });
        }

        return details;
    }

    private static int? SeniorityLevel(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var normalized = NormalizeText(value);
        if (normalized == "junior") return 1;
        if (normalized == "mid") return 2;
        if (normalized == "senior") return 3;
        if (normalized == "staff") return 4;
        return null;
    }

    private static string NormalizeText(string value) =>
        string.Join(" ", value.Trim().ToLowerInvariant().Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));

    private static MatchRequirementResult Evaluate(AssignmentRequirement req, Consultant c)
    {
        var evidence = new List<string>();
        var matched = false;

        if (string.Equals(req.Category, "Seniority", StringComparison.OrdinalIgnoreCase))
        {
            var required = SeniorityLevel(req.Name);
            var consultant = SeniorityLevel(c.Seniority);
            var maximum = SeniorityLevel(req.MaximumSeniority);
            if (required is not null && consultant is not null)
            {
                matched = req.MatchMode switch
                {
                    SeniorityMatchMode.Minimum => consultant.Value >= required.Value,
                    SeniorityMatchMode.Range => maximum is not null && consultant.Value >= required.Value && consultant.Value <= maximum.Value,
                    _ => consultant.Value == required.Value
                };
            }

            var requirementLabel = req.MatchMode switch
            {
                SeniorityMatchMode.Minimum => $"{req.Name} or higher",
                SeniorityMatchMode.Range => $"{req.Name}–{req.MaximumSeniority}",
                _ => req.Name
            };
            evidence.Add(matched
                ? $"Seniority: {requirementLabel} required, consultant is {c.Seniority}."
                : c.Seniority is null
                    ? $"Seniority: {requirementLabel} required, consultant seniority is unknown."
                    : $"Seniority: {requirementLabel} required, consultant is {c.Seniority}.");

            return new MatchRequirementResult
            {
                RequirementName = "Seniority",
                Type = req.Type,
                IsMatched = matched,
                Evidence = string.Join(" ", evidence)
            };
        }

        var requirementName = req.Skill?.CanonicalName ?? req.Name;
        var isHumanLanguage = string.Equals(req.Category, "HumanLanguage", StringComparison.OrdinalIgnoreCase) ||
                              string.Equals(req.Skill?.Category, "Human language", StringComparison.OrdinalIgnoreCase);

        if (isHumanLanguage)
        {
            var language = c.Languages.FirstOrDefault(x => SameLanguage(x.Name, requirementName));
            if (language is not null)
            {
                var consultantRank = HumanLanguageProficiency.Rank(language.Proficiency);
                var requiredRank = HumanLanguageProficiency.Rank(req.Proficiency);
                matched = requiredRank == 0 || consultantRank >= requiredRank;
                evidence.Add($"Language '{language.Name}': {language.Proficiency}");
                if (!matched)
                    evidence.Add($"Requires {req.Proficiency}, consultant has {language.Proficiency}.");
            }
        }
        else
        {
        // Null SkillId means the term is unapproved and must not participate in matching.
        var skill = req.SkillId is null ? null : c.Skills.FirstOrDefault(s => s.SkillId == req.SkillId);

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

        if (!isHumanLanguage)
        {
            var cert = c.Certifications.FirstOrDefault(x => SameName(x.Name, requirementName));
            if (cert is not null)
            {
                if (req.MinYears is null && req.MinLevel is null) matched = true;
                evidence.Add($"Certification '{cert.Name}'" + (cert.Issuer is null ? "" : $" ({cert.Issuer})"));
            }

            foreach (var project in c.Projects.Where(p => UsesTechnology(p, requirementName)))
                evidence.Add($"Project '{project.Name}' used {requirementName}");
        }

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

    private static bool UsesTechnology(Project p, string name) =>
        (p.Technologies ?? "")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Any(t => SameName(t, name));

    private static bool SameLanguage(string a, string b) =>
        string.Equals(NormalizeLanguageName(a), NormalizeLanguageName(b), StringComparison.OrdinalIgnoreCase);

    private static string NormalizeLanguageName(string value) =>
        SkillNormalizationService.NormalizeHumanLanguage(value, null).Name.Trim().ToLowerInvariant();

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
            parts.Add(c.YearsOfExperience is null
                ? $"Overall experience is not confirmed (minimum {a.MinYearsExperience} years required)."
                : $"Experience: {c.YearsOfExperience} years (minimum {a.MinYearsExperience}).");

        if (missingMandatory.Count > 0)
            parts.Add("Missing mandatory: " + string.Join(", ", missingMandatory.Select(m => m.RequirementName)) + ".");

        return string.Join(" ", parts);
    }
}
