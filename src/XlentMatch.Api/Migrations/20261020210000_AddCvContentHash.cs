using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using XlentMatch.Api.Data;

#nullable disable

namespace XlentMatch.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261020210000_AddCvContentHash")]
public partial class AddCvContentHash : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "ContentHash", table: "CvUploads",
            type: "nvarchar(64)", maxLength: 64, nullable: true);
        migrationBuilder.CreateIndex(
            name: "IX_CvUploads_ContentHash", table: "CvUploads", column: "ContentHash");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(name: "IX_CvUploads_ContentHash", table: "CvUploads");
        migrationBuilder.DropColumn(name: "ContentHash", table: "CvUploads");
    }
}
