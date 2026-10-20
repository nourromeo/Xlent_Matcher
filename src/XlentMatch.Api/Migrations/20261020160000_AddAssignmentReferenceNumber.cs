using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using XlentMatch.Api.Data;

#nullable disable

namespace XlentMatch.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261020160000_AddAssignmentReferenceNumber")]
public partial class AddAssignmentReferenceNumber : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "ReferenceNumber",
            table: "Assignments",
            type: "nvarchar(32)",
            maxLength: 32,
            nullable: true);

        migrationBuilder.Sql(@"
            WITH Numbered AS (
                SELECT [Id],
                       YEAR([CreatedAt]) AS [Year],
                       ROW_NUMBER() OVER (
                           PARTITION BY YEAR([CreatedAt])
                           ORDER BY [CreatedAt], [Id]
                       ) AS [Seq]
                FROM [Assignments]
            )
            UPDATE a
            SET [ReferenceNumber] = CONCAT('UPP-', n.[Year], '-', 
                CASE WHEN n.[Seq] < 10000 THEN RIGHT(CONCAT('0000', n.[Seq]), 4)
                     ELSE CONVERT(varchar(20), n.[Seq]) END)
            FROM [Assignments] a
            INNER JOIN Numbered n ON n.[Id] = a.[Id];
        ");

        migrationBuilder.AlterColumn<string>(
            name: "ReferenceNumber",
            table: "Assignments",
            type: "nvarchar(32)",
            maxLength: 32,
            nullable: false,
            oldClrType: typeof(string),
            oldType: "nvarchar(32)",
            oldMaxLength: 32,
            oldNullable: true);

        migrationBuilder.CreateIndex(
            name: "IX_Assignments_ReferenceNumber",
            table: "Assignments",
            column: "ReferenceNumber",
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(name: "IX_Assignments_ReferenceNumber", table: "Assignments");
        migrationBuilder.DropColumn(name: "ReferenceNumber", table: "Assignments");
    }
}
