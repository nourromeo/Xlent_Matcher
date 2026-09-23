using XlentMatch.Api.Models;

namespace XlentMatch.Api.Data;

public static class SkillCatalogSeed
{
    public static readonly IReadOnlyList<(string Name, string Category, string[] Aliases)> Items =
    [
        ("Go", "Language", ["Golang", "Go lang"]),
        ("Rust", "Language", []),
        ("Python", "Language", []),
        ("C#", "Language", ["C Sharp", "CSharp"]),
        ("TypeScript", "Language", ["TS"]),
        ("CSS", "Frontend", []),

        (".NET", "Framework", ["dotnet", ".NET Core", "DotNet"]),
        ("ASP.NET Core", "Framework", ["ASP Net Core", "ASP.NET", "ASP.NET Core Web API"]),
        ("React", "Frontend", ["React.js", "ReactJS"]),
        ("FastAPI", "Framework", []),
        ("PyTorch", "AI/ML", ["torch"]),
        ("NLP", "AI/ML", ["Natural Language Processing"]),

        ("PostgreSQL", "Database", ["Postgres", "pg"]),
        ("SQL Server", "Database", ["MSSQL", "Microsoft SQL Server"]),
        ("Azure SQL", "Database", ["Azure SQL Database"]),

        ("Azure", "Cloud", ["Microsoft Azure"]),
        ("Azure ML", "AI/ML", ["Azure Machine Learning"]),
        ("Kubernetes", "Infrastructure", ["k8s", "K8S"]),
        ("Terraform", "Infrastructure", []),
        ("Docker", "Infrastructure", []),
        ("Prometheus", "Observability", []),
        ("Kafka", "Messaging", ["Apache Kafka"]),

        ("gRPC", "API/Protocol", ["grpc"]),
        ("MLflow", "AI/ML", []),
        ("Figma", "Design", []),
        ("Storybook", "Frontend", [])
    ];
}
