"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs");
const yaml=fs.readFileSync(".github/workflows/website-promote.yml","utf8");
const publish=fs.readFileSync(".github/workflows/publish.yml","utf8");
const manifest=require("../website-release.json");
const desktop=require("../desktop/package.json");
const lock=require("../desktop/package-lock.json");
test("Web and Windows versions and notes are complete before promotion",()=>{
 assert.match(manifest.version,/^\d+\.\d+\.\d+$/);
 assert.equal(manifest.notes,"RELEASE_NOTES_V"+manifest.version.replaceAll(".","_")+".md");
 assert.ok(fs.existsSync(manifest.notes));
 assert.equal(desktop.version,lock.version);
 assert.equal(desktop.version,lock.packages[""].version);
 assert.ok(fs.existsSync("desktop/RELEASE_NOTES_"+desktop.version.replaceAll(".","_")+".md"));
});
test("Web auto-release only from validated main, never PR or untrusted fork",()=>{
 assert.match(yaml,/workflows: \[Validate ATELIER HOME\]/);
 for(const required of [
   "workflow_run.conclusion == 'success'",
   "workflow_run.head_branch == 'main'",
   "workflow_run.event == 'push'",
   "workflow_run.head_repository.full_name == github.repository",
   "git rev-parse origin/main",
   "VALIDATED_SHA",
   "validateRelease(m,names)",
   'git ls-remote --exit-code --tags origin',
   'gh workflow run publish.yml --ref "$tag"'
 ])assert.ok(yaml.includes(required),"Missing trusted release gate: "+required);
 assert.match(publish,/node scripts\/package-release\.cjs/);
 assert.match(publish,/--verify-tag/);
 assert.match(publish,/sha256|dist\/web-release\/\*/i);
});
test("Desktop release remains gated to validated main and scoped to desktop version",()=>{
 const y=fs.readFileSync(".github/workflows/desktop-promote.yml","utf8");
 assert.match(y,/workflow_run\.event == 'push'/);
 assert.match(y,/git rev-parse origin\/main/);
 assert.match(y,/gh workflow run desktop-release\.yml --ref/);
});
