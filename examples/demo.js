const { parse, validate, nextN, describe } = require("../dist/index.js");

const from = new Date(Date.UTC(2026, 7, 12, 10, 3, 0)); // 2026-08-12T10:03:00Z (a Wednesday)

const exprs = ["0 9 * * 1-5", "*/15 * * * *"];

for (const expr of exprs) {
  console.log(`\nexpr: "${expr}"`);
  console.log("describe:", describe(expr));
  const runs = nextN(expr, 3, from);
  console.log("next 3 runs from", from.toISOString(), ":");
  for (const r of runs) console.log("  ", r.toISOString());
}

console.log("\nvalidate('61 * * * *'):", JSON.stringify(validate("61 * * * *")));
console.log("validate('0 9 * * 1-5'):", JSON.stringify(validate("0 9 * * 1-5")));

try {
  parse("bad expr here");
} catch (err) {
  console.log("\nparse error message:", err.message);
}
