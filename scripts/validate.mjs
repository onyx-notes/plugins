#!/usr/bin/env node
// Validate registry.json and every plugin manifest. Dependency-free (Node
// built-ins only) so CI needs no install step. Exits non-zero on any problem.

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CAPABILITIES = new Set([
  "vault:read",
  "vault:write",
  "editor:read",
  "editor:write",
  "ui:commands",
  "ui:panel",
  "net:fetch",
]);
const ID_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
const SEMVER_RE = /^[0-9]+\.[0-9]+\.[0-9]+$/;

const errors = [];
const fail = (where, msg) => errors.push(`${where}: ${msg}`);

function readJson(path, where) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    fail(where, `not valid JSON (${e.message})`);
    return null;
  }
}

function checkCapabilities(where, caps) {
  if (!Array.isArray(caps) || caps.length === 0) {
    return fail(where, "capabilities must be a non-empty array");
  }
  for (const cap of caps) {
    if (!CAPABILITIES.has(cap)) fail(where, `unknown capability "${cap}"`);
  }
  if (new Set(caps).size !== caps.length) fail(where, "duplicate capabilities");
}

const registry = readJson(join(root, "registry.json"), "registry.json");
if (!Array.isArray(registry)) {
  fail("registry.json", "must be a JSON array");
} else {
  const seen = new Set();
  const sorted = [...registry].map((e) => e?.id).join(",");
  const expected = [...registry].map((e) => e?.id).sort().join(",");
  if (sorted !== expected) fail("registry.json", "entries must be sorted by id");

  for (const entry of registry) {
    const id = entry?.id ?? "<missing id>";
    const where = `registry entry "${id}"`;
    for (const field of ["id", "name", "description", "author", "capabilities", "source"]) {
      if (entry?.[field] === undefined) fail(where, `missing field "${field}"`);
    }
    if (typeof id === "string" && !ID_RE.test(id)) fail(where, "id must be kebab-case");
    if (seen.has(id)) fail(where, "duplicate id");
    seen.add(id);
    checkCapabilities(where, entry?.capabilities);

    const expectedSource = `https://raw.githubusercontent.com/onyx-notes/plugins/main/${id}`;
    if (entry?.source !== expectedSource) {
      fail(where, `source must be "${expectedSource}"`);
    }

    // Cross-check: the plugin directory + manifest must exist and agree.
    const dir = join(root, id);
    if (!existsSync(dir)) {
      fail(where, `no directory "${id}/"`);
      continue;
    }
    for (const file of ["manifest.json", "main.js"]) {
      if (!existsSync(join(dir, file))) fail(where, `missing ${id}/${file}`);
    }
    const manifest = readJson(join(dir, "manifest.json"), `${id}/manifest.json`);
    if (manifest) {
      const mWhere = `${id}/manifest.json`;
      if (manifest.id !== id) fail(mWhere, `manifest id "${manifest.id}" != directory "${id}"`);
      if (!SEMVER_RE.test(manifest.version ?? "")) fail(mWhere, "version must be semver x.y.z");
      if (!manifest.name) fail(mWhere, "missing name");
      if (!manifest.description) fail(mWhere, "missing description");
      checkCapabilities(mWhere, manifest.capabilities);
      // The registry must not advertise a capability the manifest doesn't claim.
      const declared = new Set(manifest.capabilities ?? []);
      for (const cap of entry.capabilities ?? []) {
        if (!declared.has(cap)) fail(where, `capability "${cap}" not in the plugin manifest`);
      }
    }
  }
}

// Flag orphan directories (a plugin folder with no registry entry).
if (Array.isArray(registry)) {
  const ids = new Set(registry.map((e) => e?.id));
  for (const name of readdirSync(root, { withFileTypes: true })) {
    if (!name.isDirectory()) continue;
    if (["schema", "scripts", ".github", ".git", "node_modules"].includes(name.name)) continue;
    if (!ids.has(name.name)) fail("registry.json", `directory "${name.name}/" has no registry entry`);
  }
}

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("✓ registry and all plugin manifests are valid");
