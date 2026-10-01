using System.ComponentModel.DataAnnotations.Schema;

namespace XlentMatch.Api.Models;

public class ConsultantSkill
{
    private string _name = "";
    private string? _inputCategory;

    public int Id { get; set; }
    public int ConsultantId { get; set; }
    public int? SkillId { get; set; }
    public Skill? Skill { get; set; }

    public string Name
    {
        get => Skill?.CanonicalName ?? _name;
        set => _name = value;
    }

    [NotMapped]
    public string? Category
    {
        get => Skill?.Category ?? _inputCategory;
        set => _inputCategory = value;
    }

    public int Years { get; set; }
    public int Level { get; set; }
    public string? Evidence { get; set; }
}
