import { checkPlaceholders } from "./lib/placeholders.mjs";

checkPlaceholders()
  .then((findings) => {
    if (findings.length === 0) {
      console.log("Placeholder check passed.");
      return;
    }

    console.error("Bracket placeholders found in published output:");
    for (const finding of findings) {
      console.error(`  ${finding.file}:${finding.line}  ${finding.match}`);
    }
    process.exitCode = 1;
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
