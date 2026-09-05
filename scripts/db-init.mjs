#!/usr/bin/env node
import { initSchema } from "../lib/db.mjs";

await initSchema();
console.log("KYAI database schema initialized.");
