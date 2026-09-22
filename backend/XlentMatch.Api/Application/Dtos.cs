using XlentMatch.Api.Domain;

namespace XlentMatch.Api.Application;

// ---- Drafts produced by AI extraction. The user reviews them before saving. ----

public class ConsultantDraft
{
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public string? Email { get; set; }
    public string? Title { get; set; }
    public string? Summary { get; set; }
    public int YearsOfExperience { get; set; }
    public List<SkillDraft> Skills { get; set; } = new();
    public List<ExperienceDraft> Experiences { get; set; } = new();
    public List<ProjectDraft> Projects { get; set; } = new();
    public List<CertificationDraft> Certifications { get; set; } = new();
    public string? SourceText { get; set; }
}

public class SkillDraft
{
    public string Name { get; set; } = "";
    public int Level { get; set; }
    public int Years { get; set; }
}

public class ExperienceDraft
{
    public string Company { get; set; } = "";
    public string Role { get; set; } = "";
    public string? Description { get; set; }
    public string? StartDate { get; set; } // "yyyy-MM" or null
    public string? EndDate { get; set; }
}

public class ProjectDraft
{
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public string? Technologies { get; set; }
}

public class CertificationDraft
{
    public string Name { get; set; } = "";
    public string? Issuer { get; set; }
    public string? IssuedDate { get; set; }
}

public class RequirementDraft
{
    public string Name { get; set; } = "";
    public RequirementType Type { get; set; } = RequirementType.Mandatory;
    public int? MinYears { get; set; }
    public int? MinLevel { get; set; }
}

public class RequirementExtractionResult
{
    public List<RequirementDraft> Requirements { get; set; } = new();
}

// ---- CV adaptation ----

public class CvAdaptationSuggestion
{
    public string Summary { get; set; } = "";
    public List<string> HighlightedExperiences { get; set; } = new();
    public string AdaptedCvText { get; set; } = "";
    public List<string> Notes { get; set; } = new();
}

// ---- Requests ----

public class RunMatchingRequest
{
    public int AssignmentId { get; set; }
    public List<int> ConsultantIds { get; set; } = new();
}

public class CvSuggestionRequest
{
    public int ConsultantId { get; set; }
    public int AssignmentId { get; set; }
}

public class SaveAdaptedCvRequest
{
    public int ConsultantId { get; set; }
    public int AssignmentId { get; set; }
    public string Content { get; set; } = "";
}

public class ExtractionRequest
{
    public IFormFile? File { get; set; }
    public string? Text { get; set; }
}
