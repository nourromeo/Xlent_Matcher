using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using XlentMatch.Api.Data;
using XlentMatch.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.Configure<OpenAiOptions>(builder.Configuration.GetSection("OpenAi"));
builder.Services.Configure<MatchingOptions>(builder.Configuration.GetSection("Matching"));

builder.Services.AddHttpClient<IAiTextService, OpenAiTextService>(client =>
    client.Timeout = TimeSpan.FromMinutes(3));

builder.Services.AddSingleton<IPdfTextExtractor, PdfTextExtractor>();
builder.Services.AddScoped<MatchingService>();
builder.Services.AddScoped<SkillNormalizationService>();

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();

    // Transitional schema bridge for the current LocalDB.
    // This will be removed when the project moves fully to EF Core migrations.
    await db.Database.ExecuteSqlRawAsync("""
        IF OBJECT_ID(N'[CvUploads]', N'U') IS NULL
        BEGIN
            CREATE TABLE [CvUploads] (
                [Id] int NOT NULL IDENTITY,
                [FileName] nvarchar(512) NOT NULL,
                [FileSize] bigint NOT NULL,
                [Status] nvarchar(50) NOT NULL,
                [UploadedAt] datetime2 NOT NULL,
                [ErrorMessage] nvarchar(max) NULL,
                [ConsultantId] int NULL,
                [DraftJson] nvarchar(max) NULL,
                CONSTRAINT [PK_CvUploads] PRIMARY KEY ([Id]),
                CONSTRAINT [FK_CvUploads_Consultants_ConsultantId]
                    FOREIGN KEY ([ConsultantId]) REFERENCES [Consultants] ([Id]) ON DELETE SET NULL
            );

            CREATE INDEX [IX_CvUploads_ConsultantId] ON [CvUploads] ([ConsultantId]);
        END

        IF OBJECT_ID(N'[Skills]', N'U') IS NULL
        BEGIN
            CREATE TABLE [Skills] (
                [Id] int NOT NULL IDENTITY,
                [CanonicalName] nvarchar(256) NOT NULL,
                [NormalizedName] nvarchar(256) NOT NULL,
                [Category] nvarchar(128) NOT NULL,
                CONSTRAINT [PK_Skills] PRIMARY KEY ([Id])
            );

            CREATE UNIQUE INDEX [IX_Skills_NormalizedName] ON [Skills] ([NormalizedName]);
        END

        IF OBJECT_ID(N'[SkillAliases]', N'U') IS NULL
        BEGIN
            CREATE TABLE [SkillAliases] (
                [Id] int NOT NULL IDENTITY,
                [SkillId] int NOT NULL,
                [Alias] nvarchar(256) NOT NULL,
                [NormalizedAlias] nvarchar(256) NOT NULL,
                CONSTRAINT [PK_SkillAliases] PRIMARY KEY ([Id]),
                CONSTRAINT [FK_SkillAliases_Skills_SkillId]
                    FOREIGN KEY ([SkillId]) REFERENCES [Skills] ([Id]) ON DELETE CASCADE
            );

            CREATE UNIQUE INDEX [IX_SkillAliases_NormalizedAlias] ON [SkillAliases] ([NormalizedAlias]);
            CREATE INDEX [IX_SkillAliases_SkillId] ON [SkillAliases] ([SkillId]);
        END

        IF COL_LENGTH('ConsultantSkills', 'SkillId') IS NULL
            ALTER TABLE [ConsultantSkills] ADD [SkillId] int NULL;

        IF COL_LENGTH('AssignmentRequirements', 'SkillId') IS NULL
            ALTER TABLE [AssignmentRequirements] ADD [SkillId] int NULL;

        IF NOT EXISTS (
            SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_ConsultantSkills_Skills_SkillId'
        )
            ALTER TABLE [ConsultantSkills]
            ADD CONSTRAINT [FK_ConsultantSkills_Skills_SkillId]
            FOREIGN KEY ([SkillId]) REFERENCES [Skills] ([Id]);

        IF NOT EXISTS (
            SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_AssignmentRequirements_Skills_SkillId'
        )
            ALTER TABLE [AssignmentRequirements]
            ADD CONSTRAINT [FK_AssignmentRequirements_Skills_SkillId]
            FOREIGN KEY ([SkillId]) REFERENCES [Skills] ([Id]);

        IF NOT EXISTS (
            SELECT 1 FROM sys.indexes
            WHERE name = 'IX_ConsultantSkills_ConsultantId_SkillId'
              AND object_id = OBJECT_ID('ConsultantSkills')
        )
            CREATE INDEX [IX_ConsultantSkills_ConsultantId_SkillId]
            ON [ConsultantSkills] ([ConsultantId], [SkillId]);

        IF NOT EXISTS (
            SELECT 1 FROM sys.indexes
            WHERE name = 'IX_AssignmentRequirements_AssignmentId_SkillId'
              AND object_id = OBJECT_ID('AssignmentRequirements')
        )
            CREATE INDEX [IX_AssignmentRequirements_AssignmentId_SkillId]
            ON [AssignmentRequirements] ([AssignmentId], [SkillId]);
        """);

    await SeedData.InitializeAsync(db);

    var skillNormalization = scope.ServiceProvider.GetRequiredService<SkillNormalizationService>();
    await skillNormalization.EnsureCatalogAsync();
    await skillNormalization.NormalizeExistingDataAsync();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.MapControllers();
app.Run();
