#!/usr/bin/env python3
"""
Parse OmniClass Table 33 (Disciplines) XLS file and convert to structured JSON.

Input:  OmniClass-33-2012-10-30-215033.xls  (sheet "Table 33")
Output: services/core-service/src/data/omniclass/omniclass-33.json
        services/core-service/src/data/omniclass/omniclass-tables.json

The XLS has columns:
  Number | Level 1 Title | Level 2 Title | Level 3 Title |
  Level 4 Title | Level 5 Title | Level 6 Title | Definition

The Number format is "33-XX XX XX" with non-breaking spaces (\xa0) and/or
regular spaces as separators.  The level is determined by which "Level N Title"
column contains the actual title text.

Parent is the nearest preceding item at one level above.
"""

import json
import os
import re
import sys
from collections import OrderedDict
from datetime import datetime, timezone
from pathlib import Path

import xlrd

# --------------------------------------------------------------------------- #
# Paths
# --------------------------------------------------------------------------- #
PROJECT_ROOT = Path(__file__).resolve().parent.parent
XLS_PATH = PROJECT_ROOT / "OmniClass-33-2012-10-30-215033.xls"
OUTPUT_DIR = PROJECT_ROOT / "services" / "core-service" / "src" / "data" / "omniclass"

SHEET_NAME = "Table 33"
HEADER_ROW = 1  # Row 0 is a title row; row 1 has the actual column headers
DATA_START_ROW = 2

# Column indices (0-based)
COL_NUMBER = 0
COL_LEVEL1 = 1
COL_LEVEL2 = 2
COL_LEVEL3 = 3
COL_LEVEL4 = 4
COL_LEVEL5 = 5
COL_LEVEL6 = 6
COL_DEFINITION = 7


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

def normalize_code(raw_code: str) -> str:
    """
    Normalize an OmniClass code:
      - Strip leading/trailing whitespace and apostrophes
      - Replace all non-breaking spaces (\xa0) with regular spaces
      - Collapse multiple spaces into one
      - Strip trailing whitespace again
    Result: "33-11 00 00"  (regular spaces between groups)
    """
    code = raw_code.strip().strip("'").strip()
    code = code.replace("\xa0", " ")
    code = re.sub(r" +", " ", code)
    code = code.strip()
    return code


def code_to_normalized(code: str) -> str:
    """
    Convert "33-11 00 00" -> "33-11-00-00" (dash-separated, no spaces).
    """
    return code.replace(" ", "-")


def determine_level(level_titles: list[str]) -> int:
    """
    Given the 6 level title cell values, return the level (1-6) based on
    which is the deepest non-empty title.
    """
    for lvl in range(6, 0, -1):
        if level_titles[lvl - 1].strip():
            return lvl
    return 0  # Should not happen for valid rows


def get_title(level_titles: list[str], level: int) -> str:
    """Return the title string for the given level."""
    return level_titles[level - 1].strip()


def clean_text(text: str) -> str:
    """Clean a text field: strip whitespace, normalize line breaks."""
    if not text:
        return ""
    text = text.strip()
    # Replace non-breaking spaces
    text = text.replace("\xa0", " ")
    # Normalize multiple spaces
    text = re.sub(r" +", " ", text)
    # Normalize line endings
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # Strip trailing newlines
    text = text.strip()
    return text


# --------------------------------------------------------------------------- #
# Main parsing
# --------------------------------------------------------------------------- #

def parse_xls(xls_path: Path) -> list[dict]:
    """
    Parse the OmniClass Table 33 XLS and return a list of item dicts.
    """
    wb = xlrd.open_workbook(str(xls_path))
    sheet = wb.sheet_by_name(SHEET_NAME)

    items = []

    for row_idx in range(DATA_START_ROW, sheet.nrows):
        raw_code = str(sheet.cell_value(row_idx, COL_NUMBER)).strip()
        if not raw_code or raw_code == "''":
            continue

        code = normalize_code(raw_code)
        if not code:
            continue

        # Read level title columns
        level_titles = []
        for col in range(COL_LEVEL1, COL_LEVEL1 + 6):
            val = str(sheet.cell_value(row_idx, col)).strip().strip("'")
            level_titles.append(val)

        level = determine_level(level_titles)
        if level == 0:
            print(f"  WARNING: Row {row_idx} has no level title, skipping: {code}")
            continue

        title = get_title(level_titles, level)
        definition = clean_text(
            str(sheet.cell_value(row_idx, COL_DEFINITION)).strip().strip("'")
        )

        items.append(OrderedDict([
            ("code", code),
            ("codeNormalized", code_to_normalized(code)),
            ("title", title),
            ("definition", definition if definition else None),
            ("level", level),
            ("parentCode", None),   # Will be set in second pass
            ("children", []),       # Will be set in second pass
        ]))

    return items


