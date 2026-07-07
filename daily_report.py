#!/usr/bin/env python3
"""
PMG Workshop Daily Report Generator
Fetches summary data from Workshop API and formats Telegram message in Thai.
Sends daily completion report by branch (CNB/CSK) and station.
Uses monthlySummary for month-to-date accumulated totals.
"""
import json, urllib.request, urllib.parse, sys, os
from datetime import datetime, timezone, timedelta

SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyjop6dXrouf8yW-cpabPpElcfuDhVPqoqqBmHBeqyFqsEivCKxgkRXdy7z6l_TqPT7/exec'
TZ_OFFSET = timedelta(hours=7)  # ICT (Bangkok)
CACHE_DIR = '/tmp'

STATIONS = ['เคาะ', 'โป๊ว', 'พ่น', 'ประกอบ', 'ขัดสี', 'ล้าง']
ICONS = {'เคาะ': '🔨', 'โป๊ว': '🧴', 'พ่น': '🎨', 'ประกอบ': '🔩', 'ขัดสี': '✨', 'ล้าง': '🚿'}

def fetch_data(period='daily'):
    """Fetch summary data from Workshop API with timeout."""
    params = f'?api=1&tab=summary&period={period}&_t={int(datetime.now().timestamp())}'
    url = SCRIPT_URL + params
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read().decode('utf-8'))
    # Cache data
    cache_file = os.path.join(CACHE_DIR, f'report_{period}.json')
    with open(cache_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)
    return data

