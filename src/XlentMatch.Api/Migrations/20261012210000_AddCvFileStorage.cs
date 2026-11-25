using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using XlentMatch.Api.Data;

#nullable disable

namespace XlentMatch.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261012210000_AddCvFileStorage")]
public partial class AddCvFileStorage : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(name: "StorageKey", table: "CvUploads", type: "nvarchar(max)", nullable: true);
        migrationBuilder.AddColumn<string>(name: "ContentType", table: "CvUploads", type: "nvarchar(max)", nullable: true);
        migrationBuilder.AddColumn<bool>(name: "IsActive", table: "CvUploads", type: "bit", nullable: false, defaultValue: false);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "StorageKey", table: "CvUploads");
        migrationBuilder.DropColumn(name: "ContentType", table: "CvUploads");
        migrationBuilder.DropColumn(name: "IsActive", table: "CvUploads");
    }
}
