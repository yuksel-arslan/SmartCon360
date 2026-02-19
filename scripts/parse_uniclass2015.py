#!/usr/bin/env python3
"""
Parse all Uniclass 2015 CSV files and convert them to structured JSON files.

Each CSV has the format: Code,Group,Sub group,Section,Object,Title,NRM
Output JSON files go to: services/core-service/src/data/uniclass2015/

Level calculation:
  - "EF_15"           (group only)                     = level 1
  - "EF_15_10"        (group + subgroup)               = level 2
  - "EF_15_10_30"     (group + subgroup + section)     = level 3
  - "Ss_15_10_30_05"  (group + subgroup + section + object) = level 4

Parent codes are derived by removing the last segment.
Children are computed as direct child codes of each item.
"""

import csv
import json
import os
import sys
from collections import OrderedDict
from datetime import datetime, timezone
from pathlib import Path


# Project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent
CSV_DIR = PROJECT_ROOT
OUTPUT_DIR = PROJECT_ROOT / "services" / "core-service" / "src" / "data" / "uniclass2015"

# Table definitions: (csv_suffix, output_filename, table_code, table_name, usage_note)
TABLE_DEFS = [
    ("EF", "uniclass-ef.json", "EF", "Elements/Functions", "used for WBS"),
    ("Ss", "uniclass-ss.json", "Ss", "Systems", "used for CBS"),
    ("Ro", "uniclass-ro.json", "Ro", "Roles", "used for OBS"),
    ("Ac", "uniclass-ac.json", "Ac", "Activities", "used for project activities"),
    ("Co", "uniclass-co.json", "Co", "Complexes", "used for project types"),
    ("En", "uniclass-en.json", "En", "Entities", "used for building types"),
    ("SL", "uniclass-sl.json", "SL", "Spaces/Locations", "used for LBS"),
    ("Pr", "uniclass-pr.json", "Pr", "Products", "used for materials/products"),
    ("PM", "uniclass-pm.json", "PM", "Project Management", "used for documents"),
    ("TE", "uniclass-te.json", "TE", "Tools and Equipment", "used for equipment"),
    ("FI", "uniclass-fi.json", "FI", "Form of Information", "used for document types"),
    ("Zz", "uniclass-zz.json", "Zz", "CAD", "used for CAD layers"),
]


def determine_level(code):
    """
    Determine the hierarchy level from the code structure.
    The code prefix (e.g., 'EF', 'Ss') is separated from numeric parts by '_'.

    EF_15          -> parts after prefix: ['15']           -> level 1
    EF_15_10       -> parts after prefix: ['15', '10']     -> level 2
    EF_15_10_30    -> parts after prefix: ['15', '10', '30'] -> level 3
    Ss_15_10_30_05 -> parts after prefix: ['15', '10', '30', '05'] -> level 4
    """
    parts = code.split("_")
    # First part is the table prefix (e.g., 'EF', 'Ss')
    # Remaining parts are the numeric hierarchy
    numeric_parts = parts[1:]
    return len(numeric_parts)


def determine_parent_code(code):
    """
    Derive parent code by removing the last numeric segment.
    Level 1 items have no parent.
    """
    parts = code.split("_")
    if len(parts) <= 2:
        # e.g., "EF_15" -> level 1 -> no parent
        return None
    # Remove the last segment to get parent
    parent_parts = parts[:-1]
    return "_".join(parent_parts)


def parse_csv_file(csv_path):
    """
    Parse a Uniclass 2015 CSV file and return a list of item dictionaries.
    """
    items = []

    with open(csv_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)

        for row in reader:
            code = row.get("Code", "").strip()
            if not code:
                continue

            title = row.get("Title", "").strip()
            group = row.get("Group", "").strip() or None
            sub_group = row.get("Sub group", "").strip() or None
            section = row.get("Section", "").strip() or None
            obj = row.get("Object", "").strip() or None

            level = determine_level(code)
            parent_code = determine_parent_code(code)

            item = OrderedDict([
                ("code", code),
                ("title", title),
                ("level", level),
                ("group", group),
                ("subGroup", sub_group),
                ("section", section),
                ("object", obj),
                ("parentCode", parent_code),
                ("children", []),  # Will be populated in a second pass
            ])

            items.append(item)

    return items


