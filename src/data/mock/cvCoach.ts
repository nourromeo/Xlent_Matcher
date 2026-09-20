export const MOCK_RESULT = {
  estimatedScore: 54,
  projectedScore: 82,
  summary:
    "The consultant CV demonstrates solid backend experience but does not clearly address several important assignment keywords and experience signals. The suggested changes would make the consultant’s match with the assignment easier for the XLENT reviewer to assess.",
  suggestions: [
    {
      id: "s1",
      category: "keyword",
      severity: "high",
      title: 'Missing assignment requirement: "event-driven architecture"',
      detail:
        'The assignment explicitly lists "event-driven architecture" as a required capability. The consultant CV mentions Kafka and message queues, but does not clearly connect that experience to this requirement.',
      example:
        'Add to the consultant summary: "…designing event-driven architectures on top of Kafka and RabbitMQ…"',
      scoreDelta: 8,
    },
    {
      id: "s2",
      category: "credential",
      severity: "high",
      title: "Kubernetes experience needs clearer project evidence",
      detail:
        'The assignment requires production Kubernetes at ≥100 nodes. The consultant CV says "managed Kubernetes clusters" without cluster size or workload details, so the evidence is not yet strong enough for this requirement.',
      example:
        'Clarify: "Managed 3 production Kubernetes clusters (80–120 nodes, ~400 pods) across EU regions at Zalando."',
      scoreDelta: 7,
    },
    {
      id: "s3",
      category: "keyword",
      severity: "high",
      title: 'Missing keyword: "observability"',
      detail:
        'The assignment requirements mention OpenTelemetry and observability practices three times. The consultant CV mentions Prometheus but does not clearly describe tracing or structured logging.',
      example:
        '"Introduced observability stack (OpenTelemetry traces, Prometheus metrics, structured JSON logging) reducing MTTR by 40%."',
      scoreDelta: 6,
    },
    {
      id: "s4",
      category: "clarity",
      severity: "medium",
      title: "Go experience period is ambiguous",
      detail:
        'The consultant CV lists Go as a skill, but the dates are unclear. One project says 2021–2023 while another implies earlier use, making the total and most recent experience difficult to assess.',
      example:
        "Add an explicit date range per role: \"Backend Engineer (Go, Kafka) · Zalando · Jan 2021 – Dec 2023\"",
      scoreDelta: 5,
    },
    {
      id: "s5",
      category: "evidence",
      severity: "medium",
      title: "Project context and outcomes are inconsistent",
      detail:
        'One project has strong quantified outcomes ("P99 18ms → 4ms"), while another uses broad phrases such as "improved performance" and "large datasets". Clear outcomes would strengthen the assignment evidence.',
      example:
        '"Reduced search latency from 820ms to 330ms (60%) for a 2TB PostgreSQL-backed marketplace via composite index redesign."',
      scoreDelta: 5,
    },
    {
      id: "s6",
      category: "structure",
      severity: "medium",
      title: "No explicit seniority signal in headline",
      detail:
        'The assignment requests a Senior or Staff consultant. The current headline says "Backend Engineer", so the consultant’s seniority must be inferred from the surrounding project history.',
      example: '"Senior Backend Engineer · Go · Distributed Systems · 8 yrs"',
      scoreDelta: 4,
    },
    {
      id: "s7",
      category: "keyword",
      severity: "low",
      title: 'Nice-to-have: "gRPC" not mentioned',
      detail:
        "The assignment lists gRPC as a preferred skill. If the consultant has used it, adding concrete project evidence would strengthen the match.",
      example: '"Defined gRPC service contracts for 12 internal microservices."',
      scoreDelta: 3,
    },
    {
      id: "s8",
      category: "credential",
      severity: "low",
      title: "Availability not stated",
      detail:
        "The client assignment has a four-week start window. The consultant CV does not state availability, so the XLENT reviewer cannot confirm this practical requirement.",
      example: 'Add a footer line: "Available from: October 2026 · Open to remote-first roles in CET±2"',
      scoreDelta: 2,
    },
  ],
};

