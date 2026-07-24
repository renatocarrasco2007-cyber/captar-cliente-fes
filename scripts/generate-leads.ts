import { generateWeeklyBatch } from "../src/lib/generate-leads";

generateWeeklyBatch()
  .then((result) => {
    console.log("Lote generado:", result);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error generando lote:", err);
    process.exit(1);
  });
