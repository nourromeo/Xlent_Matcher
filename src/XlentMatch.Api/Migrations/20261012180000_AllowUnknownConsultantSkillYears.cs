using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using XlentMatch.Api.Data;

#nullable disable

namespace XlentMatch.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261012180000_AllowUnknownConsultantSkillYears")]
public partial class AllowUnknownConsultantSkillYears : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AlterColumn<int>(
            name: "Years",
            table: "ConsultantSkills",
            type: "int",
            nullable: true,
            oldClrType: typeof(int),
            oldType: "int");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // SQL Server cannot store null in the previous non-nullable column.
        // The old schema requires unknown values to be represented as zero.
        migrationBuilder.Sql("UPDATE [ConsultantSkills] SET [Years] = 0 WHERE [Years] IS NULL");

        migrationBuilder.AlterColumn<int>(
            name: "Years",
            table: "ConsultantSkills",
            type: "int",
            nullable: false,
            oldClrType: typeof(int),
            oldType: "int",
            oldNullable: true);
    }
}
