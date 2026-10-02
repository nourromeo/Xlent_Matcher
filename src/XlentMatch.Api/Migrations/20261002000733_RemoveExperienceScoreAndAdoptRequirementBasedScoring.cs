using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace XlentMatch.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemoveExperienceScoreAndAdoptRequirementBasedScoring : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DELETE FROM [MatchResults];");

            migrationBuilder.DropColumn(
                name: "ExperienceScore",
                table: "MatchResults");

            migrationBuilder.AddColumn<int>(
                name: "MatchedWeight",
                table: "MatchResults",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TotalWeight",
                table: "MatchResults",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MatchedWeight",
                table: "MatchResults");

            migrationBuilder.DropColumn(
                name: "TotalWeight",
                table: "MatchResults");

            migrationBuilder.AddColumn<int>(
                name: "ExperienceScore",
                table: "MatchResults",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }
    }
}
