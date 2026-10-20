using Microsoft.EntityFrameworkCore;
using XlentMatch.Api.Models;

namespace XlentMatch.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Consultant> Consultants => Set<Consultant>();
    public DbSet<ConsultantSkill> ConsultantSkills => Set<ConsultantSkill>();
    public DbSet<Skill> Skills => Set<Skill>();
    public DbSet<SkillAlias> SkillAliases => Set<SkillAlias>();
    public DbSet<Experience> Experiences => Set<Experience>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Education> Education => Set<Education>();
    public DbSet<ConsultantLanguage> ConsultantLanguages => Set<ConsultantLanguage>();
    public DbSet<ConsultantIndustry> ConsultantIndustries => Set<ConsultantIndustry>();
    public DbSet<Certification> Certifications => Set<Certification>();
    public DbSet<Assignment> Assignments => Set<Assignment>();
    public DbSet<AssignmentRequirement> AssignmentRequirements => Set<AssignmentRequirement>();
    public DbSet<SavedAiRanking> SavedAiRankings => Set<SavedAiRanking>();
    public DbSet<MatchResult> MatchResults => Set<MatchResult>();
    public DbSet<MatchRequirementResult> MatchRequirementResults => Set<MatchRequirementResult>();
    public DbSet<CvUploadRecord> CvUploads => Set<CvUploadRecord>();
    public DbSet<SkillSuggestion> SkillSuggestions => Set<SkillSuggestion>();
    public DbSet<AiPromptVersion> AiPromptVersions => Set<AiPromptVersion>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.Entity<Consultant>().Property(x => x.Availability).HasDefaultValue(ConsultantAvailability.Available);
        mb.Entity<Skill>().HasIndex(x => x.NormalizedName).IsUnique();
        mb.Entity<SkillSuggestion>().HasIndex(x => x.NormalizedName).IsUnique();
        mb.Entity<SkillAlias>().HasIndex(x => x.NormalizedAlias).IsUnique();
        mb.Entity<Skill>()
            .HasMany(x => x.Aliases)
            .WithOne(x => x.Skill)
            .HasForeignKey(x => x.SkillId)
            .OnDelete(DeleteBehavior.Cascade);

        mb.Entity<Consultant>().HasMany(c => c.Skills).WithOne().HasForeignKey(s => s.ConsultantId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<ConsultantSkill>()
            .HasOne(x => x.Skill)
            .WithMany()
            .HasForeignKey(x => x.SkillId)
            .OnDelete(DeleteBehavior.Restrict);
        mb.Entity<ConsultantSkill>().HasIndex(x => new { x.ConsultantId, x.SkillId });

        mb.Entity<Consultant>().HasMany(c => c.Experiences).WithOne().HasForeignKey(e => e.ConsultantId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<Consultant>().HasMany(c => c.Projects).WithOne().HasForeignKey(p => p.ConsultantId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<Consultant>().HasMany(c => c.Education).WithOne().HasForeignKey(e => e.ConsultantId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<Consultant>().HasMany(c => c.Languages).WithOne().HasForeignKey(l => l.ConsultantId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<Consultant>().HasMany(c => c.Industries).WithOne().HasForeignKey(i => i.ConsultantId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<Consultant>().HasMany(c => c.Certifications).WithOne().HasForeignKey(c => c.ConsultantId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<Certification>().Property(c => c.IssuedYear).HasMaxLength(4);

        mb.Entity<Assignment>().Property(a => a.ReferenceNumber).HasMaxLength(32).IsRequired();
        mb.Entity<Assignment>().HasIndex(a => a.ReferenceNumber).IsUnique();
        mb.Entity<Assignment>().HasMany(a => a.Requirements).WithOne().HasForeignKey(r => r.AssignmentId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<AssignmentRequirement>()
            .HasOne(x => x.Skill)
            .WithMany()
            .HasForeignKey(x => x.SkillId)
            .OnDelete(DeleteBehavior.Restrict);
        mb.Entity<AssignmentRequirement>().HasIndex(x => new { x.AssignmentId, x.SkillId });

        mb.Entity<SavedAiRanking>().HasOne<Assignment>().WithMany().HasForeignKey(x => x.AssignmentId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<SavedAiRanking>().HasIndex(x => x.AssignmentId);
        mb.Entity<MatchResult>().HasMany(m => m.Details).WithOne().HasForeignKey(d => d.MatchResultId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<MatchResult>().HasIndex(m => new { m.AssignmentId, m.ConsultantId });

        mb.Entity<CvUploadRecord>()
            .HasOne<Consultant>()
            .WithMany()
            .HasForeignKey(x => x.ConsultantId)
            .OnDelete(DeleteBehavior.SetNull);
        mb.Entity<CvUploadRecord>().HasIndex(x => x.ConsultantId);
        mb.Entity<CvUploadRecord>().Property(x => x.ContentHash).HasMaxLength(64);
        mb.Entity<CvUploadRecord>().HasIndex(x => x.ContentHash);
        mb.Entity<CvUploadRecord>().HasIndex(x => new { x.ConsultantId, x.IsActive }, "IX_CvUploads_OneActivePerConsultant")
            .IsUnique()
            .HasFilter("[IsActive] = 1 AND [ConsultantId] IS NOT NULL");
        mb.Entity<AiPromptVersion>().HasIndex(x => new { x.PromptKey, x.Version }).IsUnique();
        mb.Entity<AiPromptVersion>().HasIndex(x => new { x.PromptKey, x.IsActive })
            .HasFilter("[IsActive] = 1")
            .IsUnique();
        mb.Entity<AiPromptVersion>().Property(x => x.PromptKey).IsRequired();
        mb.Entity<AiPromptVersion>().Property(x => x.Content).IsRequired();
        mb.Entity<AiPromptVersion>().ToTable(table => table.HasCheckConstraint("CK_AiPromptVersions_Version_Positive", "[Version] > 0"));
    }
}
