using Microsoft.EntityFrameworkCore;
using XlentMatch.Api.Models;

namespace XlentMatch.Api.Data;

public static class SeedData
{
    public static async Task InitializeAsync(AppDbContext db, CancellationToken ct = default)
    {
        if (!await db.Consultants.AnyAsync(ct))
        {
            var consultants = new List<Consultant>
            {
            new()
            {
                FirstName = "Anna",
                LastName = "Kovacs",
                Email = "anna.kovacs@example.com",
                Title = "Senior Backend Consultant",
                Summary = "Backend architecture and distributed systems.",
                Seniority = "Senior",
                YearsOfExperience = 8,
                Availability = "Immediate",
                Office = "XLENT Stockholm",
                Skills =
                [
                    new() { Name = "Go", Category = "Language", Years = 5, Level = 5, Evidence = "Led backend services implemented in Go." },
                    new() { Name = "Rust", Category = "Language", Years = 2, Level = 4, Evidence = "Built performance-critical backend components." },
                    new() { Name = "PostgreSQL", Category = "Database", Years = 7, Level = 5, Evidence = "Designed and tuned production PostgreSQL solutions." },
                    new() { Name = "Kafka", Category = "Messaging", Years = 4, Level = 4, Evidence = "Worked with event-driven architectures using Kafka." },
                    new() { Name = "Kubernetes", Category = "Infrastructure", Years = 4, Level = 4, Evidence = "Deployed and operated containerized services." }
                ],
                Experiences =
                [
                    new() { Company = "Nordic Financial Services", Role = "Backend Consultant", Description = "Modernised payment services and event-driven backend components.", StartDate = new DateOnly(2023, 1, 1) },
                    new() { Company = "European Commerce Group", Role = "Backend Consultant", Description = "Migrated order processing to distributed services.", StartDate = new DateOnly(2021, 1, 1), EndDate = new DateOnly(2022, 12, 31) }
                ],
                Projects =
                [
                    new() { Name = "Payments Platform Modernisation", Description = "Modernisation of a payment platform.", Technologies = "Rust, PostgreSQL, Kafka" },
                    new() { Name = "Order Platform Renewal", Description = "Backend renewal for an order platform.", Technologies = "Go, Kafka, Kubernetes, PostgreSQL" }
                ],
                Education =
                [
                    new() { Degree = "M.Sc. Computer Science", School = "TU Berlin", Year = "2019" }
                ],
                Languages =
                [
                    new() { Name = "English", Level = "C2" },
                    new() { Name = "German", Level = "B2" }
                ],
                Industries =
                [
                    new() { Name = "Financial Services" },
                    new() { Name = "E-commerce" }
                ],
                Certifications =
                [
                    new() { Name = "Certified Kubernetes Administrator", Issuer = "CNCF" }
                ]
            },
            new()
            {
                FirstName = "Marcus",
                LastName = "Lee",
                Email = "marcus.lee@example.com",
                Title = "AI Consultant",
                Summary = "Machine learning, NLP and API development.",
                Seniority = "Mid",
                YearsOfExperience = 5,
                Availability = "2 weeks",
                Office = "XLENT Stockholm",
                Skills =
                [
                    new() { Name = "Python", Category = "Language", Years = 5, Level = 5, Evidence = "Used Python in production ML solutions." },
                    new() { Name = "PyTorch", Category = "AI/ML", Years = 4, Level = 4, Evidence = "Built and evaluated ML models with PyTorch." },
                    new() { Name = "NLP", Category = "AI/ML", Years = 4, Level = 4, Evidence = "Worked on NLP classification and extraction." },
                    new() { Name = "FastAPI", Category = "Backend", Years = 3, Level = 4, Evidence = "Built APIs for model inference services." },
                    new() { Name = "Azure ML", Category = "Cloud", Years = 2, Level = 3, Evidence = "Deployed experiments and models in Azure ML." }
                ],
                Experiences =
                [
                    new() { Company = "Nordic Analytics", Role = "AI Consultant", Description = "Developed NLP and ML services for internal products.", StartDate = new DateOnly(2022, 1, 1) }
                ],
                Projects =
                [
                    new() { Name = "Document Classification Service", Description = "NLP service for document classification.", Technologies = "Python, PyTorch, FastAPI, Azure ML" }
                ],
                Industries =
                [
                    new() { Name = "Technology" },
                    new() { Name = "Public Sector" }
                ]
            },
            new()
            {
                FirstName = "Priya",
                LastName = "Sharma",
                Email = "priya.sharma@example.com",
                Title = "Platform Consultant",
                Summary = "Cloud platform engineering, infrastructure and observability.",
                Seniority = "Staff",
                YearsOfExperience = 11,
                Availability = "1 month",
                Office = "XLENT Stockholm",
                Skills =
                [
                    new() { Name = "Terraform", Category = "Infrastructure", Years = 6, Level = 5, Evidence = "Built reusable infrastructure modules." },
                    new() { Name = "Kubernetes", Category = "Infrastructure", Years = 7, Level = 5, Evidence = "Designed and operated Kubernetes platforms." },
                    new() { Name = "Prometheus", Category = "Observability", Years = 5, Level = 5, Evidence = "Implemented monitoring and alerting." },
                    new() { Name = "Go", Category = "Language", Years = 4, Level = 4, Evidence = "Built platform tooling in Go." },
                    new() { Name = "Python", Category = "Language", Years = 8, Level = 4, Evidence = "Used Python for platform automation." }
                ],
                Experiences =
                [
                    new() { Company = "Nordic Cloud Services", Role = "Platform Lead", Description = "Led platform engineering and observability initiatives.", StartDate = new DateOnly(2020, 1, 1) }
                ],
                Projects =
                [
                    new() { Name = "Internal Developer Platform", Description = "Standardized cloud platform for product teams.", Technologies = "Terraform, Kubernetes, Prometheus, Go" }
                ],
                Industries =
                [
                    new() { Name = "Cloud Services" },
                    new() { Name = "Telecom" }
                ]
            },
            new()
            {
                FirstName = "Tobias",
                LastName = "Renz",
                Email = "tobias.renz@example.com",
                Title = "Full-Stack Consultant",
                Summary = ".NET, React and Azure development.",
                Seniority = "Mid",
                YearsOfExperience = 6,
                Availability = "Immediate",
                Office = "XLENT Stockholm",
                Skills =
                [
                    new() { Name = "C#", Category = "Language", Years = 6, Level = 5, Evidence = "Developed business applications in C#." },
                    new() { Name = ".NET", Category = "Backend", Years = 6, Level = 5, Evidence = "Built ASP.NET Core APIs and services." },
                    new() { Name = "React", Category = "Frontend", Years = 4, Level = 4, Evidence = "Built React user interfaces." },
                    new() { Name = "TypeScript", Category = "Frontend", Years = 4, Level = 4, Evidence = "Used TypeScript in production frontend applications." },
                    new() { Name = "Azure", Category = "Cloud", Years = 4, Level = 4, Evidence = "Deployed and operated applications in Azure." }
                ],
                Experiences =
                [
                    new() { Company = "Swedish Industry Group", Role = "Full-Stack Consultant", Description = "Built internal web applications and APIs.", StartDate = new DateOnly(2021, 1, 1) }
                ],
                Projects =
                [
                    new() { Name = "Operations Portal", Description = "Internal operations portal.", Technologies = "C#, .NET, React, TypeScript, Azure" }
                ],
                Industries =
                [
                    new() { Name = "Industry" }
                ],
                Certifications =
                [
                    new() { Name = "Azure Developer Associate", Issuer = "Microsoft" }
                ]
            },
            new()
            {
                FirstName = "Sofia",
                LastName = "Yun",
                Email = "sofia.yun@example.com",
                Title = "Frontend Consultant",
                Summary = "React applications and design systems.",
                Seniority = "Mid",
                YearsOfExperience = 4,
                Availability = "3 months",
                Office = "XLENT Stockholm",
                Skills =
                [
                    new() { Name = "React", Category = "Frontend", Years = 4, Level = 5, Evidence = "Built and maintained React applications." },
                    new() { Name = "TypeScript", Category = "Frontend", Years = 4, Level = 5, Evidence = "Used TypeScript across frontend projects." },
                    new() { Name = "CSS", Category = "Frontend", Years = 4, Level = 4, Evidence = "Implemented responsive and accessible interfaces." },
                    new() { Name = "Figma", Category = "Design", Years = 3, Level = 4, Evidence = "Collaborated with designers using Figma." },
                    new() { Name = "Storybook", Category = "Frontend", Years = 3, Level = 4, Evidence = "Maintained reusable component libraries." }
                ],
                Experiences =
                [
                    new() { Company = "Digital Product Studio", Role = "Frontend Consultant", Description = "Developed frontend products and reusable UI components.", StartDate = new DateOnly(2022, 1, 1) }
                ],
                Projects =
                [
                    new() { Name = "Design System Delivery", Description = "Reusable component library and frontend standards.", Technologies = "React, TypeScript, CSS, Figma, Storybook" }
                ],
                Industries =
                [
                    new() { Name = "Digital Products" }
                ]
            }
        };

            db.Consultants.AddRange(consultants);
            await db.SaveChangesAsync(ct);
        }

        if (!await db.Assignments.AnyAsync(ct))
        {
            var assignments = new List<Assignment>
            {
                new()
                {
                    CustomerName = "Nordic Financial Services",
                    Title = "Payments Platform Modernisation",
                    Description = "Modernise an event-driven payments platform and strengthen its production reliability.",
                    Seniority = "Senior",
                    MinYearsExperience = 6,
                    Availability = "Immediate",
                    Status = AssignmentStatus.Matching,
                    CreatedAt = DateTime.UtcNow.AddDays(-3),
                    Requirements =
                    [
                        new() { Name = "Go", Type = RequirementType.Mandatory, MinYears = 3 },
                        new() { Name = "PostgreSQL", Type = RequirementType.Mandatory, MinYears = 4 },
                        new() { Name = "Kafka", Type = RequirementType.Mandatory, MinYears = 3 },
                        new() { Name = "Kubernetes", Type = RequirementType.Mandatory, MinYears = 3 },
                        new() { Name = "Rust", Type = RequirementType.Desired },
                        new() { Name = "gRPC", Type = RequirementType.Desired }
                    ]
                },
                new()
                {
                    CustomerName = "Industrial Analytics Group",
                    Title = "Applied AI Enablement",
                    Description = "Build and operationalise language-model services for internal knowledge workflows.",
                    Seniority = "Mid",
                    MinYearsExperience = 4,
                    Availability = "2 weeks",
                    Status = AssignmentStatus.Done,
                    CreatedAt = DateTime.UtcNow.AddDays(-5),
                    Requirements =
                    [
                        new() { Name = "Python", Type = RequirementType.Mandatory, MinYears = 4 },
                        new() { Name = "PyTorch", Type = RequirementType.Mandatory, MinYears = 3 },
                        new() { Name = "NLP", Type = RequirementType.Mandatory, MinYears = 3 },
                        new() { Name = "Azure ML", Type = RequirementType.Mandatory, MinYears = 2 },
                        new() { Name = "FastAPI", Type = RequirementType.Desired },
                        new() { Name = "MLflow", Type = RequirementType.Desired }
                    ]
                },
                new()
                {
                    CustomerName = "Public Services Organisation",
                    Title = "Cloud Reliability Programme",
                    Description = "Improve platform reliability, observability, and infrastructure automation across Azure workloads.",
                    Seniority = "Staff",
                    MinYearsExperience = 8,
                    Availability = "To be agreed",
                    Status = AssignmentStatus.Draft,
                    CreatedAt = DateTime.UtcNow.AddDays(-2),
                    Requirements =
                    [
                        new() { Name = "Kubernetes", Type = RequirementType.Mandatory, MinYears = 5 },
                        new() { Name = "Terraform", Type = RequirementType.Mandatory, MinYears = 4 },
                        new() { Name = "Prometheus", Type = RequirementType.Mandatory, MinYears = 3 },
                        new() { Name = "Go", Type = RequirementType.Desired },
                        new() { Name = "Datadog", Type = RequirementType.Desired }
                    ]
                }
            };

            db.Assignments.AddRange(assignments);
            await db.SaveChangesAsync(ct);
        }
    }
}
