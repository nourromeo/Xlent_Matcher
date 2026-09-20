import type { Assignment } from "../../types";

export const ASSIGNMENTS: Assignment[] = [
  { id: "a1", title: "Payments Platform Modernisation", client: "Nordic Financial Services", description: "Modernise an event-driven payments platform and strengthen its production reliability.", requiredSkills: ["Go", "PostgreSQL", "Kafka", "Kubernetes"], preferredSkills: ["Rust", "gRPC"], seniority: "Senior", status: "matching", created: "Sep 8", availability: "Immediate" },
  { id: "a2", title: "Applied AI Enablement", client: "Industrial Analytics Group", description: "Build and operationalise language-model services for internal knowledge workflows.", requiredSkills: ["Python", "PyTorch", "NLP", "Azure ML"], preferredSkills: ["FastAPI", "MLflow"], seniority: "Mid", status: "done", created: "Sep 6", availability: "Within 2 weeks" },
  { id: "a3", title: "Cloud Reliability Programme", client: "Public Services Organisation", description: "Improve platform reliability, observability, and infrastructure automation across Azure workloads.", requiredSkills: ["Kubernetes", "Terraform", "Prometheus"], preferredSkills: ["Go", "Datadog"], seniority: "Staff", status: "draft", created: "Sep 9", availability: "To be agreed" },
];