def load_cached(period):
    """Load cached data if available."""
    cache_file = os.path.join(CACHE_DIR, f'report_{period}.json')
    if os.path.exists(cache_file):
        with open(cache_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None

def fmt_baht(amount):
    """Format baht with commas."""
    if amount >= 1000000:
        return f'{amount/1000000:,.1f}M'
    elif amount >= 1000:
        return f'{amount:,.0f}'
    elif amount == 0:
        return '0'
    else:
        return f'{amount:,.2f}'

def generate_report():
    """Generate the daily completion report."""
    try:
        daily = fetch_data('daily')
    except Exception as e:
        daily = load_cached('daily')
        if not daily:
            return f'❌ ดึงข้อมูลไม่สำเร็จ: {e}'

    # Determine report date
    bangkok_now = datetime.now(timezone.utc) + TZ_OFFSET
    yesterday_str = daily.get('yesterday', bangkok_now.strftime('%Y-%m-%d'))

    daily_comp = daily.get('completions', {}).get('summary', [])
    monthly_comp = daily.get('completions', {}).get('monthlySummary', [])
    daily_fc = daily.get('finalCheck', {}).get('daily', {})
    monthly_fc = daily.get('finalCheck', {}).get('monthly', {})
    daily_at_risk = daily.get('atRisk', {}).get('count', 0)
    reschedules = daily.get('reschedules', {}).get('count', 0)

    # If monthlySummary not available in daily response, try monthly period
    if not monthly_comp:
        try:
            monthly_data = fetch_data('monthly')
            monthly_comp = monthly_data.get('completions', {}).get('summary', [])
            monthly_fc = monthly_data.get('finalCheck', {}).get('monthly', {})
        except:
            pass

    # Create station lookup for monthly accumulated data
    monthly_lookup = {x['station']: x for x in monthly_comp}

    def get_monthly(branch, stn):
        """Get monthly accumulated count/wage for a branch+station."""
        m = monthly_lookup.get(stn, {})
        if not m:
            return 0, 0
        b = m.get(branch, {})
        return b.get('count', 0), b.get('wage', 0)

    lines = []
    lines.append('📊 รายงานงานแล้วเสร็จประจำวัน')
    lines.append(f'📅 {yesterday_str}')
    lines.append('━━━━━━━━━━━━━━━━━━━━━━')

    # ─── CNB มหาราช ───
    lines.append('')
    lines.append('🏢 CNB มหาราช')
    lines.append('─────────────────')

    cnb_daily_total = 0; cnb_daily_wage = 0
    cnb_monthly_total = 0; cnb_monthly_wage = 0

    for stn in STATIONS:
        icon = ICONS.get(stn, '📋')
        d = next((x for x in daily_comp if x['station'] == stn), None)
        dc = d['cnb']['count'] if d else 0
        dw = d['cnb']['wage'] if d else 0
        mc, mw = get_monthly('cnb', stn)
        cnb_daily_total += dc; cnb_daily_wage += dw
        cnb_monthly_total += mc; cnb_monthly_wage += mw
        if dc > 0:
            lines.append(f'{icon} {stn}: {dc} คัน ({fmt_baht(dw)} ฿) | สะสม {mc} คัน ({fmt_baht(mw)} ฿)')
        else:
            lines.append(f'{icon} {stn}: - | สะสม {mc} คัน ({fmt_baht(mw)} ฿)')

    lines.append('┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄')
    lines.append(f'💰 รวม: {cnb_daily_total} คัน ({fmt_baht(cnb_daily_wage)} ฿)')
    lines.append(f'📊 สะสมเดือน: {cnb_monthly_total} คัน ({fmt_baht(cnb_monthly_wage)} ฿)')

    # ─── CSK ───
    lines.append('')
    lines.append('🏢 CSK ซีเอสเค')
    lines.append('─────────────────')

    csk_daily_total = 0; csk_daily_wage = 0
    csk_monthly_total = 0; csk_monthly_wage = 0

    for stn in STATIONS:
        icon = ICONS.get(stn, '📋')
        d = next((x for x in daily_comp if x['station'] == stn), None)
        dc = d['csk']['count'] if d else 0
        dw = d['csk']['wage'] if d else 0
        mc, mw = get_monthly('csk', stn)
        csk_daily_total += dc; csk_daily_wage += dw
        csk_monthly_total += mc; csk_monthly_wage += mw
        if dc > 0:
            lines.append(f'{icon} {stn}: {dc} คัน ({fmt_baht(dw)} ฿) | สะสม {mc} คัน ({fmt_baht(mw)} ฿)')
        else:
            lines.append(f'{icon} {stn}: - | สะสม {mc} คัน ({fmt_baht(mw)} ฿)')

    lines.append('┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄')
    lines.append(f'💰 รวม: {csk_daily_total} คัน ({fmt_baht(csk_daily_wage)} ฿)')
    lines.append(f'📊 สะสมเดือน: {csk_monthly_total} คัน ({fmt_baht(csk_monthly_wage)} ฿)')

    # ─── รวมทั้ง 2 สาขา ───
    total_daily = cnb_daily_total + csk_daily_total
    total_daily_wage = cnb_daily_wage + csk_daily_wage
    total_monthly = cnb_monthly_total + csk_monthly_total
    total_monthly_wage = cnb_monthly_wage + csk_monthly_wage

    lines.append('')
    lines.append('━━━━━━━━━━━━━━━━━━━━━━')
    lines.append('🏢 รวมทั้ง 2 สาขา')
    lines.append(f'💰 วันนี้: {total_daily} คัน ({fmt_baht(total_daily_wage)} ฿)')
    lines.append(f'📊 สะสมเดือน: {total_monthly} คัน ({fmt_baht(total_monthly_wage)} ฿)')

    # ─── FinalCheck ───
    lines.append('')
    lines.append('✅ ตรวจ FinalCheck')
    lines.append('─────────────────')
    d_total = daily_fc.get('total', 0)
    d_pass = daily_fc.get('pass', 0)
    d_fail = daily_fc.get('fail', 0)
    d_pct = daily_fc.get('passPct', 0)
    m_total = monthly_fc.get('total', 0)
    m_pass = monthly_fc.get('pass', 0)
    m_pct = monthly_fc.get('passPct', 0)

    lines.append(f'วันนี้: ตรวจ {d_total} คัน | ผ่าน {d_pass} | ไม่ผ่าน {d_fail} ({d_pct}% ผ่าน)')
    lines.append(f'สะสมเดือน: ตรวจ {m_total} คัน | ผ่าน {m_pass} ({m_pct}% ผ่าน)')

    # ─── At Risk ───
    lines.append('')
    lines.append(f'⚠️ รถเสี่ยงล่าช้า: {daily_at_risk} คัน')
    lines.append(f'📋 นัดใหม่/เลื่อนนัด: {reschedules} คัน')

    # ─── Footer ───
    lines.append('')
    lines.append('━━━━━━━━━━━━━━━━━━━━━━')
    lines.append('🤖 PMG Workshop Auto Report')

    return '\n'.join(lines)

if __name__ == '__main__':
    report = generate_report()
    print(report)