namespace XlentMatch.Api.Services;

public class OpenAiOptions
{
    public string Endpoint { get; set; } = "";
    public string ApiKey { get; set; } = "";
    public string Model { get; set; } = "gpt-5-mini";
}

public class MatchingOptions
{
    public int MandatoryWeight { get; set; } = 60;
    public int DesiredWeight { get; set; } = 25;
    public int ExperienceWeight { get; set; } = 15;
    public int MissingMandatoryPenalty { get; set; } = 10;
}
