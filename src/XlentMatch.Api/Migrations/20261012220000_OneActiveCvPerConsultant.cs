using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using XlentMatch.Api.Data;

#nullable disable

namespace XlentMatch.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261012220000_OneActiveCvPerConsultant")]
public partial class OneActiveCvPerConsultant : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateIndex(
            name: "IX_CvUploads_OneActivePerConsultant",
            table: "CvUploads",
            columns: new[] { "ConsultantId", "IsActive" },
            unique: true,
            filter: "[IsActive] = 1 AND [ConsultantId] IS NOT NULL");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(name: "IX_CvUploads_OneActivePerConsultant", table: "CvUploads");
    }
}
