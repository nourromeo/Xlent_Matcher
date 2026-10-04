using Microsoft.EntityFrameworkCore;
using XlentMatch.Api.Data;
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
