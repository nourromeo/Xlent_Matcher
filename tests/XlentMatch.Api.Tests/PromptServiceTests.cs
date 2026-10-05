using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Text.Json.Serialization;
using XlentMatch.Api.Data;
using XlentMatch.Api.Controllers;
using XlentMatch.Api.DTOs.Assignments;
using XlentMatch.Api.Services;

namespace XlentMatch.Api.Tests;

public class PromptServiceTests
{
    [Theory]
    [InlineData("sv", "Swedish")]
    [InlineData("en", "English")]
    [InlineData("es", "Spanish")]
    [InlineData(null, "English")]
    [InlineData("de", "English")]
    public void LanguageInstructionUsesOnlySupportedLocales(string? locale, string expectedLanguage)
    {
        var instruction = OpenAiTextService.LanguageInstruction(locale);

        Assert.Contains($"in {expectedLanguage}", instruction);
        Assert.Contains("Preserve names, companies, technologies", instruction);
    }

    [Fact]
    public void AdaptationSchemaKeepsAllGeneratedFieldsAndArraysStringTyped()
    {
        var schema = OpenAiTextService.AdaptationSchemaInstruction;

        Assert.Contains("summary (string)", schema);
        Assert.Contains("highlightedExperiences (array of strings)", schema);
        Assert.Contains("adaptedCvText (string)", schema);
        Assert.Contains("notes (array of strings)", schema);
        Assert.Contains("Do not rename properties", schema);
        Assert.Contains("Do not return objects inside highlightedExperiences or notes", schema);
    }

    [Fact]
    public void AssignmentExtractionContractPreservesExplicitOverallMinimumAndUnspecifiedLanguages()
    {
        var schema = OpenAiTextService.AssignmentExtractionSchemaInstruction;

        Assert.Contains("minYearsExperience", schema);
        Assert.Contains("at least 5 years", schema);
        Assert.Contains("skill-specific minYears", schema);
        Assert.Contains("Not specified, Low, Medium, High, Native", schema);
        Assert.Contains("MinYears and MinLevel must be JSON integers or JSON null", schema);
        Assert.Contains("MinLevel only when an explicit numeric skill level on the existing 1-5 scale", schema);
        Assert.Contains("MinYears and MinLevel must be null", schema);
        Assert.Contains("Responsibility or assignment-description language alone is not a requirement", schema);
        Assert.Contains("If the same sentence also explicitly requires experience with a technology, extract only that technology requirement", schema);
        Assert.Contains("assignment-level facts independently of requirement filtering", schema);
        Assert.Contains("seniority, overall minimum experience, location and work mode", schema);
    }

    [Fact]
    public void AssignmentExtractionJsonMapsTypedRequirementFieldsAndOverallMinimum()
    {
        var json = """
        {
          "minYearsExperience": 5,
          "requirements": [
            { "name": "React", "type": "Mandatory", "minYears": 3, "minLevel": null, "proficiency": null, "matchMode": "Exact", "maximumSeniority": null, "category": "Skill" },
            { "name": "Swedish", "type": "Desired", "minYears": null, "minLevel": null, "proficiency": "High", "matchMode": "Exact", "maximumSeniority": null, "category": "HumanLanguage" }
          ]
        }
        """;

        var result = JsonSerializer.Deserialize<RequirementExtractionResultDto>(json, ExtractionJsonOptions());

        Assert.NotNull(result);
        Assert.Equal(5, result!.MinYearsExperience);
        Assert.Equal(3, result.Requirements[0].MinYears);
        Assert.Null(result.Requirements[0].MinLevel);
        Assert.Equal("High", result.Requirements[1].Proficiency);
        Assert.Null(result.Requirements[1].MinLevel);
        Assert.Null(result.Requirements[1].MinYears);
    }

