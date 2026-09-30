using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using XlentMatch.Api.Data;

#nullable disable

namespace XlentMatch.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261001003000_AddLanguageReviewAndConsultantProfileData")]
public partial class AddLanguageReviewAndConsultantProfileData : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AlterColumn<int>(
            name: "YearsOfExperience", table: "Consultants", type: "int", nullable: true,
            oldClrType: typeof(int), oldType: "int");

        migrationBuilder.Sql("""
            UPDATE Consultants SET YearsOfExperience = NULL WHERE YearsOfExperience <= 0;
            """);

        migrationBuilder.AddColumn<string>(
            name: "YearsOfExperienceSource", table: "Consultants", type: "nvarchar(max)", nullable: true);
        migrationBuilder.AddColumn<DateOnly>(
            name: "AvailableFromDate", table: "Consultants", type: "date", nullable: true);
        migrationBuilder.AddColumn<DateTime>(
            name: "AvailabilityConfirmedAt", table: "Consultants", type: "datetime2", nullable: true);
        migrationBuilder.AddColumn<DateOnly>(
            name: "RequiredStartDate", table: "Assignments", type: "date", nullable: true);
        migrationBuilder.AddColumn<string>(
            name: "SourceLevel", table: "ConsultantLanguages", type: "nvarchar(max)", nullable: true);

        migrationBuilder.Sql("""
            UPDATE ConsultantLanguages
            SET SourceLevel = Level,
                Level = CASE
                    WHEN LOWER(LTRIM(RTRIM(Level))) IN (N'basic', N'beginner', N'elementary', N'grundläggande') THEN N'Basic'
                    WHEN LOWER(LTRIM(RTRIM(Level))) IN (N'intermediate', N'conversational', N'medel', N'medelnivå', N'goda kunskaper') THEN N'Intermediate'
                    WHEN LOWER(LTRIM(RTRIM(Level))) IN (N'fluent', N'flytande', N'native', N'modersmål', N'mother tongue', N'proficient') THEN N'Fluent'
                    ELSE NULL
                END
            WHERE Level IS NOT NULL;
            """);

        migrationBuilder.AddColumn<string>(
            name: "Name", table: "AssignmentRequirements", type: "nvarchar(max)", nullable: true);
        migrationBuilder.Sql("""
            UPDATE requirements
            SET Name = COALESCE(skills.CanonicalName, N'')
            FROM AssignmentRequirements AS requirements
            LEFT JOIN Skills AS skills ON skills.Id = requirements.SkillId;
            """);
        migrationBuilder.AlterColumn<string>(
            name: "Name", table: "AssignmentRequirements", type: "nvarchar(max)", nullable: false,
            oldClrType: typeof(string), oldType: "nvarchar(max)", oldNullable: true);
        migrationBuilder.AlterColumn<int>(
            name: "SkillId", table: "AssignmentRequirements", type: "int", nullable: true,
            oldClrType: typeof(int), oldType: "int");

        migrationBuilder.CreateTable(
            name: "LanguageSuggestions",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false).Annotation("SqlServer:Identity", "1, 1"),
                Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                NormalizedName = table.Column<string>(type: "nvarchar(450)", nullable: false),
                Occurrences = table.Column<int>(type: "int", nullable: false),
                FirstSeenAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                LastSeenAt = table.Column<DateTime>(type: "datetime2", nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_LanguageSuggestions", x => x.Id));
        migrationBuilder.Sql("""
            INSERT INTO LanguageSuggestions (Name, NormalizedName, Occurrences, FirstSeenAt, LastSeenAt)
            SELECT MIN(cl.Name), UPPER(LTRIM(RTRIM(cl.Name))), COUNT(*), SYSUTCDATETIME(), SYSUTCDATETIME()
            FROM ConsultantLanguages AS cl
            WHERE NULLIF(LTRIM(RTRIM(cl.Name)), N'') IS NOT NULL
              AND NOT EXISTS (
                SELECT 1 FROM Skills AS s
                WHERE s.Category = N'Human language'
                  AND (
                    s.NormalizedName = UPPER(LTRIM(RTRIM(cl.Name)))
                    OR EXISTS (
                        SELECT 1 FROM SkillAliases AS a
                        WHERE a.SkillId = s.Id
                          AND a.NormalizedAlias = UPPER(LTRIM(RTRIM(cl.Name)))
                    )
                  )
            )
            GROUP BY UPPER(LTRIM(RTRIM(cl.Name)));
            """);

        migrationBuilder.Sql("""
            INSERT INTO LanguageSuggestions (Name, NormalizedName, Occurrences, FirstSeenAt, LastSeenAt)
            SELECT MIN(skill.CanonicalName), skill.NormalizedName, COUNT(*), SYSUTCDATETIME(), SYSUTCDATETIME()
            FROM AssignmentRequirements AS requirement
            INNER JOIN Skills AS skill ON skill.Id = requirement.SkillId
            WHERE requirement.Category = N'HumanLanguage'
              AND skill.Category <> N'Human language'
              AND NOT EXISTS (SELECT 1 FROM LanguageSuggestions AS proposal WHERE proposal.NormalizedName = skill.NormalizedName)
            GROUP BY skill.NormalizedName;
            """);

        migrationBuilder.CreateIndex(
            name: "IX_LanguageSuggestions_NormalizedName",
            table: "LanguageSuggestions",
            column: "NormalizedName",
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            IF EXISTS (SELECT 1 FROM AssignmentRequirements WHERE SkillId IS NULL)
                THROW 51000, 'Cannot roll back while unapproved language requirements exist.', 1;
            """);

        migrationBuilder.DropTable(name: "LanguageSuggestions");
        migrationBuilder.DropColumn(name: "Name", table: "AssignmentRequirements");
        migrationBuilder.AlterColumn<int>(
            name: "SkillId", table: "AssignmentRequirements", type: "int", nullable: false,
            oldClrType: typeof(int), oldType: "int", oldNullable: true);
        migrationBuilder.DropColumn(name: "YearsOfExperienceSource", table: "Consultants");
        migrationBuilder.DropColumn(name: "AvailableFromDate", table: "Consultants");
        migrationBuilder.DropColumn(name: "AvailabilityConfirmedAt", table: "Consultants");
        migrationBuilder.DropColumn(name: "RequiredStartDate", table: "Assignments");
        migrationBuilder.Sql("""
            UPDATE ConsultantLanguages SET Level = COALESCE(Level, SourceLevel);
            """);
        migrationBuilder.DropColumn(name: "SourceLevel", table: "ConsultantLanguages");
        migrationBuilder.AlterColumn<int>(
            name: "YearsOfExperience", table: "Consultants", type: "int", nullable: false,
            defaultValue: 0, oldClrType: typeof(int), oldType: "int", oldNullable: true);
    }
}
