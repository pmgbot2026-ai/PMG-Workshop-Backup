#!/usr/bin/env python3
"""PMG Calendar Daily Summary Generator

Usage:
  python3 cron_summary.py          # Full summary (for 10:00)
  python3 cron_summary.py --short  # Short summary (for 08:00)

Outputs markdown text for Telegram.
"""

import json
import sys
import urllib.request
from collections import defaultdict
from datetime import datetime, timedelta

API_URL = "https://script.google.com/macros/s/AKfycbxt_PxWtxdWkd3Exufy070oJkyAgegfpAeD296hEkytdBNPo_yA0Dc0HEDcKkNpiAgC/exec?api=1"
TARGET = 15  # cars/day target

THAI_DAYS = {
    0: "จันทร์", 1: "อังคาร", 2: "พุธ", 3: "พฤหัสบดี",
    4: "ศุกร์", 5: "เสาร์", 6: "อาทิตย์"
}

THAI_MONTHS = {
    1: "ม.ค.", 2: "ก.พ.", 3: "มี.ค.", 4: "เม.ย.",
    5: "พ.ค.", 6: "มิ.ย.", 7: "ก.ค.", 8: "ส.ค.",
    9: "ก.ย.", 10: "ต.ค.", 11: "พ.ย.", 12: "ธ.ค."
}

SHORT_MODE = "--short" in sys.argv

def fetch_data():
    req = urllib.request.Request(API_URL)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())

def thai_date_short(dt):
    """Format date as: วันศุกร์ (09/05/2569)"""
    day_name = THAI_DAYS[dt.weekday()]
    by = dt.year + 543
    return f"วัน{day_name} ({dt.strftime('%d')}/{dt.strftime('%m')}/{by})"

def thai_month(year, month):
    """Format as: พ.ค. 2569"""
    return f"{THAI_MONTHS[month]} {year + 543}"

def parse_tech(val):
    """Parse 'กร-4423 จบ_นก' → (plate, tech_short, tech_full)"""
    if not val or not val.strip():
        return None
    val = val.strip()
    parts = val.split()
    plate = parts[0] if parts else val
    tech_info = parts[1] if len(parts) > 1 else ""
    short_tech = tech_info.split("_")[0] if "_" in tech_info else tech_info
    full_tech = tech_info.split("_")[1] if "_" in tech_info else tech_info
    return plate, short_tech, full_tech

def get_entries_for_date(section, date_str):
    """Get all entries for a specific date from section entries."""
    results = []
    for entry_row in section.get("entries", []):
        for cell in entry_row.get("cells", []):
            if cell.get("dt") == date_str and cell.get("val"):
                parsed = parse_tech(cell["val"])
                if parsed:
                    results.append(parsed)
    return results

def get_monthly_count(section, year, month):
    """Count total entries for a given month in a section, grouped by tech."""
    prefix = f"{year}-{str(month).zfill(2)}"
    tech_counts = defaultdict(int)
    no_tech = 0
    total = 0
    for entry_row in section.get("entries", []):
        for cell in entry_row.get("cells", []):
            dt = cell.get("dt", "")
            val = cell.get("val", "")
            if dt.startswith(prefix) and val:
                parsed = parse_tech(val)
                if parsed:
                    total += 1
                    _, _, full_tech = parsed
                    if full_tech and full_tech.strip():
                        tech_counts[full_tech] += 1
                    else:
                        no_tech += 1
    # Merge unnamed into "ไม่ระบุช่าง"
    result = dict(tech_counts)
    if no_tech > 0:
        result["ไม่ระบุ"] = no_tech
    return total, result

def group_by_tech(entries):
    """Group entries by technician short name."""
    groups = defaultdict(list)
    for plate, short, full in entries:
        groups[full].append(plate)
    return groups

def diff_str(count, target=TARGET):
    diff = count - target
    sign = "+" if diff > 0 else ""
    return f"{sign}{diff}"

