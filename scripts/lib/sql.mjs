/**
 * Split a SQL schema into separate statements without treating a semicolon
 * inside a full-line comment as a statement boundary.
 */
export function sqlStatements(schema) {
  return schema
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
}
