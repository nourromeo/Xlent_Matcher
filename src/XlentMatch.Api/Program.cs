using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using XlentMatch.Api.Application;
using XlentMatch.Api.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// Database
builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Options
builder.Services.Configure<OpenAiOptions>(builder.Configuration.GetSection("OpenAi"));
builder.Services.Configure<MatchingOptions>(builder.Configuration.GetSection("Matching"));

// Services
builder.Services.AddHttpClient<IAiTextService, OpenAiTextService>(c => c.Timeout = TimeSpan.FromMinutes(3));
builder.Services.AddSingleton<IPdfTextExtractor, PdfTextExtractor>();
builder.Services.AddScoped<MatchingService>();

// API
builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

// Create the database on startup (development). Switch to migrations later if needed.
using (var scope = app.Services.CreateScope())
    scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.EnsureCreated();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.MapControllers();
app.Run();
