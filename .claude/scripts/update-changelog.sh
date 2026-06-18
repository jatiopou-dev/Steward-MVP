#!/usr/bin/env bash
# Auto-update CHANGELOG.md [Unreleased] section after Claude sessions.
# Fires via the Stop hook in .claude/settings.json.

REPO="/Users/jeffsmac/Gemini/Antigravity/Scratch/Steward app/steward-app"
CHANGELOG="$REPO/CHANGELOG.md"

cd "$REPO" || exit 0

# Collect changed files (unstaged + staged), exclude CHANGELOG
CHANGED=$(git diff --name-only 2>/dev/null | grep -v "CHANGELOG")
STAGED=$(git diff --cached --name-only 2>/dev/null | grep -v "CHANGELOG")
UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null | grep -E "^src/")

ALL=$(printf '%s\n%s\n%s\n' "$STAGED" "$CHANGED" "$UNTRACKED" | sort -u | grep -v "^$")

[ -z "$ALL" ] && exit 0  # nothing changed — skip

DATE=$(date +%Y-%m-%d)

# Don't duplicate today's entry
grep -q "### Changed — $DATE" "$CHANGELOG" 2>/dev/null && exit 0

# Build the insertion block
FILE_LIST=$(echo "$ALL" | head -15 | sed 's/^/- /')
BLOCK=$(printf '### Changed — %s\n%s\n' "$DATE" "$FILE_LIST")

# Insert block after "## [Unreleased]" line using Python (handles multiline safely)
python3 - "$CHANGELOG" "$BLOCK" <<'PYEOF'
import sys, os

changelog_path = sys.argv[1]
block = sys.argv[2]

with open(changelog_path, 'r') as f:
    lines = f.readlines()

out = []
inserted = False
for line in lines:
    out.append(line)
    if not inserted and line.strip() == '## [Unreleased]':
        out.append('\n')
        for bl in block.splitlines():
            out.append(bl + '\n')
        out.append('\n')
        inserted = True

if inserted:
    tmp = changelog_path + '.tmp'
    with open(tmp, 'w') as f:
        f.writelines(out)
    os.replace(tmp, changelog_path)
PYEOF
