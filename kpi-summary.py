#!/usr/bin/env python3
import json,subprocess,sys
from datetime import datetime

r=subprocess.run(["curl","-sL","https://script.google.com/macros/s/AKfycbxFajI-o9bO239QcVUCHwWMCMa0hliahrh683rfUel3eetbGgU4ysHukfmdxWHnah-M4w/exec?api=1","--max-time","30"],capture_output=True,text=True)
d=json.loads(r.stdout)

idx=0
for i in range(len(d["bct"]["bct"])-1,-1,-1):
  if d["bct"]["bct"][i]["ac"]>0:
    idx=i
    break

b=d["bct"]["bct"][idx]
f=d["fin"]["fin"][idx]
today=datetime.now()

def th_money(v):
  if v>=1e6: return f"{v/1e6:.2f}ล้าน"
  if v>=1e5: return f"{v/1e5:.2f}แสน"
  if v>=1e4: return f"{v/1e4:.2f}หมื่น"
  if v>=1e3: return f"{v/1e3:.1f}พัน"
  return str(int(v))

def th_money_short(v):
  if v>=1e6: return f"{v/1e6:.1f}ล."
  if v>=1e5: return f"{v/1e5:.1f}ส."
  if v>=1e4: return f"{v/1e4:.1f}ม."
  if v>=1e3: return f"{v/1e3:.1f}พ."
  return str(int(v))

month_names=["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."]

lines=[]
lines.append("📊 PMG War Room")
lines.append(f"🗓 วันนี้ {today.day} {month_names[today.month-1]} {today.year+543} | ข้อมูลเดือน {month_names[idx]}")
lines.append("")
lines.append("━━ 🚗 ปิดได้/ส่งมอบ ━━")
pct_ac=b["ac"]/b["tc"]*100 if b["tc"] else 0
pct_ad=b["ad"]/b["td"]*100 if b["td"] else 0
pct_cash=b["cashA"]/b["cashT"]*100 if b["cashT"] else 0
lines.append(f'ปิดได้: เป้า {b["tc"]} / ทำได้ {b["ac"]} = {pct_ac:.1f}% ⚠️')
lines.append(f'ส่งมอบ: เป้า {b["td"]} / ทำได้ {b["ad"]} = {pct_ad:.1f}% ⚠️')
lines.append(f'🚛 อีซูซุ: {b["isz"]} คัน')
car=b["ad"]-b["isz"]-(b.get("sdn",0))-(b.get("big",0))
lines.append(f'🚙 รถเก๋ง: {car} คัน')
lines.append(f'🛻 กระบะต่างยี่ห้อ: {b.get("sdn",0)} คัน')
lines.append(f'💵 เงินสด: {b["cashA"]}/{b["cashT"]} = {pct_cash:.1f}% ⚠️')

lines.append("")
lines.append("━━ 🔧 รับรถเข้าซ่อม ━━")
sa_data=d["sa"]["detail"]["monthly"][idx]["data"]
recv=sa_data.get("การรับลูกค้า (จำนวนคัน)",{})
total_recv=sum(recv.values())
lines.append(f"รวม {total_recv} คัน")
sorted_recv=sorted(recv.items(),key=lambda x:-x[1])
for i,(name,val) in enumerate(sorted_recv,1):
  if val>0:
    lines.append(f"{i}️⃣ {name} {val} คัน")

lines.append("")
lines.append("━━ 💰 การเงิน ━━")
pct_r=f["rA"]/f["rT"]*100 if f["rT"] else 0
lines.append(f'รายได้: {th_money(f["rA"])} / เป้า {th_money(f["rT"])} = {pct_r:.1f}% ⚠️')
lines.append(f'🔧 ค่าแรง: {th_money(f["sal"])}บาท')
lines.append(f'🔩 ค่าอะไหล่: {th_money(f["pts"])}บาท')
lines.append(f'📈 กำไรขั้นต้น: {th_money(f["gm"])}บาท')
labor_per=round(f["sal"]/b["ac"]) if b["ac"] else 0
parts_per=round(f["pts"]/b["ac"]) if b["ac"] else 0
lines.append(f'👷 ค่าแรง/คัน: {labor_per:,} | ค่าอะไหล่/คัน: {parts_per:,}')

