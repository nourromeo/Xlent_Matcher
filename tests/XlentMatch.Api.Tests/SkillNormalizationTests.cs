using Microsoft.EntityFrameworkCore;
using XlentMatch.Api.Data;
using XlentMatch.Api.Models;
using XlentMatch.Api.Services;

namespace XlentMatch.Api.Tests;

public class SkillNormalizationTests
{
    [Fact]
    public async Task CatalogSupportedCompoundSkillExpandsToCanonicalSkills()
    {
        await using var fixture = await Fixture.CreateAsync(
            new Skill { Id = 1, CanonicalName = ".NET", NormalizedName = ".NET", Category = "Framework" },
            new Skill { Id = 2, CanonicalName = "ASP.NET Core", NormalizedName = "ASP.NET CORE", Category = "Framework" });

        var skills = new List<ConsultantSkill>
        {
            new() { Name = ".NET / ASP.NET Core", Years = 7, Level = 4, Evidence = "listed" }
        };

        await fixture.Service.NormalizeConsultantSkillsAsync(skills);

        Assert.Equal(2, skills.Count);
        Assert.Equal(new int?[] { 1, 2 }, skills.Select(skill => skill.SkillId).OrderBy(id => id).ToArray());
        Assert.All(skills, skill => Assert.Equal(7, skill.Years));
    }

    [Fact]
    public async Task CompoundWithUnknownComponentRemainsOneSuggestionCandidate()
    {
        await using var fixture = await Fixture.CreateAsync(
            new Skill { Id = 1, CanonicalName = "Git", NormalizedName = "GIT", Category = "Tool" });

        var skills = new List<ConsultantSkill>
        {
            new() { Name = "Git / CI/CD", Years = 6, Level = 3 }
        };

        await fixture.Service.NormalizeConsultantSkillsAsync(skills);

        var skill = Assert.Single(skills);
        Assert.Null(skill.SkillId);
        Assert.Equal("Git / CI/CD", skill.Name);
        Assert.Equal("Git / CI/CD", (await fixture.Db.SkillSuggestions.SingleAsync()).Name);
    }

    [Fact]
    public async Task DuplicateCanonicalValuesMergeWithoutSummingYears()
    {
        await using var fixture = await Fixture.CreateAsync(
            new Skill
            {
                Id = 1,
                CanonicalName = "React",
                NormalizedName = "REACT",
                Category = "Frontend",
                Aliases = [new SkillAlias { Alias = "React.js", NormalizedAlias = "REACT.JS" }]
            });

        var skills = new List<ConsultantSkill>
        {
            new() { Name = "React", Years = 3, Level = 2 },
            new() { Name = "React.js", Years = 5, Level = 4, Evidence = "explicit evidence" }
        };

        await fixture.Service.NormalizeConsultantSkillsAsync(skills);

        var skill = Assert.Single(skills);
        Assert.Equal(1, skill.SkillId);
        Assert.Equal(5, skill.Years);
        Assert.Equal(4, skill.Level);
        Assert.Equal("explicit evidence", skill.Evidence);
    }

    private sealed class Fixture : IAsyncDisposable
    {
        public AppDbContext Db { get; }
        public SkillNormalizationService Service { get; }

        private Fixture(AppDbContext db)
        {
            Db = db;
            Service = new SkillNormalizationService(db);
        }

        public static async Task<Fixture> CreateAsync(params Skill[] skills)
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            var db = new AppDbContext(options);
            await db.Database.EnsureCreatedAsync();
            db.Skills.AddRange(skills);
            await db.SaveChangesAsync();
            return new Fixture(db);
        }

        public async ValueTask DisposeAsync() => await Db.DisposeAsync();
    }
}
