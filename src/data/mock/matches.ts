import type { Match } from "../../types";

export const MATCHES: Match[] = [
  {
    id: "a1-m1", assignmentId: "a1", consultantId: "1", initials: "AK", name: "Anna Kovacs",
    headline: "Senior Backend Consultant · 8 yrs", score: 91,
    breakdown: { mustHave: 96, semantic: 88, experience: 92, seniority: 90, niceToHave: 70, availability: 100 },
    mustHaveCoverage: ["Go", "PostgreSQL", "Kafka", "Kubernetes"], gaps: [], niceToHave: ["Rust", "gRPC"],
    evidence: [
      { skill: "Go", cite: "Led the renewal of order-processing microservices in Go for a European commerce client." },
      { skill: "Kafka", cite: "Architected an event-streaming backbone for high-volume transactional workloads." },
      { skill: "Kubernetes", cite: "Managed production clusters across multiple regions and introduced autoscaling policies." }
    ],
    motivation: "Strong match. The consultant covers all required skills with senior-level evidence and has directly relevant event-driven backend experience."
  },
  {
    id: "a1-m2", assignmentId: "a1", consultantId: "3", initials: "PS", name: "Priya Sharma",
    headline: "Platform Consultant · 11 yrs", score: 82,
    breakdown: { mustHave: 78, semantic: 84, experience: 92, seniority: 95, niceToHave: 55, availability: 60 },
    mustHaveCoverage: ["Go", "PostgreSQL", "Kubernetes"], gaps: ["Kafka"], niceToHave: [],
    evidence: [{ skill: "Kubernetes", cite: "Managed production Kubernetes platforms and infrastructure automation for enterprise workloads." }],
    motivation: "Good platform match with strong seniority and Kubernetes evidence. Kafka is the main missing requirement."
  },
  {
    id: "a1-m3", assignmentId: "a1", consultantId: "4", initials: "TR", name: "Tobias Renz",
    headline: "Full-Stack Consultant · 6 yrs", score: 69,
    breakdown: { mustHave: 58, semantic: 72, experience: 70, seniority: 68, niceToHave: 40, availability: 100 },
    mustHaveCoverage: ["PostgreSQL", "Kubernetes"], gaps: ["Go", "Kafka"], niceToHave: [],
    evidence: [{ skill: "Kubernetes", cite: "Deployed containerised .NET services to Azure Kubernetes environments." }],
    motivation: "Available immediately and has relevant cloud delivery experience, but lacks evidence for Go and Kafka."
  },
  {
    id: "a1-m4", assignmentId: "a1", consultantId: "6", initials: "RO", name: "Ravi Okonkwo",
    headline: "Data Consultant · 7 yrs", score: 63,
    breakdown: { mustHave: 52, semantic: 66, experience: 78, seniority: 82, niceToHave: 35, availability: 100 },
    mustHaveCoverage: ["PostgreSQL", "Kafka"], gaps: ["Go", "Kubernetes"], niceToHave: [],
    evidence: [{ skill: "Kafka", cite: "Built streaming data pipelines integrating Kafka with analytics workloads." }],
    motivation: "Strong data background and Kafka exposure, but the assignment needs more backend and Kubernetes evidence."
  },
  {
    id: "a1-m5", assignmentId: "a1", consultantId: "7", initials: "FM", name: "Fatima Martinez",
    headline: "Cloud Consultant · 2 yrs", score: 54,
    breakdown: { mustHave: 42, semantic: 56, experience: 40, seniority: 35, niceToHave: 30, availability: 90 },
    mustHaveCoverage: ["Kubernetes"], gaps: ["Go", "PostgreSQL", "Kafka"], niceToHave: [],
    evidence: [{ skill: "Kubernetes", cite: "Supported container deployment workflows and cloud infrastructure automation." }],
    motivation: "Some relevant cloud exposure, but the current profile is below the assignment's required backend depth and seniority."
  },

  {
    id: "a2-m1", assignmentId: "a2", consultantId: "2", initials: "ML", name: "Marcus Lee",
    headline: "AI Consultant · 5 yrs", score: 94,
    breakdown: { mustHave: 98, semantic: 95, experience: 88, seniority: 90, niceToHave: 85, availability: 90 },
    mustHaveCoverage: ["Python", "PyTorch", "NLP", "Azure ML"], gaps: [], niceToHave: ["FastAPI"],
    evidence: [
      { skill: "PyTorch", cite: "Delivered production NLP services using PyTorch and transformer-based models." },
      { skill: "Azure ML", cite: "Operationalised model training and deployment workflows in Azure ML." }
    ],
    motivation: "Excellent match. The consultant covers the full required AI stack and has directly relevant model operationalisation experience."
  },
  {
    id: "a2-m2", assignmentId: "a2", consultantId: "6", initials: "RO", name: "Ravi Okonkwo",
    headline: "Data Consultant · 7 yrs", score: 78,
    breakdown: { mustHave: 72, semantic: 80, experience: 86, seniority: 84, niceToHave: 65, availability: 100 },
    mustHaveCoverage: ["Python", "Azure ML"], gaps: ["PyTorch", "NLP"], niceToHave: ["MLflow"],
    evidence: [{ skill: "Python", cite: "Built production data and ML pipelines in Python across analytics engagements." }],
    motivation: "Strong data engineering profile with useful ML operations exposure, but weaker evidence in NLP and PyTorch."
  },
  {
    id: "a2-m3", assignmentId: "a2", consultantId: "3", initials: "PS", name: "Priya Sharma",
    headline: "Platform Consultant · 11 yrs", score: 70,
    breakdown: { mustHave: 60, semantic: 68, experience: 92, seniority: 95, niceToHave: 55, availability: 60 },
    mustHaveCoverage: ["Python", "Azure ML"], gaps: ["PyTorch", "NLP"], niceToHave: [],
    evidence: [{ skill: "Azure ML", cite: "Supported cloud platforms used for data and machine-learning workloads." }],
    motivation: "Strong platform experience, but the core modelling requirements are not sufficiently covered."
  },
  {
    id: "a2-m4", assignmentId: "a2", consultantId: "7", initials: "FM", name: "Fatima Martinez",
    headline: "Cloud Consultant · 2 yrs", score: 62,
    breakdown: { mustHave: 55, semantic: 64, experience: 45, seniority: 42, niceToHave: 50, availability: 90 },
    mustHaveCoverage: ["Python"], gaps: ["PyTorch", "NLP", "Azure ML"], niceToHave: ["FastAPI"],
    evidence: [{ skill: "Python", cite: "Uses Python for automation and cloud tooling in delivery work." }],
    motivation: "Relevant Python and cloud foundations, but missing most of the assignment's applied AI requirements."
  },
  {
    id: "a2-m5", assignmentId: "a2", consultantId: "4", initials: "TR", name: "Tobias Renz",
    headline: "Full-Stack Consultant · 6 yrs", score: 57,
    breakdown: { mustHave: 45, semantic: 58, experience: 72, seniority: 70, niceToHave: 35, availability: 100 },
    mustHaveCoverage: ["Azure ML"], gaps: ["Python", "PyTorch", "NLP"], niceToHave: [],
    evidence: [{ skill: "Azure ML", cite: "Has Azure delivery experience and familiarity with managed cloud services." }],
    motivation: "Good general Azure delivery profile, but not a strong fit for the assignment's core AI requirements."
  },

  {
    id: "a3-m1", assignmentId: "a3", consultantId: "3", initials: "PS", name: "Priya Sharma",
    headline: "Platform Consultant · 11 yrs", score: 95,
    breakdown: { mustHave: 100, semantic: 94, experience: 96, seniority: 100, niceToHave: 75, availability: 60 },
    mustHaveCoverage: ["Kubernetes", "Terraform", "Prometheus"], gaps: [], niceToHave: ["Go"],
    evidence: [
      { skill: "Terraform", cite: "Implemented infrastructure-as-code standards across multi-environment cloud platforms." },
      { skill: "Prometheus", cite: "Designed observability and alerting for production Kubernetes workloads." }
    ],
    motivation: "Excellent match. The consultant covers every required platform skill and has the seniority expected for the reliability programme."
  },
  {
    id: "a3-m2", assignmentId: "a3", consultantId: "7", initials: "FM", name: "Fatima Martinez",
    headline: "Cloud Consultant · 2 yrs", score: 76,
    breakdown: { mustHave: 72, semantic: 78, experience: 48, seniority: 40, niceToHave: 60, availability: 90 },
    mustHaveCoverage: ["Kubernetes", "Terraform"], gaps: ["Prometheus"], niceToHave: [],
    evidence: [{ skill: "Terraform", cite: "Uses Terraform for repeatable cloud infrastructure provisioning." }],
    motivation: "Relevant cloud foundations and good availability, but limited seniority and no strong Prometheus evidence."
  },
  {
    id: "a3-m3", assignmentId: "a3", consultantId: "1", initials: "AK", name: "Anna Kovacs",
    headline: "Senior Backend Consultant · 8 yrs", score: 74,
    breakdown: { mustHave: 68, semantic: 76, experience: 88, seniority: 90, niceToHave: 70, availability: 100 },
    mustHaveCoverage: ["Kubernetes", "Prometheus"], gaps: ["Terraform"], niceToHave: ["Go"],
    evidence: [{ skill: "Kubernetes", cite: "Managed production Kubernetes clusters supporting distributed backend services." }],
    motivation: "Strong production and Kubernetes background with immediate availability, but Terraform evidence is missing."
  },
  {
    id: "a3-m4", assignmentId: "a3", consultantId: "4", initials: "TR", name: "Tobias Renz",
    headline: "Full-Stack Consultant · 6 yrs", score: 68,
    breakdown: { mustHave: 62, semantic: 70, experience: 74, seniority: 70, niceToHave: 55, availability: 100 },
    mustHaveCoverage: ["Kubernetes", "Terraform"], gaps: ["Prometheus"], niceToHave: [],
    evidence: [{ skill: "Kubernetes", cite: "Delivered applications on Azure Kubernetes environments." }],
    motivation: "Useful Azure and Kubernetes experience, but the observability requirement is only partially covered."
  },
  {
    id: "a3-m5", assignmentId: "a3", consultantId: "6", initials: "RO", name: "Ravi Okonkwo",
    headline: "Data Consultant · 7 yrs", score: 61,
    breakdown: { mustHave: 50, semantic: 64, experience: 82, seniority: 84, niceToHave: 45, availability: 100 },
    mustHaveCoverage: ["Terraform"], gaps: ["Kubernetes", "Prometheus"], niceToHave: [],
    evidence: [{ skill: "Terraform", cite: "Uses infrastructure-as-code for repeatable analytics platform environments." }],
    motivation: "Good senior delivery experience, but the reliability and observability skill coverage is incomplete."
  }
];
