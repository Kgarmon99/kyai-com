#!/usr/bin/env node
import { cpSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const client = path.join(root, "dist", "client");

rmSync(path.join(root, "dist"), { force: true, recursive: true });
mkdirSync(client, { recursive: true });

for (const entry of ["index.html", "styles.css", "app.js", "assets"]) {
  cpSync(path.join(root, entry), path.join(client, entry), { recursive: true });
}

console.log("Built static client files into dist/client");
