namespace XlentMatch.Api.DTOs.Consultants;

public class ConsultantDraftDto
{
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public string? Email { get; set; }
    public string? Title { get; set; }
    public string? Summary { get; set; }
    public string? Seniority { get; set; }
    public int YearsOfExperience { get; set; }
    public string? Availability { get; set; }
    public string? Office { get; set; }
    public List<SkillDraftDto> Skills { get; set; } = new();
    public List<ExperienceDraftDto> Experiences { get; set; } = new();
    public List<ProjectDraftDto> Projects { get; set; } = new();
    public List<EducationDraftDto> Education { get; set; } = new();
    public List<LanguageDraftDto> Languages { get; set; } = new();
    public List<string> Industries { get; set; } = new();
    public List<CertificationDraftDto> Certifications { get; set; } = new();
    public string? SourceText { get; set; }
}

public class SkillDraftDto
{
    public string Name { get; set; } = "";
    public int Level { get; set; }
    public int Years { get; set; }
    public string? Evidence { get; set; }
}

public class ExperienceDraftDto
{
    public string Company { get; set; } = "";
    public string Role { get; set; } = "";
    public string? Description { get; set; }
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
}

public class ProjectDraftDto
{
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public string? Technologies { get; set; }
}

public class EducationDraftDto
{
    public string Degree { get; set; } = "";
    public string? School { get; set; }
    public string? Year { get; set; }
}

public class LanguageDraftDto
{
    public string Name { get; set; } = "";
    public string? Level { get; set; }
}

public class CertificationDraftDto
{
    public string Name { get; set; } = "";
    public string? Issuer { get; set; }
    public string? IssuedDate { get; set; }
}
