import { sendTestAlert } from "./lib/test-alert.mjs";

const result = await sendTestAlert(process.env);

if (result.ok) {
  console.log(`Test alert sent (Resend id ${result.id ?? "unknown"}). Check the team inbox.`);
} else if (result.reason === "missing_env") {
  console.error(`Missing ${result.missing.join(", ")} in .env.local or the environment.`);
  process.exitCode = 1;
} else {
  console.error(`Test alert failed: ${result.reason}.`);
  process.exitCode = 1;
}
