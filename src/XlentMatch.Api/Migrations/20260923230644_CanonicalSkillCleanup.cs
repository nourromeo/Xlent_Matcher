using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace XlentMatch.Api.Migrations
{
    /// <inheritdoc />
    public partial class CanonicalSkillCleanup : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF EXISTS (SELECT 1 FROM [ConsultantSkills] WHERE [SkillId] IS NULL)
                    THROW 51000, 'Cannot make ConsultantSkills.SkillId required because some rows still have NULL SkillId.', 1;

                IF EXISTS (SELECT 1 FROM [AssignmentRequirements] WHERE [SkillId] IS NULL)
                    THROW 51001, 'Cannot make AssignmentRequirements.SkillId required because some rows still have NULL SkillId.', 1;
                """);

            migrationBuilder.Sql("""
                IF EXISTS (
                    SELECT 1 FROM sys.foreign_keys
                    WHERE name = 'FK_ConsultantSkills_Skills_SkillId'
                      AND parent_object_id = OBJECT_ID(N'[ConsultantSkills]')
                )
                    ALTER TABLE [ConsultantSkills]
                    DROP CONSTRAINT [FK_ConsultantSkills_Skills_SkillId];

                IF EXISTS (
                    SELECT 1 FROM sys.foreign_keys
                    WHERE name = 'FK_AssignmentRequirements_Skills_SkillId'
                      AND parent_object_id = OBJECT_ID(N'[AssignmentRequirements]')
                )
                    ALTER TABLE [AssignmentRequirements]
                    DROP CONSTRAINT [FK_AssignmentRequirements_Skills_SkillId];

                IF EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = 'IX_ConsultantSkills_SkillId'
                      AND object_id = OBJECT_ID(N'[ConsultantSkills]')
                )
                    DROP INDEX [IX_ConsultantSkills_SkillId] ON [ConsultantSkills];

                IF EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = 'IX_ConsultantSkills_ConsultantId_SkillId'
                      AND object_id = OBJECT_ID(N'[ConsultantSkills]')
                )
                    DROP INDEX [IX_ConsultantSkills_ConsultantId_SkillId] ON [ConsultantSkills];

                IF EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = 'IX_AssignmentRequirements_SkillId'
                      AND object_id = OBJECT_ID(N'[AssignmentRequirements]')
                )
                    DROP INDEX [IX_AssignmentRequirements_SkillId] ON [AssignmentRequirements];

                IF EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = 'IX_AssignmentRequirements_AssignmentId_SkillId'
                      AND object_id = OBJECT_ID(N'[AssignmentRequirements]')
                )
                    DROP INDEX [IX_AssignmentRequirements_AssignmentId_SkillId] ON [AssignmentRequirements];
                """);

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

            migrationBuilder.DropColumn(
                name: "Category",
                table: "ConsultantSkills");

            migrationBuilder.DropColumn(
                name: "Name",
                table: "ConsultantSkills");

            migrationBuilder.DropColumn(
                name: "Name",
                table: "AssignmentRequirements");

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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF EXISTS (
                    SELECT 1 FROM sys.foreign_keys
                    WHERE name = 'FK_ConsultantSkills_Skills_SkillId'
                      AND parent_object_id = OBJECT_ID(N'[ConsultantSkills]')
                )
                    ALTER TABLE [ConsultantSkills]
                    DROP CONSTRAINT [FK_ConsultantSkills_Skills_SkillId];

                IF EXISTS (
                    SELECT 1 FROM sys.foreign_keys
                    WHERE name = 'FK_AssignmentRequirements_Skills_SkillId'
                      AND parent_object_id = OBJECT_ID(N'[AssignmentRequirements]')
                )
                    ALTER TABLE [AssignmentRequirements]
                    DROP CONSTRAINT [FK_AssignmentRequirements_Skills_SkillId];

                IF EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = 'IX_ConsultantSkills_SkillId'
                      AND object_id = OBJECT_ID(N'[ConsultantSkills]')
                )
                    DROP INDEX [IX_ConsultantSkills_SkillId] ON [ConsultantSkills];

                IF EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = 'IX_ConsultantSkills_ConsultantId_SkillId'
                      AND object_id = OBJECT_ID(N'[ConsultantSkills]')
                )
                    DROP INDEX [IX_ConsultantSkills_ConsultantId_SkillId] ON [ConsultantSkills];

                IF EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = 'IX_AssignmentRequirements_SkillId'
                      AND object_id = OBJECT_ID(N'[AssignmentRequirements]')
                )
                    DROP INDEX [IX_AssignmentRequirements_SkillId] ON [AssignmentRequirements];

                IF EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = 'IX_AssignmentRequirements_AssignmentId_SkillId'
                      AND object_id = OBJECT_ID(N'[AssignmentRequirements]')
                )
                    DROP INDEX [IX_AssignmentRequirements_AssignmentId_SkillId] ON [AssignmentRequirements];
                """);

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

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "ConsultantSkills",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Name",
                table: "ConsultantSkills",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Name",
                table: "AssignmentRequirements",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

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
}
