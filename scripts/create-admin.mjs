#!/usr/bin/env node
import { createRequire } from "node:module";
import readline from "node:readline";
import { query, initSchema, generateId, now } from "../lib/db.mjs";
import { generateApiKey, hashApiKey, isValidEmail } from "../lib/api-utils.mjs";

const require = createRequire(import.meta.url);

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  await initSchema();

  const args = process.argv.slice(2);
  let email = args.find((arg) => arg.includes("@"));
  let name = args.find((arg) => !arg.includes("@") && !arg.startsWith("--"));
  let role = args.find((arg) => ["admin", "editor", "reviewer"].includes(arg));
  let region = args.find((arg) => arg.startsWith("--region="))?.slice(9);

  if (!email) email = await prompt("Admin email: ");
  if (!isValidEmail(email)) {
    console.error("Invalid email");
    process.exit(1);
  }
  if (!name) name = await prompt("Name (optional): ");
  if (!role) role = await prompt("Role (admin/editor/reviewer) [admin]: ") || "admin";
  if (!region) region = (await prompt("Region (optional): ")) || "Statewide";

  const apiKey = generateApiKey();
  const apiKeyHash = hashApiKey(apiKey);
  const id = generateId("kyai-user");
  const ts = now();

  await query(
    `INSERT INTO users (id, email, role, region, name, api_key_hash, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (email) DO UPDATE SET
       role=excluded.role, region=excluded.region, name=excluded.name,
       api_key_hash=excluded.api_key_hash, updated_at=excluded.updated_at`,
    [id, email.toLowerCase(), role, region, name, apiKeyHash, ts, ts],
  );

  console.log("KYAI admin user created/updated.");
  console.log("Email:", email.toLowerCase());
  console.log("Role:", role);
  console.log("API key (copy this now — it will not be shown again):");
  console.log(apiKey);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
