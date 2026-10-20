namespace XlentMatch.Api.Models;

public class Consultant
{
    public int Id { get; set; }
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public string? Email { get; set; }
    public string? Summary { get; set; }
    public string? Seniority { get; set; }
    public int? YearsOfExperience { get; set; }
    public string? YearsOfExperienceSource { get; set; }
    public DateOnly? AvailableAgainDate { get; set; }
    public string Availability { get; set; } = ConsultantAvailability.Available;
    public string? Office { get; set; }
    public string? OriginalCvText { get; set; }

    public List<ConsultantSkill> Skills { get; set; } = new();
    public List<Experience> Experiences { get; set; } = new();
    public List<Project> Projects { get; set; } = new();
    public List<Education> Education { get; set; } = new();
    public List<ConsultantLanguage> Languages { get; set; } = new();
    public List<ConsultantIndustry> Industries { get; set; } = new();
    public List<Certification> Certifications { get; set; } = new();

    public string FullName => $"{FirstName} {LastName}".Trim();
}

public static class ConsultantAvailability
{
    public const string Available = "Available";
    public const string Unavailable = "Unavailable";
}