def assign_parents_and_children(items: list[dict]) -> list[dict]:
    """
    Assign parentCode and children for each item.

    Parent rule: for an item at level N, the parent is the nearest preceding
    item at level N-1.
    """
    # Track the most recent item at each level
    last_at_level: dict[int, str] = {}

    for item in items:
        level = item["level"]

        if level == 1:
            item["parentCode"] = None
        else:
            parent_level = level - 1
            parent_code = last_at_level.get(parent_level)
            item["parentCode"] = parent_code
            if parent_code is None:
                print(f"  WARNING: No parent found for {item['code']} at level {level}")

        # Update tracker: this item is now the most recent at its level
        last_at_level[level] = item["code"]
        # Clear any deeper levels (they are no longer valid parents)
        for deeper in range(level + 1, 7):
            last_at_level.pop(deeper, None)

    # Build children lists
    code_to_item = {item["code"]: item for item in items}
    for item in items:
        parent = item["parentCode"]
        if parent and parent in code_to_item:
            code_to_item[parent]["children"].append(item["code"])

    # Validate parent references
    code_set = {item["code"] for item in items}
    for item in items:
        if item["parentCode"] and item["parentCode"] not in code_set:
            print(f"  WARNING: {item['code']} references parent "
                  f"{item['parentCode']} which is not in the dataset")

    return items


def write_table_json(items: list[dict], output_path: Path) -> dict:
    """
    Write the omniclass-33.json file and return summary stats.
    """
    # Level distribution
    level_dist: dict[int, int] = {}
    for item in items:
        lvl = item["level"]
        level_dist[lvl] = level_dist.get(lvl, 0) + 1

    output = OrderedDict([
        ("standard", "omniclass"),
        ("table", "33"),
        ("tableName", "Disciplines"),
        ("version", "2012"),
        ("generatedAt", datetime.now(timezone.utc).isoformat()),
        ("totalItems", len(items)),
        ("levelDistribution", OrderedDict(sorted(level_dist.items()))),
        ("items", items),
    ])

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    return {
        "count": len(items),
        "levelDistribution": level_dist,
    }


def write_tables_index(summary: dict, output_dir: Path):
    """
    Generate omniclass-tables.json index file (similar to uniclass-tables.json).
    """
    output_path = output_dir / "omniclass-tables.json"

    tables = OrderedDict()
    tables["33"] = OrderedDict([
        ("code", "33"),
        ("name", "Disciplines"),
        ("usage", "used for discipline/trade classification in construction projects"),
        ("file", "omniclass-33.json"),
        ("itemCount", summary["count"]),
        ("levelDistribution", OrderedDict(sorted(
            {str(k): v for k, v in summary["levelDistribution"].items()}.items()
        ))),
    ])

    output = OrderedDict([
        ("standard", "omniclass"),
        ("version", "2012"),
        ("generatedAt", datetime.now(timezone.utc).isoformat()),
        ("totalTables", len(tables)),
        ("totalItems", sum(t["itemCount"] for t in tables.values())),
        ("tables", tables),
    ])

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    file_size_kb = output_path.stat().st_size / 1024
    print(f"  -> omniclass-tables.json: {len(tables)} table(s), {file_size_kb:.1f} KB")


# --------------------------------------------------------------------------- #
# Entry point
# --------------------------------------------------------------------------- #

def main():
    print("=" * 70)
    print("OmniClass Table 33 XLS -> JSON Parser")
    print("=" * 70)
    print(f"XLS source:  {XLS_PATH}")
    print(f"JSON output: {OUTPUT_DIR}")
    print()

    if not XLS_PATH.exists():
        print(f"ERROR: XLS file not found: {XLS_PATH}")
        return 1

    # Ensure output directory exists
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Parse
    print("[1/4] Parsing XLS file...")
    items = parse_xls(XLS_PATH)
    print(f"      Parsed {len(items)} items from sheet '{SHEET_NAME}'")

    # Assign hierarchy
    print("[2/4] Building hierarchy (parents & children)...")
    items = assign_parents_and_children(items)

    # Write main JSON
    print("[3/4] Writing omniclass-33.json...")
    output_path = OUTPUT_DIR / "omniclass-33.json"
    summary = write_table_json(items, output_path)

    file_size_kb = output_path.stat().st_size / 1024
    print(f"      -> omniclass-33.json: {summary['count']} items, {file_size_kb:.1f} KB")
    print(f"         Levels: {dict(sorted(summary['levelDistribution'].items()))}")

    # Write index
    print("[4/4] Writing omniclass-tables.json...")
    write_tables_index(summary, OUTPUT_DIR)

    # Final summary
    print()
    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Total items:      {summary['count']}")
    print(f"Level distribution:")
    for lvl in sorted(summary["levelDistribution"]):
        print(f"  Level {lvl}: {summary['levelDistribution'][lvl]} items")
    print(f"Output files:")
    print(f"  {OUTPUT_DIR / 'omniclass-33.json'}")
    print(f"  {OUTPUT_DIR / 'omniclass-tables.json'}")
    print("=" * 70)

    return 0


if __name__ == "__main__":
    sys.exit(main())
