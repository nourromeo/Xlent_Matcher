namespace XlentMatch.Api.Models;

public static class HumanLanguageProficiency
{
    public const string NotSpecified = "Not specified";
    public const string Low = "Low";
    public const string Medium = "Medium";
    public const string High = "High";
    public const string Native = "Native";

    public static readonly string[] Values = [NotSpecified, Low, Medium, High, Native];

    public static int Rank(string? value) => value switch
    {
        Low => 1,
        Medium => 2,
        High => 3,
        Native => 4,
        _ => 0
    };
}