    [Fact]
    public void AssignmentExtractionRejectsSemanticTextInNumericMinLevel()
    {
        var json = """
        { "requirements": [ { "name": "React", "type": "Mandatory", "minLevel": "High", "category": "Skill" } ] }
        """;

        Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<RequirementExtractionResultDto>(json, ExtractionJsonOptions()));
    }

    private static JsonSerializerOptions ExtractionJsonOptions() => new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    [Fact]
    public void AssignmentLanguageDisplayTextIsNormalizedToDomainValue()
    {
        var draft = new RequirementExtractionResultDto
        {
            MinYearsExperience = 5,
            Requirements =
            [
                new() { Name = "Svenska", Category = "HumanLanguage", Proficiency = "Ej angivet" },
                new() { Name = "English", Category = "HumanLanguage", Proficiency = "High" },
                new() { Name = "React", Category = "Skill", Proficiency = "arbitrary" }
            ]
        };

        ExtractionController.NormalizeLanguageRequirementProficiencies(draft);

        Assert.Equal(5, draft.MinYearsExperience);
        Assert.Equal("Not specified", draft.Requirements[0].Proficiency);
        Assert.Equal("High", draft.Requirements[1].Proficiency);
        Assert.Equal("arbitrary", draft.Requirements[2].Proficiency);
    }

    [Fact]
    public void UnspecifiedLanguageProficiencyMayRemainNull()
    {
        var draft = new RequirementExtractionResultDto
        {
            Requirements = [new() { Name = "English", Category = "HumanLanguage", Proficiency = null }]
        };

        ExtractionController.NormalizeLanguageRequirementProficiencies(draft);

        Assert.Null(draft.Requirements[0].Proficiency);
    }

    [Fact]
    public async Task BootstrapCreatesOneActiveInitialVersion()
    {
        await using var fixture = await Fixture.CreateAsync();
        await PromptSeedData.InitializeAsync(fixture.Db);

        var versions = await fixture.Db.AiPromptVersions.Where(x => x.PromptKey == PromptKeys.CvExtraction).ToListAsync();
        Assert.Single(versions);
        Assert.Equal(1, versions[0].Version);
        Assert.True(versions[0].IsActive);
    }

    [Fact]
    public async Task NewVersionPreservesOldContentAndActivatesNewVersion()
    {
        await using var fixture = await Fixture.CreateAsync();
        await PromptSeedData.InitializeAsync(fixture.Db);

        var created = await fixture.Service.CreateVersionAsync(PromptKeys.CvExtraction, "edited prompt", "Clarified extraction", CancellationToken.None);
        var versions = await fixture.Service.GetVersionsAsync(PromptKeys.CvExtraction);

        Assert.Equal(2, created.Version);
        Assert.True(created.IsActive);
        Assert.Equal("edited prompt", created.Content);
        Assert.Equal("edited prompt", versions.Single(x => x.Version == 2).Content);
        Assert.NotEqual(versions.Single(x => x.Version == 1).Content, created.Content);
        Assert.False(versions.Single(x => x.Version == 1).IsActive);
        Assert.Equal(2, (await fixture.Service.GetActivePromptAsync(PromptKeys.CvExtraction))!.Version);
    }

    [Fact]
    public async Task ActivatingOlderVersionChangesOnlyActiveState()
    {
        await using var fixture = await Fixture.CreateAsync();
        await PromptSeedData.InitializeAsync(fixture.Db);
        await fixture.Service.CreateVersionAsync(PromptKeys.CvExtraction, "v2", null);

        var rollback = await fixture.Service.ActivateVersionAsync(PromptKeys.CvExtraction, 1);
        var versions = await fixture.Service.GetVersionsAsync(PromptKeys.CvExtraction);

        Assert.NotNull(rollback);
        Assert.True(versions.Single(x => x.Version == 1).IsActive);
        Assert.False(versions.Single(x => x.Version == 2).IsActive);
        Assert.Equal("v2", versions.Single(x => x.Version == 2).Content);
    }

    [Fact]
    public async Task EmptyOrUnknownPromptContentIsRejected()
    {
        await using var fixture = await Fixture.CreateAsync();
        await Assert.ThrowsAsync<ArgumentException>(() => fixture.Service.CreateVersionAsync(PromptKeys.CvExtraction, " ", null));
        await Assert.ThrowsAsync<ArgumentException>(() => fixture.Service.CreateVersionAsync("UNKNOWN", "content", null));
    }

    private sealed class Fixture : IAsyncDisposable
    {
        public AppDbContext Db { get; }
        public PromptService Service { get; }

        private Fixture(AppDbContext db)
        {
            Db = db;
            Service = new PromptService(db);
        }

        public static async Task<Fixture> CreateAsync()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            var db = new AppDbContext(options);
            await db.Database.EnsureCreatedAsync();
            return new Fixture(db);
        }

        public async ValueTask DisposeAsync()
        {
            await Db.DisposeAsync();
        }
    }
}
