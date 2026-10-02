namespace XlentMatch.Api.Services;

public class OpenAiOptions
{
    public string Endpoint { get; set; } = "";
    public string ApiKey { get; set; } = "";
    public string Model { get; set; } = "gpt-5-mini";
}

public class MatchingOptions
{
    public int MandatoryRequirementWeight { get; set; } = 2;
    public int DesiredRequirementWeight { get; set; } = 1;
}
