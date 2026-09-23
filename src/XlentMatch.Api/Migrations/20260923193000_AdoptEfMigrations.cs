using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using XlentMatch.Api.Data;

#nullable disable

namespace XlentMatch.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260923193000_AdoptEfMigrations")]
public class AdoptEfMigrations : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            IF OBJECT_ID(N'[Consultants]', N'U') IS NULL
            BEGIN
                CREATE TABLE [Consultants] (
                    [Id] int NOT NULL IDENTITY,
                    [FirstName] nvarchar(max) NOT NULL,
                    [LastName] nvarchar(max) NOT NULL,
                    [Email] nvarchar(max) NULL,
                    [Title] nvarchar(max) NULL,
                    [Summary] nvarchar(max) NULL,
                    [Seniority] nvarchar(max) NULL,
                    [YearsOfExperience] int NOT NULL,
                    [Availability] nvarchar(max) NULL,
                    [Office] nvarchar(max) NULL,
                    [OriginalCvText] nvarchar(max) NULL,
                    CONSTRAINT [PK_Consultants] PRIMARY KEY ([Id])
                );
            END;

            IF OBJECT_ID(N'[Assignments]', N'U') IS NULL
            BEGIN
                CREATE TABLE [Assignments] (
                    [Id] int NOT NULL IDENTITY,
                    [CustomerName] nvarchar(max) NOT NULL,
                    [Title] nvarchar(max) NOT NULL,
                    [Description] nvarchar(max) NULL,
                    [Seniority] nvarchar(max) NULL,
                    [MinYearsExperience] int NOT NULL,
                    [Availability] nvarchar(max) NULL,
                    [Status] int NOT NULL,
                    [CreatedAt] datetime2 NOT NULL,
                    CONSTRAINT [PK_Assignments] PRIMARY KEY ([Id])
                );
            END;

            IF OBJECT_ID(N'[Skills]', N'U') IS NULL
            BEGIN
                CREATE TABLE [Skills] (
                    [Id] int NOT NULL IDENTITY,
                    [CanonicalName] nvarchar(max) NOT NULL,
                    [NormalizedName] nvarchar(450) NOT NULL,
                    [Category] nvarchar(max) NOT NULL,
                    CONSTRAINT [PK_Skills] PRIMARY KEY ([Id])
                );
                CREATE UNIQUE INDEX [IX_Skills_NormalizedName] ON [Skills] ([NormalizedName]);
            END;

            IF OBJECT_ID(N'[SkillAliases]', N'U') IS NULL
            BEGIN
                CREATE TABLE [SkillAliases] (
                    [Id] int NOT NULL IDENTITY,
                    [SkillId] int NOT NULL,
                    [Alias] nvarchar(max) NOT NULL,
                    [NormalizedAlias] nvarchar(450) NOT NULL,
                    CONSTRAINT [PK_SkillAliases] PRIMARY KEY ([Id]),
                    CONSTRAINT [FK_SkillAliases_Skills_SkillId]
                        FOREIGN KEY ([SkillId]) REFERENCES [Skills] ([Id]) ON DELETE CASCADE
                );
                CREATE INDEX [IX_SkillAliases_SkillId] ON [SkillAliases] ([SkillId]);
                CREATE UNIQUE INDEX [IX_SkillAliases_NormalizedAlias] ON [SkillAliases] ([NormalizedAlias]);
            END;

            IF OBJECT_ID(N'[ConsultantSkills]', N'U') IS NULL
            BEGIN
                CREATE TABLE [ConsultantSkills] (
                    [Id] int NOT NULL IDENTITY,
                    [ConsultantId] int NOT NULL,
                    [Name] nvarchar(max) NOT NULL,
                    [Category] nvarchar(max) NULL,
                    [SkillId] int NULL,
                    [Years] int NOT NULL,
                    [Level] int NOT NULL,
                    [Evidence] nvarchar(max) NULL,
                    CONSTRAINT [PK_ConsultantSkills] PRIMARY KEY ([Id]),
                    CONSTRAINT [FK_ConsultantSkills_Consultants_ConsultantId]
                        FOREIGN KEY ([ConsultantId]) REFERENCES [Consultants] ([Id]) ON DELETE CASCADE,
                    CONSTRAINT [FK_ConsultantSkills_Skills_SkillId]
                        FOREIGN KEY ([SkillId]) REFERENCES [Skills] ([Id]) ON DELETE NO ACTION
                );
                CREATE INDEX [IX_ConsultantSkills_ConsultantId] ON [ConsultantSkills] ([ConsultantId]);
                CREATE INDEX [IX_ConsultantSkills_ConsultantId_SkillId] ON [ConsultantSkills] ([ConsultantId], [SkillId]);
                CREATE INDEX [IX_ConsultantSkills_SkillId] ON [ConsultantSkills] ([SkillId]);
            END
            ELSE
            BEGIN
                IF COL_LENGTH('ConsultantSkills', 'SkillId') IS NULL
                    ALTER TABLE [ConsultantSkills] ADD [SkillId] int NULL;

                IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_ConsultantSkills_Skills_SkillId')
                    ALTER TABLE [ConsultantSkills]
                    ADD CONSTRAINT [FK_ConsultantSkills_Skills_SkillId]
                    FOREIGN KEY ([SkillId]) REFERENCES [Skills] ([Id]);

                IF NOT EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = 'IX_ConsultantSkills_ConsultantId_SkillId'
                      AND object_id = OBJECT_ID('ConsultantSkills')
                )
                    CREATE INDEX [IX_ConsultantSkills_ConsultantId_SkillId]
                    ON [ConsultantSkills] ([ConsultantId], [SkillId]);
            END;

            IF OBJECT_ID(N'[AssignmentRequirements]', N'U') IS NULL
            BEGIN
                CREATE TABLE [AssignmentRequirements] (
                    [Id] int NOT NULL IDENTITY,
                    [AssignmentId] int NOT NULL,
                    [Name] nvarchar(max) NOT NULL,
                    [SkillId] int NULL,
                    [Type] int NOT NULL,
                    [MinYears] int NULL,
                    [MinLevel] int NULL,
                    CONSTRAINT [PK_AssignmentRequirements] PRIMARY KEY ([Id]),
                    CONSTRAINT [FK_AssignmentRequirements_Assignments_AssignmentId]
                        FOREIGN KEY ([AssignmentId]) REFERENCES [Assignments] ([Id]) ON DELETE CASCADE,
                    CONSTRAINT [FK_AssignmentRequirements_Skills_SkillId]
                        FOREIGN KEY ([SkillId]) REFERENCES [Skills] ([Id]) ON DELETE NO ACTION
                );
                CREATE INDEX [IX_AssignmentRequirements_AssignmentId] ON [AssignmentRequirements] ([AssignmentId]);
                CREATE INDEX [IX_AssignmentRequirements_AssignmentId_SkillId] ON [AssignmentRequirements] ([AssignmentId], [SkillId]);
                CREATE INDEX [IX_AssignmentRequirements_SkillId] ON [AssignmentRequirements] ([SkillId]);
            END
            ELSE
            BEGIN
                IF COL_LENGTH('AssignmentRequirements', 'SkillId') IS NULL
                    ALTER TABLE [AssignmentRequirements] ADD [SkillId] int NULL;

                IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_AssignmentRequirements_Skills_SkillId')
                    ALTER TABLE [AssignmentRequirements]
                    ADD CONSTRAINT [FK_AssignmentRequirements_Skills_SkillId]
                    FOREIGN KEY ([SkillId]) REFERENCES [Skills] ([Id]);

                IF NOT EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = 'IX_AssignmentRequirements_AssignmentId_SkillId'
                      AND object_id = OBJECT_ID('AssignmentRequirements')
                )
                    CREATE INDEX [IX_AssignmentRequirements_AssignmentId_SkillId]
                    ON [AssignmentRequirements] ([AssignmentId], [SkillId]);
            END;

            IF OBJECT_ID(N'[Experiences]', N'U') IS NULL
            BEGIN
                CREATE TABLE [Experiences] (
                    [Id] int NOT NULL IDENTITY,
                    [ConsultantId] int NOT NULL,
                    [Company] nvarchar(max) NOT NULL,
                    [Role] nvarchar(max) NOT NULL,
                    [Description] nvarchar(max) NULL,
                    [StartDate] date NULL,
                    [EndDate] date NULL,
                    CONSTRAINT [PK_Experiences] PRIMARY KEY ([Id]),
                    CONSTRAINT [FK_Experiences_Consultants_ConsultantId]
                        FOREIGN KEY ([ConsultantId]) REFERENCES [Consultants] ([Id]) ON DELETE CASCADE
                );
                CREATE INDEX [IX_Experiences_ConsultantId] ON [Experiences] ([ConsultantId]);
            END;

            IF OBJECT_ID(N'[Projects]', N'U') IS NULL
            BEGIN
                CREATE TABLE [Projects] (
                    [Id] int NOT NULL IDENTITY,
                    [ConsultantId] int NOT NULL,
                    [Name] nvarchar(max) NOT NULL,
                    [Description] nvarchar(max) NULL,
                    [Technologies] nvarchar(max) NULL,
                    CONSTRAINT [PK_Projects] PRIMARY KEY ([Id]),
                    CONSTRAINT [FK_Projects_Consultants_ConsultantId]
                        FOREIGN KEY ([ConsultantId]) REFERENCES [Consultants] ([Id]) ON DELETE CASCADE
                );
                CREATE INDEX [IX_Projects_ConsultantId] ON [Projects] ([ConsultantId]);
            END;

            IF OBJECT_ID(N'[Education]', N'U') IS NULL
            BEGIN
                CREATE TABLE [Education] (
                    [Id] int NOT NULL IDENTITY,
                    [ConsultantId] int NOT NULL,
                    [Degree] nvarchar(max) NOT NULL,
                    [School] nvarchar(max) NULL,
                    [Year] nvarchar(max) NULL,
                    CONSTRAINT [PK_Education] PRIMARY KEY ([Id]),
                    CONSTRAINT [FK_Education_Consultants_ConsultantId]
                        FOREIGN KEY ([ConsultantId]) REFERENCES [Consultants] ([Id]) ON DELETE CASCADE
                );
                CREATE INDEX [IX_Education_ConsultantId] ON [Education] ([ConsultantId]);
            END;

            IF OBJECT_ID(N'[ConsultantLanguages]', N'U') IS NULL
            BEGIN
                CREATE TABLE [ConsultantLanguages] (
                    [Id] int NOT NULL IDENTITY,
                    [ConsultantId] int NOT NULL,
                    [Name] nvarchar(max) NOT NULL,
                    [Level] nvarchar(max) NULL,
                    CONSTRAINT [PK_ConsultantLanguages] PRIMARY KEY ([Id]),
                    CONSTRAINT [FK_ConsultantLanguages_Consultants_ConsultantId]
                        FOREIGN KEY ([ConsultantId]) REFERENCES [Consultants] ([Id]) ON DELETE CASCADE
                );
                CREATE INDEX [IX_ConsultantLanguages_ConsultantId] ON [ConsultantLanguages] ([ConsultantId]);
            END;

            IF OBJECT_ID(N'[ConsultantIndustries]', N'U') IS NULL
            BEGIN
                CREATE TABLE [ConsultantIndustries] (
                    [Id] int NOT NULL IDENTITY,
                    [ConsultantId] int NOT NULL,
                    [Name] nvarchar(max) NOT NULL,
                    CONSTRAINT [PK_ConsultantIndustries] PRIMARY KEY ([Id]),
                    CONSTRAINT [FK_ConsultantIndustries_Consultants_ConsultantId]
                        FOREIGN KEY ([ConsultantId]) REFERENCES [Consultants] ([Id]) ON DELETE CASCADE
                );
                CREATE INDEX [IX_ConsultantIndustries_ConsultantId] ON [ConsultantIndustries] ([ConsultantId]);
            END;

            IF OBJECT_ID(N'[Certifications]', N'U') IS NULL
            BEGIN
                CREATE TABLE [Certifications] (
                    [Id] int NOT NULL IDENTITY,
                    [ConsultantId] int NOT NULL,
                    [Name] nvarchar(max) NOT NULL,
                    [Issuer] nvarchar(max) NULL,
                    [IssuedDate] date NULL,
                    CONSTRAINT [PK_Certifications] PRIMARY KEY ([Id]),
                    CONSTRAINT [FK_Certifications_Consultants_ConsultantId]
                        FOREIGN KEY ([ConsultantId]) REFERENCES [Consultants] ([Id]) ON DELETE CASCADE
                );
                CREATE INDEX [IX_Certifications_ConsultantId] ON [Certifications] ([ConsultantId]);
            END;

            IF OBJECT_ID(N'[MatchResults]', N'U') IS NULL
            BEGIN
                CREATE TABLE [MatchResults] (
                    [Id] int NOT NULL IDENTITY,
                    [AssignmentId] int NOT NULL,
                    [ConsultantId] int NOT NULL,
                    [ConsultantName] nvarchar(max) NOT NULL,
                    [Score] int NOT NULL,
                    [Rank] int NOT NULL,
                    [MatchedMandatory] int NOT NULL,
                    [TotalMandatory] int NOT NULL,
                    [MatchedDesired] int NOT NULL,
                    [TotalDesired] int NOT NULL,
                    [ExperienceScore] int NOT NULL,
                    [Explanation] nvarchar(max) NOT NULL,
                    [CreatedAt] datetime2 NOT NULL,
                    CONSTRAINT [PK_MatchResults] PRIMARY KEY ([Id])
                );
                CREATE INDEX [IX_MatchResults_AssignmentId_ConsultantId] ON [MatchResults] ([AssignmentId], [ConsultantId]);
            END;

            IF OBJECT_ID(N'[MatchRequirementResults]', N'U') IS NULL
            BEGIN
                CREATE TABLE [MatchRequirementResults] (
                    [Id] int NOT NULL IDENTITY,
                    [MatchResultId] int NOT NULL,
                    [RequirementName] nvarchar(max) NOT NULL,
                    [Type] int NOT NULL,
                    [IsMatched] bit NOT NULL,
                    [Evidence] nvarchar(max) NOT NULL,
                    CONSTRAINT [PK_MatchRequirementResults] PRIMARY KEY ([Id]),
                    CONSTRAINT [FK_MatchRequirementResults_MatchResults_MatchResultId]
                        FOREIGN KEY ([MatchResultId]) REFERENCES [MatchResults] ([Id]) ON DELETE CASCADE
                );
                CREATE INDEX [IX_MatchRequirementResults_MatchResultId] ON [MatchRequirementResults] ([MatchResultId]);
            END;

            IF OBJECT_ID(N'[CvUploads]', N'U') IS NULL
            BEGIN
                CREATE TABLE [CvUploads] (
                    [Id] int NOT NULL IDENTITY,
                    [FileName] nvarchar(max) NOT NULL,
                    [FileSize] bigint NOT NULL,
                    [Status] nvarchar(max) NOT NULL,
                    [UploadedAt] datetime2 NOT NULL,
                    [ErrorMessage] nvarchar(max) NULL,
                    [ConsultantId] int NULL,
                    [DraftJson] nvarchar(max) NULL,
                    CONSTRAINT [PK_CvUploads] PRIMARY KEY ([Id]),
                    CONSTRAINT [FK_CvUploads_Consultants_ConsultantId]
                        FOREIGN KEY ([ConsultantId]) REFERENCES [Consultants] ([Id]) ON DELETE SET NULL
                );
                CREATE INDEX [IX_CvUploads_ConsultantId] ON [CvUploads] ([ConsultantId]);
            END;

            IF OBJECT_ID(N'[AdaptedCvs]', N'U') IS NOT NULL
                DROP TABLE [AdaptedCvs];
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // This adoption migration intentionally has no destructive Down path.
        // The development database may contain pre-migration data that must not be dropped automatically.
    }
}
