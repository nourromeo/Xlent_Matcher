using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace XlentMatch.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAssignmentSeniorityRequirementModes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "MatchMode",
                table: "AssignmentRequirements",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<string>(
                name: "MaximumSeniority",
                table: "AssignmentRequirements",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.Sql("""
                INSERT INTO AssignmentRequirements (AssignmentId, Name, SkillId, Type, MinYears, MinLevel, Proficiency, Category, MatchMode, MaximumSeniority)
                SELECT a.Id, LTRIM(RTRIM(a.Seniority)), NULL, 1, NULL, NULL, NULL, 'Seniority', 1, NULL
                FROM Assignments a
                WHERE a.Seniority IS NOT NULL AND LTRIM(RTRIM(a.Seniority)) <> ''
                  AND NOT EXISTS (SELECT 1 FROM AssignmentRequirements r WHERE r.AssignmentId = a.Id AND r.Category = 'Seniority');
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MatchMode",
                table: "AssignmentRequirements");

            migrationBuilder.DropColumn(
                name: "MaximumSeniority",
                table: "AssignmentRequirements");
        }
    }
}
