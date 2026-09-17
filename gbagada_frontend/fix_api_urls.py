#!/usr/bin/env python3
import re
import sys

API_URL_LINE = "const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';\n"

SINGLE_QUOTE_PATTERN = re.compile(r"(axios\.(?:get|post|put|delete|patch)\()'\/api(\/[^']*)'")
BACKTICK_PATTERN = re.compile(r"(axios\.(?:get|post|put|delete|patch)\()`\/api(\/[^`]*)`")

def fix_file(path):
    try:
        with open(path, 'r') as f:
            content = f.read()
    except Exception as e:
        print(f"❌ {path}: SKIPPED — could not open file ({e})")
        return

    original = content
    changes = []

    def replace_single(m):
        changes.append(m.group(0))
        return f"{m.group(1)}`${{API_URL}}{m.group(2)}`"
    content = SINGLE_QUOTE_PATTERN.sub(replace_single, content)

    def replace_backtick(m):
        changes.append(m.group(0))
        return f"{m.group(1)}`${{API_URL}}{m.group(2)}`"
    content = BACKTICK_PATTERN.sub(replace_backtick, content)

    needs_api_url = 'API_URL' in content and 'const API_URL' not in content
    if needs_api_url:
        lines = content.split('\n')
        insert_at = 0
        for i, line in enumerate(lines):
            if line.strip().startswith('import '):
                insert_at = i + 1
        lines.insert(insert_at, '\n' + API_URL_LINE.rstrip('\n'))
        content = '\n'.join(lines)

    if content != original:
        try:
            with open(path, 'w') as f:
                f.write(content)
            print(f"✅ {path}: {len(changes)} call(s) fixed" + (", API_URL constant added" if needs_api_url else ""))
            for c in changes:
                print(f"    - {c[:80]}")
        except Exception as e:
            print(f"❌ {path}: found {len(changes)} issue(s) but FAILED TO WRITE ({e})")
    else:
        print(f"⏭️  {path}: no bare /api calls found, nothing changed")

if __name__ == '__main__':
    for path in sys.argv[1:]:
        fix_file(path)
    print("\nDone processing all files in the list — every one above was attempted, none were skipped silently.")
