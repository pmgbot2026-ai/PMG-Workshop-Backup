#!/usr/bin/env python3
"""PMG Calendar Daily Summary — สรุปปฏิทินงานซ่อมประจำวัน"""
import json, urllib.request
from datetime import datetime, timedelta
from collections import defaultdict

API_URL = "https://script.google.com/macros/s/AKfycbxt_PxWtxdWkd3Exufy070oJkyAgegfpAeD296hEkytdBNPo_yA0Dc0HEDcKkNpiAgC/exec?api=1"
TARGET_PER_DAY = 15  # เป้าหมายต่อวัน

def bangkok_now():
    return datetime.utcnow() + timedelta(hours=7)

def thai_date(dt):
    return f"{dt.day:02d}/{dt.month:02d}/{dt.year + 543}"

def thai_day_name(dt):
    # Python weekday(): 0=Monday, 1=Tuesday, ..., 6=Sunday
    days = ['จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์','อาทิตย์']
    return days[dt.weekday()]

def fetch_data():
    req = urllib.request.Request(API_URL)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())

def parse_cell(val):
    """Parse 'กบ-9771 จบ_บอม_SUP1' → {plate, mechanic, sup}"""
    parts = val.strip().split('_')
    plate_mech = parts[0].strip()
    sup = ''
    mechanic = ''
    if len(parts) >= 2:
        mechanic = parts[1].strip()
    if len(parts) >= 3:
        sup = parts[2].strip()
    pm = plate_mech.split(' ', 1)
    plate = pm[0]
    # mechanic already extracted from parts[1]
    # But if no underscore, the mechanic might be after space in parts[0]
    if not mechanic and len(pm) > 1:
        mechanic = pm[1].strip()
    return {'plate': plate, 'mechanic': mechanic, 'sup': sup}

def is_valid_plate(plate):
    """Filter out summary/total rows that aren't real license plates."""
    if not plate or not isinstance(plate, str):
        return False
    plate = plate.strip()
    if len(plate) <= 3:
        return False
    import re
    if re.match(r'^[\d]+$', plate):
        return False
    return True

def filter_by_date(section, target_date):
    results = []
    if not section or not section.get('entries'):
        return results
    for entry in section['entries']:
        if not entry.get('row') or not isinstance(entry['row'], (int, float)):
            continue
        for cell in entry['cells']:
            if cell['dt'] == target_date:
                parsed = parse_cell(cell['val'])
                if not is_valid_plate(parsed['plate']):
                    continue
                parsed['row'] = entry['row']
                results.append(parsed)
    return results

def group_by_mechanic(items):
    groups = defaultdict(list)
    for item in items:
        key = item['mechanic'] if item['mechanic'] else 'ไม่ระบุ'
        groups[key].append(item)
    return dict(sorted(groups.items(), key=lambda x: len(x[1]), reverse=True))

def format_diff(actual, target):
    """Show difference from target."""
    diff = actual - target
    if diff > 0:
        return f" (เกินเป้า **+{diff}** คัน)"
    elif diff < 0:
        return f" (ต่ำกว่าเป้า **{diff}** คัน)"
    else:
        return f" (ตรงเป้า ✅)"

