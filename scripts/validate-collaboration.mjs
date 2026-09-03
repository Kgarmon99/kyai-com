#!/usr/bin/env node
import { readFileSync } from "node:fs";

const errors = [];
const os = JSON.parse(readFileSync("data/contributor-os.json", "utf8"));
const regionsData = JSON.parse(readFileSync("data/regions.json", "utf8"));
const eventsData = JSON.parse(readFileSync("data/events.json", "utf8"));
const profilesData = JSON.parse(readFileSync("data/profiles.json", "utf8"));
const toolkitsData = JSON.parse(readFileSync("data/toolkits.json", "utf8"));

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

function requireDataFields(data, collectionName, fields, minLength = 1) {
  const items = data[collectionName];
  if (!Array.isArray(items) || items.length < minLength) {
    errors.push(`${collectionName} must have at least ${minLength} item(s)`);
    return;
  }

  const seen = new Set();
  for (const [index, item] of items.entries()) {
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

requireDataFields(regionsData, "regions", ["id", "slug", "name", "headline", "summary", "status", "nextWin"], 6);
requireDataFields(eventsData, "events", ["id", "title", "date", "region", "host", "type", "status", "whyItMatters"], 4);
requireDataFields(profilesData, "profiles", ["id", "name", "type", "region", "claimStatus", "reason"], 6);
requireDataFields(toolkitsData, "toolkits", ["id", "title", "audience", "useCase", "status", "reviewNeeded"], 6);

for (const region of regionsData.regions || []) {
  if (!Array.isArray(region.focusAreas) || !region.focusAreas.length) {
    errors.push(`${region.id} must define focusAreas`);
  }
}

for (const toolkit of toolkitsData.toolkits || []) {
  if (!Array.isArray(toolkit.sections) || toolkit.sections.length < 3) {
    errors.push(`${toolkit.id} must define at least three sections`);
  }
}

if (errors.length) {
  throw new Error(`KYAI collaboration validation failed:\n- ${errors.join("\n- ")}`);
}

console.log("KYAI collaboration data passed");
