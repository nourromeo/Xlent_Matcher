using System.Text.Json;
using Microsoft.Extensions.Options;

namespace XlentMatch.Api.Services;

public sealed class MatchingWeightsStore
{
    private readonly MatchingWeights _defaults;
    private readonly string _filePath;
    private readonly SemaphoreSlim _gate = new(1, 1);
    private MatchingWeights _current;

    public MatchingWeightsStore(IOptions<MatchingOptions> options, IWebHostEnvironment environment)
    {
        _defaults = Clone(options.Value);
        _filePath = Path.Combine(environment.ContentRootPath, "App_Data", "matching-weights.json");
        _current = Load() ?? Clone(_defaults);
    }

    public MatchingWeights Get() => Clone(_current);

    public async Task<MatchingWeights> UpdateAsync(MatchingWeights input, CancellationToken ct = default)
    {
        Validate(input);

        await _gate.WaitAsync(ct);
        try
        {
            _current = Clone(input);
            Directory.CreateDirectory(Path.GetDirectoryName(_filePath)!);

            var json = JsonSerializer.Serialize(_current, new JsonSerializerOptions { WriteIndented = true });
            var tempPath = _filePath + ".tmp";
            await File.WriteAllTextAsync(tempPath, json, ct);
            File.Move(tempPath, _filePath, overwrite: true);

            return Clone(_current);
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<MatchingWeights> ResetAsync(CancellationToken ct = default)
    {
        await _gate.WaitAsync(ct);
        try
        {
            _current = Clone(_defaults);

            if (File.Exists(_filePath))
                File.Delete(_filePath);

            return Clone(_current);
        }
        finally
        {
            _gate.Release();
        }
    }

    private MatchingWeights? Load()
    {
        if (!File.Exists(_filePath))
            return null;

        try
        {
            var json = File.ReadAllText(_filePath);
            using var document = JsonDocument.Parse(json);
            if (document.RootElement.TryGetProperty("ExperienceWeight", out _) ||
                document.RootElement.TryGetProperty("MissingMandatoryPenalty", out _))
                return Clone(_defaults);

            var value = JsonSerializer.Deserialize<MatchingWeights>(json);

            if (value is null)
                return null;

            Validate(value);
            return value;
        }
        catch
        {
            return null;
        }
    }

    public static void Validate(MatchingWeights value)
    {
        if (value.MandatoryRequirementWeight <= 0 || value.DesiredRequirementWeight <= 0)
            throw new ArgumentException("Requirement weights must be positive integers.");
    }

    private static MatchingWeights Clone(MatchingOptions value) => new()
    {
        MandatoryRequirementWeight = value.MandatoryRequirementWeight,
        DesiredRequirementWeight = value.DesiredRequirementWeight
    };

    private static MatchingWeights Clone(MatchingWeights value) => new()
    {
        MandatoryRequirementWeight = value.MandatoryRequirementWeight,
        DesiredRequirementWeight = value.DesiredRequirementWeight
    };
}

public sealed class MatchingWeights
{
    public int MandatoryRequirementWeight { get; set; }
    public int DesiredRequirementWeight { get; set; }
}
