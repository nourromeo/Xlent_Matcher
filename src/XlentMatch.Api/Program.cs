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
        """);

    await SeedData.InitializeAsync(db);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.MapControllers();
app.Run();
