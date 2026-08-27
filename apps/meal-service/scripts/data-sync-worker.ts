import { processNextSyncJob } from "../src/lib/official-data-sync";

const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function main() {
  for (;;) {
    const processed = await processNextSyncJob();
    if (!processed) await delay(5_000);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