def main():
    data = fetch_data()
    today = datetime.now()
    tomorrow = today + timedelta(days=1)
    today_str = today.strftime("%d/%m/") + str(today.year + 543)
    
    # Sections: (key, icon, name, reference_date, label_for_short)
    sections_config = [
        ("c11", "📅", "นัดหมายเข้าซ่อม", tomorrow, "นัดซ่อมพรุ่งนี้"),
        ("c12", "🚗", "รับรถเข้าซ่อมจริง", today, "รับรถวันนี้"),
        ("c13", "🔧", "นัดหมายช่าง", tomorrow, "นัดช่างพรุ่งนี้"),
        ("c15a", "✅", "ส่งมอบรถจริง", today, "ส่งมอบวันนี้"),
    ]
    
    section_lookup = {s["key"]: s for s in data["sections"]}
    
    # Collect all data first
    section_data = []
    for key, icon, name, ref_date, short_label in sections_config:
        sec = section_lookup.get(key)
        if not sec:
            section_data.append(None)
            continue
        date_str = ref_date.strftime("%Y-%m-%d")
        entries = get_entries_for_date(sec, date_str)
        groups = group_by_tech(entries)
        section_data.append({
            "icon": icon, "name": name, "ref_date": ref_date,
            "short_label": short_label, "entries": entries,
            "groups": groups, "count": len(entries),
            "key": key
        })

    # Calculate monthly totals
    cur_year = today.year
    cur_month = today.month
    monthly_data = []
    for key, icon, name, ref_date, short_label in sections_config:
        sec = section_lookup.get(key)
        if not sec:
            monthly_data.append(None)
            continue
        total, tech_counts = get_monthly_count(sec, cur_year, cur_month)
        # Work days = days in month that have data
        prefix = f"{cur_year}-{str(cur_month).zfill(2)}"
        days_with_data = set()
        for entry_row in sec.get("entries", []):
            for cell in entry_row.get("cells", []):
                dt = cell.get("dt", "")
                if dt.startswith(prefix) and cell.get("val"):
                    days_with_data.add(dt)
        monthly_data.append({
            "key": key, "icon": icon, "short_label": short_label,
            "total": total, "tech_counts": tech_counts,
            "days_with_data": len(days_with_data)
        })

    month_label = thai_month(cur_year, cur_month)

    if SHORT_MODE:
        # === SHORT SUMMARY (08:00) ===
        lines = [f"⚡ **สรุปสั้นปฏิทินงานซ่อม** | {thai_date_short(today)}", ""]
        for sd in section_data:
            if not sd:
                continue
            count = sd["count"]
            ds = diff_str(count)
            if count == 0:
                lines.append(f"{sd['icon']} {sd['short_label']} {thai_date_short(sd['ref_date'])}: — ไม่มี — ({ds})")
            else:
                tech_counts = ", ".join(f"{t}:{len(p)}" for t, p in sd["groups"].items())
                status = f"ต่ำกว่าเป้า {ds}" if count < TARGET else ("✓ ตรงเป้า" if count == TARGET else f"เกินเป้า {ds}")
                lines.append(f"{sd['icon']} {sd['short_label']} {thai_date_short(sd['ref_date'])}: **{count}** คัน [{tech_counts}] ({status})")
        lines.append("")
        lines.append(f"🎯 เป้า: {TARGET} คัน/วัน")
        
        # Monthly totals section
        lines.append("")
        lines.append(f"📈 **ยอดสะสม {month_label}**")
        for md in monthly_data:
            if not md:
                continue
            if md["total"] == 0:
                lines.append(f"  {md['icon']} {md['short_label']}: — ไม่มี —")
            else:
                tech_str = ", ".join(f"{t}:{c}" for t, c in sorted(md["tech_counts"].items(), key=lambda x: -x[1]))
                days_info = f" ({md['days_with_data']} วัน)" if md["days_with_data"] > 0 else ""
                lines.append(f"  {md['icon']} {md['short_label']}: **{md['total']}** คัน{days_info} [{tech_str}]")
        print("\n".join(lines))
    else:
        # === FULL SUMMARY (10:00) ===
        lines = [f"📋 **สรุปปฏิทินงานซ่อม** ประจำวันที่ {today_str}",
                 "━━━━━━━━━━━━━━━━━━━━━━━━━━", ""]
        
        for sd in section_data:
            if not sd:
                continue
            count = sd["count"]
            ds = diff_str(count)
            
            lines.append(f"{sd['icon']} {sd['name']} {thai_date_short(sd['ref_date'])}")
            lines.append(f"🎯 เป้า: {TARGET} คัน/วัน")
            if count > 0:
                for tech, plates in sd["groups"].items():
                    lines.append(f"  ▸ {tech} ({len(plates)}): {', '.join(plates)}")
            
            if count < TARGET:
                lines.append(f"  📊 รวม {count} คัน (ต่ำกว่าเป้า {ds} คัน)")
            elif count > TARGET:
                lines.append(f"  📊 รวม {count} คัน (เกินเป้า {ds} คัน)")
            else:
                lines.append(f"  📊 รวม {count} คัน ✓ ตรงเป้า")
            lines.append("")
        
        lines.append("━━━━━━━━━━━━━━━━━━━━━━━━━━")
        lines.append(f"🎯 เป้าหมาย: {TARGET} คัน/วัน")
        print("\n".join(lines))

if __name__ == "__main__":
    main()