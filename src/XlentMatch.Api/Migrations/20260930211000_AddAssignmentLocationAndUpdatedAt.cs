using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace XlentMatch.Api.Migrations;

public partial class AddAssignmentLocationAndUpdatedAt : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "Location",
            table: "Assignments",
            type: "nvarchar(max)",
            nullable: true);

        migrationBuilder.AddColumn<DateTime>(
            name: "UpdatedAt",
            table: "Assignments",
            type: "datetime2",
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "Location", table: "Assignments");
        migrationBuilder.DropColumn(name: "UpdatedAt", table: "Assignments");
    }
}