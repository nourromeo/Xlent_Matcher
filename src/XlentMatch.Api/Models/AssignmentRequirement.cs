using System.ComponentModel.DataAnnotations.Schema;

namespace XlentMatch.Api.Models;

public class AssignmentRequirement
{
    private string _inputName = "";

    public int Id { get; set; }
    public int AssignmentId { get; set; }
    public int SkillId { get; set; }
    public Skill? Skill { get; set; }

    [NotMapped]
    public string Name
    {
        get => Skill?.CanonicalName ?? _inputName;
        set => _inputName = value;
    }

    public RequirementType Type { get; set; } = RequirementType.Mandatory;
    public int? MinYears { get; set; }
    public int? MinLevel { get; set; }
    public bool RequiresFluency { get; set; }

    private string _category = "Skill";

    public string Category
    {
        get => string.Equals(Skill?.Category, "Human language", StringComparison.OrdinalIgnoreCase)
            ? "HumanLanguage"
            : _category;
        set => _category = string.Equals(value, "HumanLanguage", StringComparison.OrdinalIgnoreCase)
            ? "HumanLanguage"
            : "Skill";
    }
}
