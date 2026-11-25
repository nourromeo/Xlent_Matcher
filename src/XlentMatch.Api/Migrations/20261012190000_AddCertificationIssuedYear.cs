using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using XlentMatch.Api.Data;

#nullable disable

namespace XlentMatch.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261012190000_AddCertificationIssuedYear")]
public partial class AddCertificationIssuedYear : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "IssuedYear",
            table: "Certifications",
            type: "nvarchar(4)",
            maxLength: 4,
            nullable: true);

        migrationBuilder.Sql("UPDATE [Certifications] SET [IssuedYear] = CONVERT(nvarchar(4), YEAR([IssuedDate])) WHERE [IssuedDate] IS NOT NULL");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "IssuedYear", table: "Certifications");
    }
}
