#!/usr/bin/env node
import { initSchema, seedFromStaticData } from "../lib/db.mjs";

await initSchema();
await seedFromStaticData();
console.log("KYAI database seeded from static JSON data.");
