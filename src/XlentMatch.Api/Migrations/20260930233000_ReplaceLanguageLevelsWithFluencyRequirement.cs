using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace XlentMatch.Api.Migrations;

public partial class ReplaceLanguageLevelsWithFluencyRequirement : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(
            name: "RequiresFluency",
            table: "AssignmentRequirements",
            type: "bit",
            nullable: false,
            defaultValue: false);

        // Fold legacy CEFR settings into the two supported language rules.
        migrationBuilder.Sql("""
            UPDATE requirement
            SET RequiresFluency = CASE WHEN requirement.MinLevel >= 5 THEN 1 ELSE 0 END,
                MinLevel = NULL
            FROM AssignmentRequirements AS requirement
            INNER JOIN Skills AS skill ON requirement.SkillId = skill.Id
            WHERE skill.Category = N'Human language';
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "RequiresFluency",
            table: "AssignmentRequirements");
    }
}