lines.append("")
lines.append("━━ 📍 ช่องทาง ━━")
ch_data=d["ch"]["ch"]
important_names=set(["ทีม AI","MR กู้ภัย","BYD","ตรวจเช็คคุณภาพสี"])
ranked=[]
for i,c in enumerate(ch_data):
  val=c["monthly"][idx] if idx<len(c["monthly"]) else 0
  ranked.append((i+1,c["name"],val))
ranked.sort(key=lambda x:-x[2])

shown_important=set()
for rank,(orig_idx,name,val) in enumerate(ranked,1):
  star="⭐" if name in important_names else ""
  if val>0 or name in important_names:
    lines.append(f"{rank}. {name}: {val}{star}")
    if name in important_names:
      shown_important.add(name)

missing=[n for n in important_names if n not in shown_important]
if missing:
  for name in missing:
    for orig_idx,nm,val in [(i+1,c["name"],c["monthly"][idx] if idx<len(c["monthly"]) else 0) for i,c in enumerate(ch_data)]:
      if nm==name:
        lines.append(f"{orig_idx}. {name}: 0⭐")
        break

lines.append("")
lines.append("━━ 📢 เชียร์เคลม GM ━━")
sc_names=d["sc"]["saNames"]
sc_monthly=d["sc"]["saMonthly"]
sc_ranked=list(zip(sc_names,[sc_monthly[j][idx] if idx<len(sc_monthly[j]) else 0 for j in range(len(sc_names))]))
sc_ranked.sort(key=lambda x:-x[1])
for i,(name,val) in enumerate(sc_ranked,1):
  if val>0:
    lines.append(f"{i}️⃣ {name} {th_money(val)}บาท")

lines.append("")
lines.append("━━ 🔧 ผลิตภัณฑ์เสริม ━━")
supp=d["supp"]["saMonthly"][idx]
s_pct=supp["achieved"]/supp["target"]*100 if supp["target"] else 0
lines.append(f'เป้า: {supp["target"]:,} ทำได้: {supp["achieved"]:,.1f} = {s_pct:.1f}% ⚠️')
prodGM=d["supp"]["prodGMMonthly"][idx]["byProduct"]
for pname,gm in sorted(prodGM.items(),key=lambda x:-x[1]):
  if gm>0:
    lines.append(f"  {pname}: {th_money(gm)}บาท")

lines.append("")
lines.append("━━ 🚨 ประกันภัย ━━")
ins_ranked=sorted(d["ins"]["ins"],key=lambda x:-x["total"])
for i,ins in enumerate(ins_ranked,1):
  if ins["total"]>0 and i<=10:
    lines.append(f"{i}. {ins['name']}: {ins['total']} ({ins['pct']:.1f}%)")

lines.append("")
lines.append("━━ 📈 rpC/spC ━━")
cf=d["fin"]["fin"][idx]
prev_idx=idx-1 if idx>0 else 0
pf=d["fin"]["fin"][prev_idx]
rpc_now=cf["sal"]/cf["pts"] if cf["pts"] else 0
rpc_prev=pf["sal"]/pf["pts"] if pf["pts"] else 0
spc_now=cf["pts"]/cf["sal"] if cf["sal"] else 0
spc_prev=pf["pts"]/pf["sal"] if pf["sal"] else 0
lines.append(f'rpC: {"📈ขึ้น=ดี" if rpc_now>=rpc_prev else "📉ลด=ระวัง"}')
lines.append(f'spC: {"📈ขึ้น=ดี" if spc_now>=spc_prev else "📉ลด=ระวัง"}')

lines.append("")
lines.append("━━ 🏭 ส่งมอบรายคน ━━")
deliver=sa_data.get("การส่งมอบ (จำนวนคัน)",{})
deliver_labor=sa_data.get("การส่งมอบ (ค่าแรง/คัน)",{})
deliver_parts=sa_data.get("การส่งมอบ (ค่าอะไหล่/คัน)",{})
sorted_del=sorted(deliver.items(),key=lambda x:-x[1])
for i,(name,val) in enumerate(sorted_del,1):
  if val>0:
    labor_pp=round(deliver_labor.get(name,0))
    parts_pp=round(deliver_parts.get(name,0))
    lines.append(f"{i}. {name}: {val} คัน | แรง/คัน: {labor_pp:,} | อะไหล่/คัน: {parts_pp:,}")

print("\n".join(lines))