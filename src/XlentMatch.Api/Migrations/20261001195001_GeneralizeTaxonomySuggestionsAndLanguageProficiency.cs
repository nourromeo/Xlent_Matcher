using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace XlentMatch.Api.Migrations
{
    /// <inheritdoc />
    public partial class GeneralizeTaxonomySuggestionsAndLanguageProficiency : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Proficiency",
                table: "ConsultantLanguages",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.Sql("UPDATE ConsultantLanguages SET Proficiency = CASE WHEN Level IS NULL OR LTRIM(RTRIM(Level)) = '' THEN 'Not specified' WHEN LOWER(LTRIM(RTRIM(Level))) IN ('basic','beginner','elementary','grundläggande') THEN 'Low' WHEN LOWER(LTRIM(RTRIM(Level))) IN ('intermediate','conversational','medel','medelnivå','goda kunskaper') THEN 'Medium' WHEN LOWER(LTRIM(RTRIM(Level))) IN ('fluent','flytande','proficient') THEN 'High' WHEN LOWER(LTRIM(RTRIM(Level))) IN ('native','modersmål','mother tongue') THEN 'Native' ELSE 'Not specified' END;");
            migrationBuilder.DropColumn(name: "Level", table: "ConsultantLanguages");
            migrationBuilder.DropColumn(name: "SourceLevel", table: "ConsultantLanguages");

            migrationBuilder.AddColumn<string>(
                name: "Proficiency",
                table: "AssignmentRequirements",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.Sql("UPDATE AssignmentRequirements SET Proficiency = CASE WHEN RequiresFluency = 1 THEN 'High' ELSE NULL END WHERE Category = 'HumanLanguage';");
            migrationBuilder.DropColumn(name: "RequiresFluency", table: "AssignmentRequirements");

            migrationBuilder.RenameTable(name: "LanguageSuggestions", newName: "SkillSuggestions");
            migrationBuilder.AddColumn<string>(name: "Category", table: "SkillSuggestions", type: "nvarchar(max)", nullable: false, defaultValue: "Human language");
            migrationBuilder.RenameIndex(name: "IX_LanguageSuggestions_NormalizedName", table: "SkillSuggestions", newName: "IX_SkillSuggestions_NormalizedName");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SkillSuggestions");

            migrationBuilder.DropColumn(
                name: "Proficiency",
                table: "ConsultantLanguages");

            migrationBuilder.DropColumn(
                name: "Proficiency",
                table: "AssignmentRequirements");

            migrationBuilder.AddColumn<string>(
                name: "Level",
                table: "ConsultantLanguages",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SourceLevel",
                table: "ConsultantLanguages",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "RequiresFluency",
                table: "AssignmentRequirements",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "LanguageSuggestions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FirstSeenAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastSeenAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    NormalizedName = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Occurrences = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LanguageSuggestions", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LanguageSuggestions_NormalizedName",
                table: "LanguageSuggestions",
                column: "NormalizedName",
                unique: true);
        }
    }
}
