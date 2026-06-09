#!/usr/bin/env bash
# init.sh — Environment verification and harness health check
# Run at the START of every session and before declaring any task done.

set -u
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; NC='\033[0m'
ok()   { printf "${GREEN}[OK]${NC}    %s\n" "$1"; }
warn() { printf "${YELLOW}[WARN]${NC}  %s\n" "$1"; }
fail() { printf "${RED}[FAIL]${NC}  %s\n" "$1"; }
EXIT_CODE=0

echo "── 1. Runtime ──────────────────────────────────────────"
NODE_MAJOR=$(node --version 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
if [ -n "$NODE_MAJOR" ] && [ "$NODE_MAJOR" -ge 18 ]; then
  ok "Node.js $(node --version) (>= 18)"
else
  fail "Node.js >= 18 required (found: $(node --version 2>/dev/null || echo 'not found'))"; EXIT_CODE=1
fi

command -v pnpm >/dev/null 2>&1 && ok "pnpm $(pnpm --version)" || { fail "pnpm not found"; EXIT_CODE=1; }

echo "── 2. Harness files ────────────────────────────────────"
for f in AGENTS.md CHECKPOINTS.md feature_list.json \
          progress/current.md progress/history.md \
          docs/harness/architecture.md docs/harness/conventions.md \
          docs/harness/verification.md docs/harness/specs.md \
          .claude/agents/leader.md .claude/agents/implementer.md \
          .claude/agents/reviewer.md; do
  [ -f "$f" ] && ok "Exists $f" || { fail "Missing $f"; EXIT_CODE=1; }
done

echo "── 3. feature_list.json validation ────────────────────"
if command -v node >/dev/null 2>&1 && [ -f feature_list.json ]; then
  node -e "
    const f = require('./feature_list.json');
    const valid = f.rules.valid_status;
    const invalid = f.features.filter(x => !valid.includes(x.status));
    if (invalid.length) { console.error('Invalid status in features: ' + invalid.map(x => x.name).join(', ')); process.exit(1); }
    const ip = f.features.filter(x => x.status === 'in_progress');
    if (ip.length > 1) { console.error('More than 1 feature in_progress: ' + ip.map(x => x.name).join(', ')); process.exit(1); }
    console.log('Valid — ' + ip.length + ' feature(s) in_progress');
  " && ok "feature_list.json valid" || { fail "feature_list.json invalid"; EXIT_CODE=1; }
fi

echo "── 4. SDD spec completeness ────────────────────────────"
if command -v node >/dev/null 2>&1 && [ -f feature_list.json ]; then
  node -e "
    const fs = require('fs');
    const f = require('./feature_list.json');
    const needsSpec = f.features.filter(x => x.sdd && ['spec_ready','in_progress','done'].includes(x.status));
    let missing = [];
    for (const feat of needsSpec) {
      const dir = 'openspec/changes/' + feat.name.replace(/_/g,'-');
      const files = ['proposal.md','design.md','tasks.md'];
      for (const file of files) {
        if (!fs.existsSync(dir + '/' + file)) missing.push(dir + '/' + file);
      }
    }
    if (missing.length) { console.warn('Missing spec artifacts:\\n  ' + missing.join('\\n  ')); }
    else { console.log('All SDD specs present'); }
  " && ok "SDD spec completeness check passed" || warn "Some spec artifacts missing (see above)"
fi

echo "── 5. API tests ────────────────────────────────────────"
if [ -d "apps/api" ]; then
  pnpm --filter api test --passWithNoTests 2>&1 | tail -5
  if [ ${PIPESTATUS[0]} -eq 0 ]; then ok "API tests passed"
  else { fail "API tests failed"; EXIT_CODE=1; }
  fi
else
  warn "apps/api not found — skipping API tests"
fi

echo "── 6. Summary ──────────────────────────────────────────"
[ $EXIT_CODE -eq 0 ] \
  && ok "Environment ready. You can start working." \
  || fail "Environment NOT ready. Resolve errors before proceeding."
exit $EXIT_CODE
