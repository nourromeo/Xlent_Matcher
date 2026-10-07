using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;
using XlentMatch.Api.Models;
using XlentMatch.Api.Services;

namespace XlentMatch.Api.Tests;

public class MatchingServiceTests
{
    [Fact]
    public void ScoresOnlyActualRequirementsUsingConfiguredWeights()
    {
        var service = CreateService();
        var react = Requirement(1, "React", RequirementType.Mandatory);
        var csharp = Requirement(2, "C#", RequirementType.Mandatory);
        var azure = Requirement(3, "Azure", RequirementType.Mandatory);
        var docker = Requirement(4, "Docker", RequirementType.Desired);
        var assignment = new Assignment { Requirements = [react, csharp, azure, docker] };
        var consultant = ConsultantWithSkills(1, 2, 1, 4);

        var result = service.Match(assignment, consultant);

        Assert.Equal(71, result.Score);
        Assert.Equal(5, result.MatchedWeight);
        Assert.Equal(7, result.TotalWeight);
        Assert.Equal(2, result.MatchedMandatory);
        Assert.Equal(1, result.MatchedDesired);
    }

    [Fact]
    public void TotalExperienceIsOneBinaryMandatoryRequirement()
    {
        var service = CreateService();
        var assignment = new Assignment { MinYearsExperience = 5 };

        var missing = service.Match(assignment, new Consultant { Id = 1, FirstName = "A", YearsOfExperience = 4 });
        var matched = service.Match(assignment, new Consultant { Id = 2, FirstName = "B", YearsOfExperience = 5 });

        Assert.Equal(0, missing.Score);
        Assert.False(missing.Details.Single().IsMatched);
        Assert.Equal(100, matched.Score);
        Assert.True(matched.Details.Single().IsMatched);
    }

    [Fact]
    public void AvailabilityFiltersUnavailableConsultantsBeforeScoring()
    {
        var service = CreateService();
        var assignment = new Assignment { Requirements = [Requirement(1, "React", RequirementType.Mandatory)] };
        var consultants = new[]
        {
            ConsultantWithSkills(1, 1),
            new Consultant { Id = 2, FirstName = "Unavailable", Availability = ConsultantAvailability.Unavailable }
        };

        var results = service.MatchAndRank(assignment, consultants);

        Assert.Single(results);
        Assert.Equal(1, results[0].ConsultantId);
    }

    [Fact]
    public void SeniorityModesRemainBinary()
    {
        var service = CreateService();
        var consultant = new Consultant { Id = 1, FirstName = "Senior", Seniority = "Senior" };

        Assert.True(service.Match(new Assignment { Requirements = [Seniority("Senior", SeniorityMatchMode.Exact)] }, consultant).Details.Single().IsMatched);
        Assert.True(service.Match(new Assignment { Requirements = [Seniority("Mid", SeniorityMatchMode.Minimum)] }, consultant).Details.Single().IsMatched);
        Assert.False(service.Match(new Assignment { Requirements = [Seniority("Junior", SeniorityMatchMode.Range, "Mid")] }, consultant).Details.Single().IsMatched);
    }

    [Fact]
    public async Task MatchingWeightsStorePersistsAnUpdateAndReloadsIt()
    {
        var root = Path.Combine(Path.GetTempPath(), "xlent-match-tests", Guid.NewGuid().ToString("N"));
        var options = Options.Create(new MatchingOptions { MandatoryRequirementWeight = 2, DesiredRequirementWeight = 1 });
        var environment = new TestEnvironment { ContentRootPath = root };
        var store = new MatchingWeightsStore(options, environment);

        await store.UpdateAsync(new MatchingWeights { MandatoryRequirementWeight = 5, DesiredRequirementWeight = 3 });

        var reloaded = new MatchingWeightsStore(options, environment).Get();

        Assert.Equal(5, reloaded.MandatoryRequirementWeight);
        Assert.Equal(3, reloaded.DesiredRequirementWeight);
    }

    private static AssignmentRequirement Requirement(int skillId, string name, RequirementType type) => new()
    {
        SkillId = skillId,
        Name = name,
        Type = type,
        Category = "Skill"
    };

    private static AssignmentRequirement Seniority(string minimum, SeniorityMatchMode mode, string? maximum = null) => new()
    {
        Name = minimum,
        Category = "Seniority",
        Type = RequirementType.Mandatory,
        MatchMode = mode,
        MaximumSeniority = maximum
    };

    private static Consultant ConsultantWithSkills(int id, params int[] matchedSkillIds) => new()
    {
        Id = id,
        FirstName = $"Consultant{id}",
        Skills = matchedSkillIds.Select(skillId => new ConsultantSkill { SkillId = skillId, Name = $"Skill {skillId}", Level = 3, Years = 5 }).ToList()
    };

    private static MatchingService CreateService()
    {
        var environment = new TestEnvironment { ContentRootPath = Path.Combine(Path.GetTempPath(), "xlent-match-tests", Guid.NewGuid().ToString("N")) };
        return new MatchingService(new MatchingWeightsStore(
            Options.Create(new MatchingOptions { MandatoryRequirementWeight = 2, DesiredRequirementWeight = 1 }),
            environment));
    }

    private sealed class TestEnvironment : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "XlentMatch.Api.Tests";
        public string EnvironmentName { get; set; } = "Testing";
        public string WebRootPath { get; set; } = "";
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string ContentRootPath { get; set; } = "";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
