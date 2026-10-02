using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace XlentMatch.Api.Migrations
{
    /// <inheritdoc />
    public partial class ReplaceConsultantAvailabilityModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE Consultants SET Availability = 'Available' WHERE Availability IS NULL OR LTRIM(RTRIM(Availability)) NOT IN ('Available', 'Unavailable');");

            migrationBuilder.DropColumn(
                name: "AvailabilityConfirmedAt",
                table: "Consultants");

            migrationBuilder.RenameColumn(
                name: "AvailableFromDate",
                table: "Consultants",
                newName: "AvailableAgainDate");

            migrationBuilder.AlterColumn<string>(
                name: "Availability",
                table: "Consultants",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "Available",
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "AvailableAgainDate",
                table: "Consultants",
                newName: "AvailableFromDate");

            migrationBuilder.AlterColumn<string>(
                name: "Availability",
                table: "Consultants",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldDefaultValue: "Available");

            migrationBuilder.AddColumn<DateTime>(
                name: "AvailabilityConfirmedAt",
                table: "Consultants",
                type: "datetime2",
                nullable: true);
        }
    }
}