def build_children(items):
    """
    For each item, find all direct children (items whose parentCode matches this code).
    """
    # Build a lookup: code -> item
    code_set = {item["code"] for item in items}
    code_to_children = {item["code"]: [] for item in items}

    for item in items:
        parent = item["parentCode"]
        if parent and parent in code_to_children:
            code_to_children[parent].append(item["code"])

    # Assign children lists
    for item in items:
        item["children"] = sorted(code_to_children.get(item["code"], []))

    # Validate: if a parentCode references a code not in the dataset, log a warning
    for item in items:
        if item["parentCode"] and item["parentCode"] not in code_set:
            print(f"  WARNING: {item['code']} references parent {item['parentCode']} which is not in the dataset")

    return items


def process_table(csv_suffix, output_filename, table_code, table_name):
    """
    Process a single Uniclass table CSV and write the JSON output.
    Returns a summary dict with item count and level distribution.
    """
    csv_path = CSV_DIR / f"Uniclass2015_{csv_suffix}.csv"
    output_path = OUTPUT_DIR / output_filename

    if not csv_path.exists():
        print(f"  SKIPPED: {csv_path} not found")
        return {"table": table_code, "count": 0, "error": "CSV not found"}

    print(f"  Parsing {csv_path.name}...")
    items = parse_csv_file(str(csv_path))
    items = build_children(items)

    # Build level distribution
    level_dist = {}
    for item in items:
        lvl = item["level"]
        level_dist[lvl] = level_dist.get(lvl, 0) + 1

    # Build output JSON
    output = OrderedDict([
        ("standard", "uniclass2015"),
        ("table", table_code),
        ("tableName", table_name),
        ("version", "2015"),
        ("generatedAt", datetime.now(timezone.utc).isoformat()),
        ("totalItems", len(items)),
        ("levelDistribution", OrderedDict(sorted(level_dist.items()))),
        ("items", items),
    ])

    # Write JSON
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    file_size_kb = output_path.stat().st_size / 1024
    print(f"  -> {output_filename}: {len(items)} items, {file_size_kb:.1f} KB")
    print(f"     Levels: {dict(sorted(level_dist.items()))}")

    return {
        "table": table_code,
        "tableName": table_name,
        "outputFile": output_filename,
        "count": len(items),
        "levelDistribution": level_dist,
    }


def generate_tables_index(summaries):
    """
    Generate a combined uniclass-tables.json that maps table codes to their names
    and provides metadata about all parsed tables.
    """
    output_path = OUTPUT_DIR / "uniclass-tables.json"

    tables = OrderedDict()
    for s in summaries:
        if s.get("error"):
            continue
        # Find the matching table def for usage note
        usage = ""
        for td in TABLE_DEFS:
            if td[2] == s["table"]:
                usage = td[4]
                break

        tables[s["table"]] = OrderedDict([
            ("code", s["table"]),
            ("name", s["tableName"]),
            ("usage", usage),
            ("file", s["outputFile"]),
            ("itemCount", s["count"]),
            ("levelDistribution", OrderedDict(sorted(
                {str(k): v for k, v in s["levelDistribution"].items()}.items()
            ))),
        ])

    output = OrderedDict([
        ("standard", "uniclass2015"),
        ("version", "2015"),
        ("generatedAt", datetime.now(timezone.utc).isoformat()),
        ("totalTables", len(tables)),
        ("totalItems", sum(t["itemCount"] for t in tables.values())),
        ("tables", tables),
    ])

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\n  -> uniclass-tables.json: {len(tables)} tables, "
          f"{sum(t['itemCount'] for t in tables.values())} total items")


def main():
    print("=" * 70)
    print("Uniclass 2015 CSV -> JSON Parser")
    print("=" * 70)
    print(f"CSV source:  {CSV_DIR}")
    print(f"JSON output: {OUTPUT_DIR}")
    print()

    # Ensure output directory exists
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    summaries = []

    for csv_suffix, output_filename, table_code, table_name, usage in TABLE_DEFS:
        print(f"\n[{table_code}] {table_name} ({usage})")
        summary = process_table(csv_suffix, output_filename, table_code, table_name)
        summaries.append(summary)

    # Generate combined index
    print(f"\n{'=' * 70}")
    print("Generating combined tables index...")
    generate_tables_index(summaries)

    # Final summary
    total = sum(s["count"] for s in summaries if not s.get("error"))
    errors = sum(1 for s in summaries if s.get("error"))

    print(f"\n{'=' * 70}")
    print("SUMMARY")
    print(f"{'=' * 70}")
    print(f"Tables processed: {len(summaries) - errors}/{len(summaries)}")
    print(f"Total items:      {total}")
    if errors:
        print(f"Errors:           {errors}")
    print(f"Output directory:  {OUTPUT_DIR}")
    print(f"{'=' * 70}")

    return 0 if errors == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
