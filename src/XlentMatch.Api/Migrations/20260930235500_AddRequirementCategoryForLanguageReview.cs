using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace XlentMatch.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRequirementCategoryForLanguageReview : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "AssignmentRequirements",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE requirements
                SET Category = CASE
                    WHEN skills.Category = N'Human language' THEN N'HumanLanguage'
                    ELSE N'Skill'
                END
                FROM AssignmentRequirements AS requirements
                LEFT JOIN Skills AS skills ON skills.Id = requirements.SkillId;
                """);

            migrationBuilder.AlterColumn<string>(
                name: "Category",
                table: "AssignmentRequirements",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Category",
                table: "AssignmentRequirements");
        }
    }
}
