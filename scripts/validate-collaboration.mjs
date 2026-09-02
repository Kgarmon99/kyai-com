#!/usr/bin/env node
import { readFileSync } from "node:fs";

const errors = [];
const os = JSON.parse(readFileSync("data/contributor-os.json", "utf8"));

function requireArray(name, minLength = 1) {
  if (!Array.isArray(os[name]) || os[name].length < minLength) {
    errors.push(`${name} must have at least ${minLength} item(s)`);
  }
}

function requireFields(collectionName, fields) {
  const seen = new Set();
  for (const [index, item] of os[collectionName].entries()) {
    for (const field of fields) {
      if (!item[field]) {
        errors.push(`${collectionName}[${index}] missing ${field}`);
      }
    }
    if (item.id) {
      if (seen.has(item.id)) errors.push(`${collectionName} has duplicate id ${item.id}`);
      seen.add(item.id);
    }
  }
}

if (!os.version) errors.push("version is required");
if (!os.github?.repo?.startsWith("https://github.com/")) errors.push("github.repo must be a GitHub URL");

requireArray("roles", 6);
requireArray("missions", 4);
requireArray("regions", 6);
requireArray("pipeline", 4);
requireArray("badges", 3);

requireFields("roles", ["id", "title", "focus", "impact", "firstAction", "template", "icon"]);
requireFields("missions", ["id", "title", "region", "difficulty", "status", "needed", "outcome", "template"]);
requireFields("regions", ["id", "name", "openRoles", "nextWin"]);
requireFields("pipeline", ["status", "description"]);
requireFields("badges", ["name", "description"]);

const allowedTemplates = new Set(["signal.yml", "event.yml", "profile.yml", "mission.yml", "toolkit.yml"]);
for (const item of [...os.roles, ...os.missions]) {
  if (!allowedTemplates.has(item.template)) {
    errors.push(`${item.id || item.title} uses unknown template ${item.template}`);
  }
}

if (errors.length) {
  throw new Error(`KYAI collaboration validation failed:\n- ${errors.join("\n- ")}`);
}

console.log("KYAI collaboration data passed");
