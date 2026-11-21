#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { buildDigest } from "../lib/newsletter-send.mjs";

const feed = JSON.parse(readFileSync("data/intelligence-feed.json", "utf8"));
console.log(buildDigest(feed));
