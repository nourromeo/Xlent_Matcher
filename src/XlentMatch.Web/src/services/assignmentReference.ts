/** Display-only alias; preserve the reference stored by the API. */
export function formatAssignmentReference(reference: string): string {
  return reference.replace(/^UPP-/, "CA-");
}