def main():
    now = bangkok_now()
    today = now.strftime('%Y-%m-%d')
    tomorrow_date = now + timedelta(days=1)
    yesterday_date = now - timedelta(days=1)
    tomorrow = tomorrow_date.strftime('%Y-%m-%d')
    yesterday = yesterday_date.strftime('%Y-%m-%d')
    
    today_thai = thai_date(now)
    tomorrow_thai = thai_date(tomorrow_date)
    yesterday_thai = thai_date(yesterday_date)
    tomorrow_day = thai_day_name(tomorrow_date)
    yesterday_day = thai_day_name(yesterday_date)
    
    try:
        data = fetch_data()
    except Exception as e:
        print(f"❌ ดึงข้อมูลไม่สำเร็จ: {e}")
        return
    
    sections = {s['key']: s for s in data.get('sections', [])}
    
    lines = []
    lines.append(f"📋 **สรุปปฏิทินงานซ่อม ประจำวันที่ {today_thai}**")
    lines.append(f"━━━━━━━━━━━━━━━━━━━━━━━━━━")
    
    # 1. นัดหมายเข้าซ่อม (tomorrow)
    s = sections.get('c11', {})
    items = filter_by_date(s, tomorrow)
    lines.append(f"\n📅 **นัดหมายเข้าซ่อม** วัน{tomorrow_day} ({tomorrow_thai})")
    lines.append(f"🎯 เป้า: {TARGET_PER_DAY} คัน/วัน")
    if items:
        groups = group_by_mechanic(items)
        for mech, cars in groups.items():
            plates = ', '.join([f"`{c['plate']}`" for c in cars])
            lines.append(f"  ▸ **{mech}** ({len(cars)}): {plates}")
        diff_txt = format_diff(len(items), TARGET_PER_DAY)
        lines.append(f"  📊 รวม **{len(items)}** คัน{diff_txt}")
    else:
        diff_txt = format_diff(0, TARGET_PER_DAY)
        lines.append(f"  — ไม่มีข้อมูล —{diff_txt}")
    
    # 2. รับรถเข้าซ่อมจริง (yesterday)
    s = sections.get('c12', {})
    items = filter_by_date(s, yesterday)
    lines.append(f"\n🚗 **รับรถเข้าซ่อมจริง** วัน{yesterday_day} ({yesterday_thai})")
    lines.append(f"🎯 เป้า: {TARGET_PER_DAY} คัน/วัน")
    if items:
        groups = group_by_mechanic(items)
        for mech, cars in groups.items():
            plates = ', '.join([f"`{c['plate']}`" for c in cars])
            lines.append(f"  ▸ **{mech}** ({len(cars)}): {plates}")
        diff_txt = format_diff(len(items), TARGET_PER_DAY)
        lines.append(f"  📊 รวม **{len(items)}** คัน{diff_txt}")
    else:
        diff_txt = format_diff(0, TARGET_PER_DAY)
        lines.append(f"  — ไม่มีข้อมูล —{diff_txt}")
    
    # 3. นัดหมายช่าง (tomorrow)
    s = sections.get('c13', {})
    items = filter_by_date(s, tomorrow)
    lines.append(f"\n🔧 **นัดหมายช่าง** วัน{tomorrow_day} ({tomorrow_thai})")
    lines.append(f"🎯 เป้า: {TARGET_PER_DAY} คัน/วัน")
    if items:
        groups = group_by_mechanic(items)
        for mech, cars in groups.items():
            plates = ', '.join([f"`{c['plate']}`" for c in cars])
            lines.append(f"  ▸ **{mech}** ({len(cars)}): {plates}")
        diff_txt = format_diff(len(items), TARGET_PER_DAY)
        lines.append(f"  📊 รวม **{len(items)}** คัน{diff_txt}")
    else:
        diff_txt = format_diff(0, TARGET_PER_DAY)
        lines.append(f"  — ไม่มีข้อมูล —{diff_txt}")
    
    # 4. ส่งมอบรถจริง (yesterday)
    s = sections.get('c15a', {})
    items = filter_by_date(s, yesterday)
    lines.append(f"\n✅ **ส่งมอบรถจริง** วัน{yesterday_day} ({yesterday_thai})")
    lines.append(f"🎯 เป้า: {TARGET_PER_DAY} คัน/วัน")
    if items:
        groups = group_by_mechanic(items)
        for mech, cars in groups.items():
            plates = ', '.join([f"`{c['plate']}`" for c in cars])
            lines.append(f"  ▸ **{mech}** ({len(cars)}): {plates}")
        diff_txt = format_diff(len(items), TARGET_PER_DAY)
        lines.append(f"  📊 รวม **{len(items)}** คัน{diff_txt}")
    else:
        diff_txt = format_diff(0, TARGET_PER_DAY)
        lines.append(f"  — ไม่มีข้อมูล —{diff_txt}")
    
    # 5. นัดส่งมอบแล้วยังไม่ส่งมอบจริง (overdue)
    s14 = sections.get('c14', {})
    s15a = sections.get('c15a', {})
    lines.append(f"\n⚠️ **นัดส่งมอบแล้ว ยังไม่ได้ส่งมอบจริง** (ถึงวันที่ {today_thai})")
    
    # Build appointment data per plate (past appointments only)
    appoint_map = defaultdict(list)
    for entry in s14.get('entries', []):
        if not entry.get('row') or not isinstance(entry['row'], (int, float)):
            continue
        for cell in entry['cells']:
            if cell['dt'] < today:
                parsed = parse_cell(cell['val'])
                if not is_valid_plate(parsed['plate']):
                    continue
                appoint_map[parsed['plate']].append({
                    'date': cell['dt'],
                    'mechanic': parsed['mechanic'],
                    'sup': parsed['sup']
                })
    
    # Build actual deliveries per plate
    delivery_set = defaultdict(set)
    for entry in s15a.get('entries', []):
        if not entry.get('row') or not isinstance(entry['row'], (int, float)):
            continue
        for cell in entry['cells']:
            parsed = parse_cell(cell['val'])
            if is_valid_plate(parsed['plate']):
                delivery_set[parsed['plate']].add(cell['dt'])
    
    overdue = []
    for plate, appointments in appoint_map.items():
        for appt in appointments:
            delivered = any(d >= appt['date'] for d in delivery_set.get(plate, set()))
            if not delivered:
                days = (now.date() - datetime.strptime(appt['date'], '%Y-%m-%d').date()).days
                overdue.append({
                    'plate': plate,
                    'appointDate': appt['date'],
                    'mechanic': appt['mechanic'],
                    'sup': appt['sup'],
                    'days': days
                })
    
    # Keep earliest appointment per plate
    seen = {}
    for o in sorted(overdue, key=lambda x: (x['plate'], x['appointDate'])):
        if o['plate'] not in seen:
            seen[o['plate']] = o
    
    if seen:
        overdue_sorted = sorted(seen.values(), key=lambda x: x['days'], reverse=True)
        for o in overdue_sorted:
            a_day = int(o['appointDate'][8:10])
            a_month = int(o['appointDate'][5:7])
            a_year = int(o['appointDate'][:4]) + 543
            sup_tag = f" ({o['sup']})" if o['sup'] else ""
            mech_tag = f" **{o['mechanic']}**" if o['mechanic'] else ""
            lines.append(f"  🔴 `{o['plate']}`{mech_tag}{sup_tag} นัด {a_day:02d}/{a_month:02d}/{a_year} เกิน **{o['days']}** วัน")
        lines.append(f"  📊 รวม **{len(seen)}** คัน")
    else:
        lines.append("  🟢 ทุกคันส่งมอบตรงเวลา!")
    
    print('\n'.join(lines))

if __name__ == '__main__':
    main()