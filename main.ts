// Leonida Trophy Guide — hand-in program for gta6-trophy-guide-01 (Round 2).
//
// What this program does, in order:
//   1. It runs a pre-flight inspection of everything that is about to be
//      handed in (the trophy data, the static app, and the screenshots).
//      If anything looks wrong, it stops with a non-zero exit code before
//      a single byte is written to the output directory.
//   2. Only when every check passes does it copy app/ and screenshots/
//      into the output directory and write dossier.json there, using the
//      vendored make.fun library exactly as the kit prescribes.
//
// The guide itself is plain static files under app/ (open app/index.html
// in a browser; there is no build step and nothing is fetched from the
// network at runtime). Locally, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the app locally with `node serve.ts` (http://localhost:8080).

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// ---------------------------------------------------------------------------
// Pre-flight inspection (added for Round 2)
//
// Round 1 shipped with this file byte-identical to the kit starter, which
// meant the hand-in plumbing itself carried no authored work and, more
// importantly, nothing re-checked the payload at hand-in time. The checks
// below are my own safety net: they re-derive, from the files on disk, the
// same facts the scorer will look at, so a broken data file or an oversized
// screenshot fails loudly here instead of failing quietly at judging time.
//
// Design rules for this section:
//   - Standard library only; no new dependencies, no network access.
//   - Read-only: it never writes anywhere, least of all to the output dir.
//   - Every problem is collected and reported together at the end, so one
//     run tells me everything that is wrong, not just the first thing.
//   - The summary always goes to stdout, pass or fail, so the run log is
//     self-describing when someone reads it later.
// ---------------------------------------------------------------------------

// Limits mirrored from the hand-in gate so the pre-flight fails on exactly
// the payloads the scorer would refuse.
const EXPECTED_TROPHY_COUNT = 55;
const ALLOWED_GRADES = new Set(['bronze', 'silver', 'gold', 'platinum']);
const APP_MAX_ENTRIES = 993;
const APP_MAX_TOTAL_BYTES = 48 * 1024 * 1024; // 50,331,648
const INDEX_HTML_MAX_BYTES = 1024 * 1024; // 1 MiB
const SCREENSHOT_MIN = 3;
const SCREENSHOT_MAX = 4;
const SCREENSHOT_MAX_BYTES = 256 * 1024; // 262,144
const SCREENSHOT_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);
// Extensions whose contents are scanned as text for external references.
const TEXT_EXTENSIONS = new Set(['.html', '.js', '.mjs', '.css', '.json', '.txt', '.md']);

// Collected findings. `problems` aborts the run; `facts` is the factual
// summary printed either way (counts and sizes actually observed).
const problems = [];
const facts = [];

function problem(message) {
  problems.push(message);
}

function fact(message) {
  facts.push(message);
}

// Recursively list every entry (files and directories) under `dir`.
// Returns paths relative to `dir`, sorted so reports are deterministic.
function listEntries(dir) {
  const found = [];
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      found.push(relative(dir, full));
      if (entry.isDirectory()) walk(full);
    }
  };
  walk(dir);
  return found.sort();
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

// --- Check 1: the trophy data file ---------------------------------------
// The whole guide stands on app/data/trophies.json, so it gets the most
// thorough treatment: shape, count, required fields, grade vocabulary,
// name uniqueness, and a non-empty guide for every single trophy.
function checkTrophies(appDir) {
  const dataPath = join(appDir, 'data', 'trophies.json');
  if (!existsSync(dataPath)) {
    problem('trophies.json is missing at app/data/trophies.json');
    return;
  }
  let data;
  try {
    data = JSON.parse(readFileSync(dataPath, 'utf8'));
  } catch (error) {
    problem(`trophies.json does not parse as JSON: ${error.message}`);
    return;
  }
  if (!isNonEmptyString(data.game)) problem('trophies.json: "game" is missing or empty');
  if (!Array.isArray(data.trophies)) {
    problem('trophies.json: "trophies" is not an array');
    return;
  }
  const trophies = data.trophies;
  fact(`trophies: ${trophies.length} entries (expected ${EXPECTED_TROPHY_COUNT})`);
  if (trophies.length !== EXPECTED_TROPHY_COUNT) {
    problem(`trophies.json holds ${trophies.length} trophies, expected ${EXPECTED_TROPHY_COUNT}`);
  }
  const seenNames = new Set();
  const gradeTally = new Map();
  trophies.forEach((trophy, index) => {
    const label = `trophy #${index + 1} (${trophy?.name ?? 'unnamed'})`;
    if (trophy === null || typeof trophy !== 'object') {
      problem(`${label}: entry is not an object`);
      return;
    }
    if (!isNonEmptyString(trophy.name)) problem(`${label}: name is missing or empty`);
    if (!isNonEmptyString(trophy.description)) problem(`${label}: description is missing or empty`);
    if (!isNonEmptyString(trophy.guide)) problem(`${label}: guide is missing or empty`);
    if (!ALLOWED_GRADES.has(trophy.grade)) {
      problem(`${label}: grade "${trophy.grade}" is not one of ${[...ALLOWED_GRADES].join('/')}`);
    } else {
      gradeTally.set(trophy.grade, (gradeTally.get(trophy.grade) ?? 0) + 1);
    }
    if (isNonEmptyString(trophy.name)) {
      if (seenNames.has(trophy.name)) problem(`${label}: duplicate trophy name`);
      seenNames.add(trophy.name);
    }
    if (trophy.id !== undefined && trophy.id !== index + 1) {
      problem(`${label}: id ${trophy.id} does not match its position ${index + 1}`);
    }
  });
  const tallyText = [...gradeTally.entries()].map(([g, n]) => `${g}=${n}`).join(', ');
  fact(`trophies: grade tally ${tallyText}; unique names ${seenNames.size}`);
}

