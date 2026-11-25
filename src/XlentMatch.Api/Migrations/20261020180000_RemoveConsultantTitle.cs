using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using XlentMatch.Api.Data;

#nullable disable

namespace XlentMatch.Api.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20261020180000_RemoveConsultantTitle")]
    public partial class RemoveConsultantTitle : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Title",
                table: "Consultants");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "Consultants",
                type: "nvarchar(max)",
                nullable: true);
        }
    }
}
