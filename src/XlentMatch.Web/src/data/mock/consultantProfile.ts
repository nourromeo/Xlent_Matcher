export const PROFILE = {
  id: "1", initials: "AK", name: "Anna Kovacs", role: "Senior Backend Consultant", office: "XLENT Stockholm", headline: "Backend architecture and distributed systems",
  totalYearsExperience: 8, seniority: "Senior", availability: "Immediate",
  skills: [
    { name: "Go", category: "Language", yearsUsed: 5, level: "Expert", evidence: "Led rewrite of order-processing microservices in Go at Zalando (2021–2023)." },
    { name: "Rust", category: "Language", yearsUsed: 2, level: "Proficient", evidence: "Built low-latency serialization layer for trading system at FinCo (2023–2024)." },
    { name: "PostgreSQL", category: "Database", yearsUsed: 7, level: "Expert", evidence: "Designed sharding strategy for 2TB dataset; tuned indexes at Schibsted (2019–2021)." },
    { name: "Kafka", category: "Messaging", yearsUsed: 4, level: "Proficient", evidence: "Architected event streaming backbone handling 200k msg/s at Zalando." },
    { name: "Kubernetes", category: "Infrastructure", yearsUsed: 4, level: "Proficient", evidence: "Managed production clusters across 3 regions; introduced HPA policies." },
    { name: "gRPC", category: "Protocol", yearsUsed: 3, level: "Proficient", evidence: "Defined service contracts for 12 microservices, generated clients in 3 languages." },
  ],
  experience: [
    { company: "Nordic Financial Services", role: "Payments Platform Modernisation", start: "2023", end: "Present", stack: ["Rust", "PostgreSQL", "Kafka"], achievements: ["Built a low-latency serialization layer reducing P99 from 18ms → 4ms.", "Introduced end-to-end tracing with OpenTelemetry; cut MTTR by 40%."] },
    { company: "European Commerce Group", role: "Order Platform Renewal", start: "2021", end: "2023", stack: ["Go", "Kafka", "Kubernetes", "PostgreSQL"], achievements: ["Led migration of order processing to Go microservices.", "Achieved 99.99% uptime across peak seasonal load."] },
    { company: "Nordic Media Group", role: "Marketplace Data Platform", start: "2019", end: "2021", stack: ["Java", "PostgreSQL", "Redis"], achievements: ["Designed a sharding strategy for a 2TB marketplace dataset.", "Improved search latency by 60% through index tuning."] },
  ],
  education: [{ degree: "M.Sc. Computer Science", school: "TU Berlin", year: "2019" }],
  languages: ["English (C2)", "German (B2)", "Hungarian (Native)"],
  industries: ["Financial Services", "E-commerce", "Media"],
  certifications: ["CKA — Certified Kubernetes Administrator", "Microsoft Azure Fundamentals"],
};
