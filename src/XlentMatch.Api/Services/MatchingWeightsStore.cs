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
        if (value.MandatoryWeight < 0 || value.MandatoryWeight > 100 ||
            value.DesiredWeight < 0 || value.DesiredWeight > 100 ||
            value.ExperienceWeight < 0 || value.ExperienceWeight > 100)
            throw new ArgumentException("Matching weights must be between 0 and 100.");

        if (value.MandatoryWeight + value.DesiredWeight + value.ExperienceWeight != 100)
            throw new ArgumentException("Mandatory, desired and experience weights must total 100.");

        if (value.MissingMandatoryPenalty < 0 || value.MissingMandatoryPenalty > 100)
            throw new ArgumentException("Missing mandatory penalty must be between 0 and 100.");
    }

    private static MatchingWeights Clone(MatchingOptions value) => new()
    {
        MandatoryWeight = value.MandatoryWeight,
        DesiredWeight = value.DesiredWeight,
        ExperienceWeight = value.ExperienceWeight,
        MissingMandatoryPenalty = value.MissingMandatoryPenalty
    };

    private static MatchingWeights Clone(MatchingWeights value) => new()
    {
        MandatoryWeight = value.MandatoryWeight,
        DesiredWeight = value.DesiredWeight,
        ExperienceWeight = value.ExperienceWeight,
        MissingMandatoryPenalty = value.MissingMandatoryPenalty
    };
}

public sealed class MatchingWeights
{
    public int MandatoryWeight { get; set; }
    public int DesiredWeight { get; set; }
    public int ExperienceWeight { get; set; }
    public int MissingMandatoryPenalty { get; set; }
}
