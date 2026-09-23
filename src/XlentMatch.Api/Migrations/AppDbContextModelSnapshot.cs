using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using XlentMatch.Api.Data;

#nullable disable

namespace XlentMatch.Api.Migrations;

[DbContext(typeof(AppDbContext))]
partial class AppDbContextModelSnapshot : ModelSnapshot
{
    protected override void BuildModel(ModelBuilder modelBuilder)
    {
        modelBuilder.HasAnnotation("ProductVersion", "10.0.0");

        modelBuilder.Entity("XlentMatch.Api.Models.Consultant", b =>
        {
            b.Property<int>("Id").ValueGeneratedOnAdd();
            b.Property<string>("Availability");
            b.Property<string>("Email");
            b.Property<string>("FirstName").IsRequired();
            b.Property<string>("LastName").IsRequired();
            b.Property<string>("Office");
            b.Property<string>("OriginalCvText");
            b.Property<string>("Seniority");
            b.Property<string>("Summary");
            b.Property<string>("Title");
            b.Property<int>("YearsOfExperience");
            b.HasKey("Id");
            b.ToTable("Consultants");
        });

        modelBuilder.Entity("XlentMatch.Api.Models.Skill", b =>
        {
            b.Property<int>("Id").ValueGeneratedOnAdd();
            b.Property<string>("CanonicalName").IsRequired();
            b.Property<string>("Category").IsRequired();
            b.Property<string>("NormalizedName").IsRequired();
            b.HasKey("Id");
            b.HasIndex("NormalizedName").IsUnique();
            b.ToTable("Skills");
        });

        modelBuilder.Entity("XlentMatch.Api.Models.SkillAlias", b =>
        {
            b.Property<int>("Id").ValueGeneratedOnAdd();
            b.Property<string>("Alias").IsRequired();
            b.Property<string>("NormalizedAlias").IsRequired();
            b.Property<int>("SkillId");
            b.HasKey("Id");
            b.HasIndex("NormalizedAlias").IsUnique();
            b.HasIndex("SkillId");
            b.ToTable("SkillAliases");
        });

        modelBuilder.Entity("XlentMatch.Api.Models.ConsultantSkill", b =>
        {
            b.Property<int>("Id").ValueGeneratedOnAdd();
            b.Property<string>("Category");
            b.Property<int>("ConsultantId");
            b.Property<string>("Evidence");
            b.Property<int>("Level");
            b.Property<string>("Name").IsRequired();
            b.Property<int?>("SkillId");
            b.Property<int>("Years");
            b.HasKey("Id");
            b.HasIndex("ConsultantId");
            b.HasIndex("SkillId");
            b.HasIndex("ConsultantId", "SkillId");
            b.ToTable("ConsultantSkills");
        });

        modelBuilder.Entity("XlentMatch.Api.Models.Experience", b =>
        {
            b.Property<int>("Id").ValueGeneratedOnAdd();
            b.Property<string>("Company").IsRequired();
            b.Property<int>("ConsultantId");
            b.Property<string>("Description");
            b.Property<DateOnly?>("EndDate");
            b.Property<string>("Role").IsRequired();
            b.Property<DateOnly?>("StartDate");
            b.HasKey("Id");
            b.HasIndex("ConsultantId");
            b.ToTable("Experiences");
        });

        modelBuilder.Entity("XlentMatch.Api.Models.Project", b =>
        {
            b.Property<int>("Id").ValueGeneratedOnAdd();
            b.Property<int>("ConsultantId");
            b.Property<string>("Description");
            b.Property<string>("Name").IsRequired();
            b.Property<string>("Technologies");
            b.HasKey("Id");
            b.HasIndex("ConsultantId");
            b.ToTable("Projects");
        });

        modelBuilder.Entity("XlentMatch.Api.Models.Education", b =>
        {
            b.Property<int>("Id").ValueGeneratedOnAdd();
            b.Property<int>("ConsultantId");
            b.Property<string>("Degree").IsRequired();
            b.Property<string>("School");
            b.Property<string>("Year");
            b.HasKey("Id");
            b.HasIndex("ConsultantId");
            b.ToTable("Education");
        });

        modelBuilder.Entity("XlentMatch.Api.Models.ConsultantLanguage", b =>
        {
            b.Property<int>("Id").ValueGeneratedOnAdd();
            b.Property<int>("ConsultantId");
            b.Property<string>("Level");
            b.Property<string>("Name").IsRequired();
            b.HasKey("Id");
            b.HasIndex("ConsultantId");
            b.ToTable("ConsultantLanguages");
        });

        modelBuilder.Entity("XlentMatch.Api.Models.ConsultantIndustry", b =>
        {
            b.Property<int>("Id").ValueGeneratedOnAdd();
            b.Property<int>("ConsultantId");
            b.Property<string>("Name").IsRequired();
            b.HasKey("Id");
            b.HasIndex("ConsultantId");
            b.ToTable("ConsultantIndustries");
        });

        modelBuilder.Entity("XlentMatch.Api.Models.Certification", b =>
        {
            b.Property<int>("Id").ValueGeneratedOnAdd();
            b.Property<int>("ConsultantId");
            b.Property<DateOnly?>("IssuedDate");
            b.Property<string>("Issuer");
            b.Property<string>("Name").IsRequired();
            b.HasKey("Id");
            b.HasIndex("ConsultantId");
            b.ToTable("Certifications");
        });

        modelBuilder.Entity("XlentMatch.Api.Models.Assignment", b =>
        {
            b.Property<int>("Id").ValueGeneratedOnAdd();
            b.Property<string>("Availability");
            b.Property<DateTime>("CreatedAt");
            b.Property<string>("CustomerName").IsRequired();
            b.Property<string>("Description");
            b.Property<int>("MinYearsExperience");
            b.Property<string>("Seniority");
            b.Property<int>("Status");
            b.Property<string>("Title").IsRequired();
            b.HasKey("Id");
            b.ToTable("Assignments");
        });

        modelBuilder.Entity("XlentMatch.Api.Models.AssignmentRequirement", b =>
        {
            b.Property<int>("Id").ValueGeneratedOnAdd();
            b.Property<int>("AssignmentId");
            b.Property<int?>("MinLevel");
            b.Property<int?>("MinYears");
            b.Property<string>("Name").IsRequired();
            b.Property<int?>("SkillId");
            b.Property<int>("Type");
            b.HasKey("Id");
            b.HasIndex("AssignmentId");
            b.HasIndex("SkillId");
            b.HasIndex("AssignmentId", "SkillId");
            b.ToTable("AssignmentRequirements");
        });

        modelBuilder.Entity("XlentMatch.Api.Models.MatchResult", b =>
        {
            b.Property<int>("Id").ValueGeneratedOnAdd();
            b.Property<int>("AssignmentId");
            b.Property<string>("ConsultantName").IsRequired();
            b.Property<int>("ConsultantId");
            b.Property<DateTime>("CreatedAt");
            b.Property<string>("Explanation").IsRequired();
            b.Property<int>("ExperienceScore");
            b.Property<int>("MatchedDesired");
            b.Property<int>("MatchedMandatory");
            b.Property<int>("Rank");
            b.Property<int>("Score");
            b.Property<int>("TotalDesired");
            b.Property<int>("TotalMandatory");
            b.HasKey("Id");
            b.HasIndex("AssignmentId", "ConsultantId");
            b.ToTable("MatchResults");
        });

        modelBuilder.Entity("XlentMatch.Api.Models.MatchRequirementResult", b =>
        {
            b.Property<int>("Id").ValueGeneratedOnAdd();
            b.Property<string>("Evidence").IsRequired();
            b.Property<bool>("IsMatched");
            b.Property<int>("MatchResultId");
            b.Property<string>("RequirementName").IsRequired();
            b.Property<int>("Type");
            b.HasKey("Id");
            b.HasIndex("MatchResultId");
            b.ToTable("MatchRequirementResults");
        });

        modelBuilder.Entity("XlentMatch.Api.Models.CvUploadRecord", b =>
        {
            b.Property<int>("Id").ValueGeneratedOnAdd();
            b.Property<int?>("ConsultantId");
            b.Property<string>("DraftJson");
            b.Property<string>("ErrorMessage");
            b.Property<long>("FileSize");
            b.Property<string>("FileName").IsRequired();
            b.Property<string>("Status").IsRequired();
            b.Property<DateTime>("UploadedAt");
            b.HasKey("Id");
            b.HasIndex("ConsultantId");
            b.ToTable("CvUploads");
        });

        modelBuilder.Entity("XlentMatch.Api.Models.SkillAlias", b =>
        {
            b.HasOne("XlentMatch.Api.Models.Skill", "Skill")
                .WithMany("Aliases")
                .HasForeignKey("SkillId")
                .OnDelete(DeleteBehavior.Cascade)
                .IsRequired();
            b.Navigation("Skill");
        });

        modelBuilder.Entity("XlentMatch.Api.Models.ConsultantSkill", b =>
        {
            b.HasOne("XlentMatch.Api.Models.Consultant", null)
                .WithMany("Skills")
                .HasForeignKey("ConsultantId")
                .OnDelete(DeleteBehavior.Cascade)
                .IsRequired();

            b.HasOne("XlentMatch.Api.Models.Skill", "Skill")
                .WithMany()
                .HasForeignKey("SkillId")
                .OnDelete(DeleteBehavior.Restrict);

            b.Navigation("Skill");
        });

        foreach (var entity in new[]
        {
            "XlentMatch.Api.Models.Experience",
            "XlentMatch.Api.Models.Project",
            "XlentMatch.Api.Models.Education",
            "XlentMatch.Api.Models.ConsultantLanguage",
            "XlentMatch.Api.Models.ConsultantIndustry",
            "XlentMatch.Api.Models.Certification"
        })
        {
            modelBuilder.Entity(entity, b =>
            {
                b.HasOne("XlentMatch.Api.Models.Consultant", null)
                    .WithMany()
                    .HasForeignKey("ConsultantId")
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired();
            });
        }

        modelBuilder.Entity("XlentMatch.Api.Models.AssignmentRequirement", b =>
        {
            b.HasOne("XlentMatch.Api.Models.Assignment", null)
                .WithMany("Requirements")
                .HasForeignKey("AssignmentId")
                .OnDelete(DeleteBehavior.Cascade)
                .IsRequired();

            b.HasOne("XlentMatch.Api.Models.Skill", "Skill")
                .WithMany()
                .HasForeignKey("SkillId")
                .OnDelete(DeleteBehavior.Restrict);

            b.Navigation("Skill");
        });

        modelBuilder.Entity("XlentMatch.Api.Models.MatchRequirementResult", b =>
        {
            b.HasOne("XlentMatch.Api.Models.MatchResult", null)
                .WithMany("Details")
                .HasForeignKey("MatchResultId")
                .OnDelete(DeleteBehavior.Cascade)
                .IsRequired();
        });

        modelBuilder.Entity("XlentMatch.Api.Models.CvUploadRecord", b =>
        {
            b.HasOne("XlentMatch.Api.Models.Consultant", null)
                .WithMany()
                .HasForeignKey("ConsultantId")
                .OnDelete(DeleteBehavior.SetNull);
        });
    }
}
