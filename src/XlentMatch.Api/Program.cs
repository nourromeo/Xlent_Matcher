using System.Diagnostics;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using XlentMatch.Api.Data;
using XlentMatch.Api.Services;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        $"ConnectionStrings:DefaultConnection is required for the {builder.Environment.EnvironmentName} environment. " +
        "Provide it through environment-specific configuration or secret storage.");
}

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString));

builder.Services.Configure<OpenAiOptions>(builder.Configuration.GetSection("OpenAi"));
builder.Services.Configure<MatchingOptions>(builder.Configuration.GetSection("Matching"));

builder.Services.AddHttpClient<IAiTextService, OpenAiTextService>(client =>
    client.Timeout = TimeSpan.FromMinutes(3));

builder.Services.AddSingleton<IPdfTextExtractor, PdfTextExtractor>();
builder.Services.AddSingleton<MatchingWeightsStore>();
builder.Services.AddScoped<MatchingService>();
builder.Services.AddScoped<SkillNormalizationService>();
builder.Services.AddScoped<ConsultantAvailabilityService>();
builder.Services.AddScoped<IPromptService, PromptService>();

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
var startupTimer = Stopwatch.StartNew();
var startupLogger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("StartupPerformance");

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (app.Environment.IsDevelopment())
    {
        var step = Stopwatch.StartNew();
        await db.Database.MigrateAsync();
        startupLogger.LogInformation("Startup database migrations completed in {ElapsedMs} ms", step.ElapsedMilliseconds);
    }

    var skillNormalization = scope.ServiceProvider.GetRequiredService<SkillNormalizationService>();
    var stepTimer = Stopwatch.StartNew();
    await skillNormalization.EnsureCatalogAsync();
    startupLogger.LogInformation("Startup skill catalog completed in {ElapsedMs} ms", stepTimer.ElapsedMilliseconds);

    stepTimer.Restart();
    await SeedData.InitializeAsync(db);
    startupLogger.LogInformation("Startup seed data completed in {ElapsedMs} ms", stepTimer.ElapsedMilliseconds);

    stepTimer.Restart();
    await PromptSeedData.InitializeAsync(db);
    startupLogger.LogInformation("Startup prompt seed completed in {ElapsedMs} ms", stepTimer.ElapsedMilliseconds);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Return a safe, consistent response when SQL Server is unavailable.
// Never include connection strings, SQL commands, or CV data in the response.
app.Use(async (context, next) =>
{
    try
    {
        await next(context);
    }
    catch (Exception ex) when (ex is SqlException or DbUpdateException)
    {
        var logger = context.RequestServices.GetRequiredService<ILoggerFactory>()
            .CreateLogger("DatabaseFailure");
        logger.LogError(ex, "Database request failed. Path={Path}", context.Request.Path);
        if (context.Response.HasStarted) throw;
        context.Response.Clear();
        context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
        await context.Response.WriteAsJsonAsync(new
        {
            title = "Database temporarily unavailable",
            status = 503,
            detail = "The database request could not be completed. Please try again later."
        });
    }
});
app.UseCors();
app.MapControllers();
startupLogger.LogInformation("Startup initialization completed in {ElapsedMs} ms", startupTimer.ElapsedMilliseconds);
app.Run();
