using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using XlentMatch.Api.Data;

#nullable disable

namespace XlentMatch.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260924002000_CanonicalSkillCleanup")]
public class CanonicalSkillCleanup : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            IF EXISTS (SELECT 1 FROM [ConsultantSkills] WHERE [SkillId] IS NULL)
                THROW 51000, 'Cannot remove legacy ConsultantSkill columns because some rows do not have SkillId.', 1;

            IF EXISTS (SELECT 1 FROM [AssignmentRequirements] WHERE [SkillId] IS NULL)
                THROW 51001, 'Cannot remove legacy AssignmentRequirement Name because some rows do not have SkillId.', 1;
            """);

        // SQL Server does not allow changing SkillId nullability while indexes/FKs
        // are using the column. Drop the dependent objects, alter the column,
        // then recreate the canonical schema objects.
        migrationBuilder.DropForeignKey(
            name: "FK_ConsultantSkills_Skills_SkillId",
            table: "ConsultantSkills");

        migrationBuilder.DropForeignKey(
            name: "FK_AssignmentRequirements_Skills_SkillId",
            table: "AssignmentRequirements");

        migrationBuilder.DropIndex(
            name: "IX_ConsultantSkills_SkillId",
            table: "ConsultantSkills");

        migrationBuilder.DropIndex(
            name: "IX_ConsultantSkills_ConsultantId_SkillId",
            table: "ConsultantSkills");

        migrationBuilder.DropIndex(
            name: "IX_AssignmentRequirements_SkillId",
            table: "AssignmentRequirements");

        migrationBuilder.DropIndex(
            name: "IX_AssignmentRequirements_AssignmentId_SkillId",
            table: "AssignmentRequirements");

        migrationBuilder.AlterColumn<int>(
            name: "SkillId",
            table: "ConsultantSkills",
            type: "int",
            nullable: false,
            oldClrType: typeof(int),
            oldType: "int",
            oldNullable: true);

        migrationBuilder.AlterColumn<int>(
            name: "SkillId",
            table: "AssignmentRequirements",
            type: "int",
            nullable: false,
            oldClrType: typeof(int),
            oldType: "int",
            oldNullable: true);

        migrationBuilder.DropColumn(name: "Name", table: "ConsultantSkills");
        migrationBuilder.DropColumn(name: "Category", table: "ConsultantSkills");
        migrationBuilder.DropColumn(name: "Name", table: "AssignmentRequirements");

        migrationBuilder.CreateIndex(
            name: "IX_ConsultantSkills_SkillId",
            table: "ConsultantSkills",
            column: "SkillId");

        migrationBuilder.CreateIndex(
            name: "IX_ConsultantSkills_ConsultantId_SkillId",
            table: "ConsultantSkills",
            columns: new[] { "ConsultantId", "SkillId" });

        migrationBuilder.CreateIndex(
            name: "IX_AssignmentRequirements_SkillId",
            table: "AssignmentRequirements",
            column: "SkillId");

        migrationBuilder.CreateIndex(
            name: "IX_AssignmentRequirements_AssignmentId_SkillId",
            table: "AssignmentRequirements",
            columns: new[] { "AssignmentId", "SkillId" });

        migrationBuilder.AddForeignKey(
            name: "FK_ConsultantSkills_Skills_SkillId",
            table: "ConsultantSkills",
            column: "SkillId",
            principalTable: "Skills",
            principalColumn: "Id",
            onDelete: ReferentialAction.Restrict);

        migrationBuilder.AddForeignKey(
            name: "FK_AssignmentRequirements_Skills_SkillId",
            table: "AssignmentRequirements",
            column: "SkillId",
            principalTable: "Skills",
            principalColumn: "Id",
            onDelete: ReferentialAction.Restrict);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(
            name: "FK_ConsultantSkills_Skills_SkillId",
            table: "ConsultantSkills");

        migrationBuilder.DropForeignKey(
            name: "FK_AssignmentRequirements_Skills_SkillId",
            table: "AssignmentRequirements");

        migrationBuilder.DropIndex(
            name: "IX_ConsultantSkills_SkillId",
            table: "ConsultantSkills");

        migrationBuilder.DropIndex(
            name: "IX_ConsultantSkills_ConsultantId_SkillId",
            table: "ConsultantSkills");

        migrationBuilder.DropIndex(
            name: "IX_AssignmentRequirements_SkillId",
            table: "AssignmentRequirements");

        migrationBuilder.DropIndex(
            name: "IX_AssignmentRequirements_AssignmentId_SkillId",
            table: "AssignmentRequirements");

        migrationBuilder.AddColumn<string>(
            name: "Name",
            table: "ConsultantSkills",
            type: "nvarchar(max)",
            nullable: false,
            defaultValue: "");

        migrationBuilder.AddColumn<string>(
            name: "Category",
            table: "ConsultantSkills",
            type: "nvarchar(max)",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "Name",
            table: "AssignmentRequirements",
            type: "nvarchar(max)",
            nullable: false,
            defaultValue: "");

        migrationBuilder.AlterColumn<int>(
            name: "SkillId",
            table: "ConsultantSkills",
            type: "int",
            nullable: true,
            oldClrType: typeof(int),
            oldType: "int");

        migrationBuilder.AlterColumn<int>(
            name: "SkillId",
            table: "AssignmentRequirements",
            type: "int",
            nullable: true,
            oldClrType: typeof(int),
            oldType: "int");

        migrationBuilder.CreateIndex(
            name: "IX_ConsultantSkills_SkillId",
            table: "ConsultantSkills",
            column: "SkillId");

        migrationBuilder.CreateIndex(
            name: "IX_ConsultantSkills_ConsultantId_SkillId",
            table: "ConsultantSkills",
            columns: new[] { "ConsultantId", "SkillId" });

        migrationBuilder.CreateIndex(
            name: "IX_AssignmentRequirements_SkillId",
            table: "AssignmentRequirements",
            column: "SkillId");

        migrationBuilder.CreateIndex(
            name: "IX_AssignmentRequirements_AssignmentId_SkillId",
            table: "AssignmentRequirements",
            columns: new[] { "AssignmentId", "SkillId" });

        migrationBuilder.AddForeignKey(
            name: "FK_ConsultantSkills_Skills_SkillId",
            table: "ConsultantSkills",
            column: "SkillId",
            principalTable: "Skills",
            principalColumn: "Id",
            onDelete: ReferentialAction.Restrict);

        migrationBuilder.AddForeignKey(
            name: "FK_AssignmentRequirements_Skills_SkillId",
            table: "AssignmentRequirements",
            column: "SkillId",
            principalTable: "Skills",
            principalColumn: "Id",
            onDelete: ReferentialAction.Restrict);
    }
}
