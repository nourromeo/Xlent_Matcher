namespace XlentMatch.Api.Domain;

public class Consultant
{
    public int Id { get; set; }
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public string? Email { get; set; }
    public string? Title { get; set; }
    public string? Summary { get; set; }
    public int YearsOfExperience { get; set; }

    // Original CV text. Never overwritten by AI.
    public string? OriginalCvText { get; set; }

    public List<ConsultantSkill> Skills { get; set; } = new();
    public List<Experience> Experiences { get; set; } = new();
    public List<Project> Projects { get; set; } = new();
    public List<Certification> Certifications { get; set; } = new();

    public string FullName => $"{FirstName} {LastName}".Trim();
}

public class ConsultantSkill
{
    public int Id { get; set; }
    public int ConsultantId { get; set; }
    public string Name { get; set; } = "";
    public int Level { get; set; }   // 1-5
    public int Years { get; set; }
}

public class Experience
{
    public int Id { get; set; }
    public int ConsultantId { get; set; }
    public string Company { get; set; } = "";
    public string Role { get; set; } = "";
    public string? Description { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
}

public class Project
{
    public int Id { get; set; }
    public int ConsultantId { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public string? Technologies { get; set; } // comma separated, e.g. "C#, Azure, React"
}

public class Certification
{
    public int Id { get; set; }
    public int ConsultantId { get; set; }
    public string Name { get; set; } = "";
    public string? Issuer { get; set; }
    public DateOnly? IssuedDate { get; set; }
}
