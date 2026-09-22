export const QUEUE = [
  { name: "anna_kovacs_consultant_cv.pdf", status: "parsing", added: "2m ago" },
  { name: "marcus_lee_consultant_cv.docx", status: "extracting", added: "4m ago" },
  { name: "priya_sharma_cv.pdf", status: "embedding", added: "7m ago" },
  { name: "tobias_renz_cv.pdf", status: "done", added: "12m ago" },
  { name: "seo_yun_resume.pdf", status: "error", added: "15m ago" },
] as const;

export const RECENT_MATCHES = [
  { consultant: "Anna Kovacs", assignment: "Payments Platform Modernisation", score: 91, date: "Today" },
  { consultant: "Marcus Lee", assignment: "Applied AI Enablement", score: 84, date: "Today" },
  { consultant: "Priya Sharma", assignment: "Cloud Reliability Programme", score: 78, date: "Yesterday" },
  { consultant: "Tobias Renz", assignment: "Azure Commerce Platform", score: 73, date: "Yesterday" },
  { consultant: "Sofia Yun", assignment: "Design System Delivery", score: 67, date: "Sep 7" },
] as const;
