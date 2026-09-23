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
    public DbSet<MatchResult> MatchResults => Set<MatchResult>();
    public DbSet<MatchRequirementResult> MatchRequirementResults => Set<MatchRequirementResult>();
    public DbSet<CvUploadRecord> CvUploads => Set<CvUploadRecord>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.Entity<Skill>().HasIndex(x => x.NormalizedName).IsUnique();
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

        mb.Entity<Assignment>().HasMany(a => a.Requirements).WithOne().HasForeignKey(r => r.AssignmentId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<AssignmentRequirement>()
            .HasOne(x => x.Skill)
            .WithMany()
            .HasForeignKey(x => x.SkillId)
            .OnDelete(DeleteBehavior.Restrict);
        mb.Entity<AssignmentRequirement>().HasIndex(x => new { x.AssignmentId, x.SkillId });

        mb.Entity<MatchResult>().HasMany(m => m.Details).WithOne().HasForeignKey(d => d.MatchResultId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<MatchResult>().HasIndex(m => new { m.AssignmentId, m.ConsultantId });

        mb.Entity<CvUploadRecord>()
            .HasOne<Consultant>()
            .WithMany()
            .HasForeignKey(x => x.ConsultantId)
            .OnDelete(DeleteBehavior.SetNull);
        mb.Entity<CvUploadRecord>().HasIndex(x => x.ConsultantId);
    }
}