// --- Check 2: the app/ inventory ------------------------------------------
// The gate caps how many entries app/ may contain and how many bytes its
// files may total, and index.html has its own tighter size cap. Counting
// here, with the same definitions, keeps those caps from surprising us.
function checkAppInventory(appDir) {
  if (!existsSync(appDir)) {
    problem('app/ directory is missing');
    return;
  }
  const entries = listEntries(appDir);
  let totalBytes = 0;
  let fileCount = 0;
  for (const rel of entries) {
    const full = join(appDir, rel);
    if (statSync(full).isFile()) {
      fileCount += 1;
      totalBytes += statSync(full).size;
    }
  }
  fact(`app: ${entries.length} entries, ${fileCount} files, ${totalBytes} bytes total`);
  if (entries.length > APP_MAX_ENTRIES) {
    problem(`app/ has ${entries.length} entries, over the ${APP_MAX_ENTRIES} cap`);
  }
  if (totalBytes > APP_MAX_TOTAL_BYTES) {
    problem(`app/ files total ${totalBytes} bytes, over the ${APP_MAX_TOTAL_BYTES} cap`);
  }
  const indexPath = join(appDir, 'index.html');
  if (!existsSync(indexPath)) {
    problem('app/index.html is missing');
  } else {
    const indexBytes = statSync(indexPath).size;
    fact(`app: index.html is ${indexBytes} bytes (cap ${INDEX_HTML_MAX_BYTES})`);
    if (indexBytes > INDEX_HTML_MAX_BYTES) {
      problem(`app/index.html is ${indexBytes} bytes, over the ${INDEX_HTML_MAX_BYTES} cap`);
    }
  }
  return entries;
}

// --- Check 3: the screenshots ---------------------------------------------
// Three or four shots, each no larger than 256 KiB, in an image format the
// dossier understands. The first file by name becomes the cover, so the
// sorted listing is printed as part of the run summary.
function checkScreenshots(shotsDir) {
  if (!existsSync(shotsDir)) {
    problem('screenshots/ directory is missing');
    return;
  }
  const files = readdirSync(shotsDir)
    .filter((name) => statSync(join(shotsDir, name)).isFile())
    .sort();
  fact(`screenshots: ${files.length} files (${files.join(', ') || 'none'})`);
  if (files.length < SCREENSHOT_MIN || files.length > SCREENSHOT_MAX) {
    problem(`screenshots/ holds ${files.length} files, expected ${SCREENSHOT_MIN}-${SCREENSHOT_MAX}`);
  }
  for (const name of files) {
    const size = statSync(join(shotsDir, name)).size;
    fact(`screenshots: ${name} is ${size} bytes (cap ${SCREENSHOT_MAX_BYTES})`);
    if (!SCREENSHOT_EXTENSIONS.has(extname(name).toLowerCase())) {
      problem(`screenshots/${name}: extension is not .png/.jpg/.jpeg`);
    }
    if (size > SCREENSHOT_MAX_BYTES) {
      problem(`screenshots/${name} is ${size} bytes, over the ${SCREENSHOT_MAX_BYTES} cap`);
    }
    if (size === 0) problem(`screenshots/${name} is empty`);
  }
}

// --- Check 4: no external references inside app/ ---------------------------
// The guide is an offline artifact: it must load nothing over the network.
// Any literal http:// or https:// URL inside a text file under app/ is
// therefore treated as a defect, whatever it points at.
function checkNoExternalUrls(appDir, entries) {
  let scanned = 0;
  for (const rel of entries ?? []) {
    const full = join(appDir, rel);
    if (!statSync(full).isFile()) continue;
    if (!TEXT_EXTENSIONS.has(extname(rel).toLowerCase())) continue;
    scanned += 1;
    const text = readFileSync(full, 'utf8');
    const matches = text.match(/https?:\/\/[^\s"'<>]+/g) ?? [];
    for (const url of matches) {
      problem(`app/${rel}: external URL reference found: ${url}`);
    }
  }
  fact(`external-url scan: ${scanned} text files scanned under app/`);
}

// Run the whole pre-flight and report. Exits non-zero, before any output
// is produced, when at least one problem was found.
function runPreflight() {
  const appDir = join(here, 'app');
  checkTrophies(appDir);
  const entries = checkAppInventory(appDir);
  checkScreenshots(join(here, 'screenshots'));
  checkNoExternalUrls(appDir, entries);
  console.log('pre-flight summary:');
  for (const line of facts) console.log(`  - ${line}`);
  if (problems.length > 0) {
    console.error(`pre-flight FAILED with ${problems.length} problem(s):`);
    for (const line of problems) console.error(`  ! ${line}`);
    process.exit(1);
  }
  console.log('pre-flight: all checks passed');
}

runPreflight();

// ---------------------------------------------------------------------------
// Hand-in (original behaviour, unchanged): copy the payload into the output
// directory and write the dossier the judge reads.
// ---------------------------------------------------------------------------

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
