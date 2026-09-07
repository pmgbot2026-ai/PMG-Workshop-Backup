#!/usr/bin/env python3
import subprocess, sys

# Run the summary script
result = subprocess.run(
    [sys.executable, "/root/pmg-calendar/cron_summary.py", "--short"],
    capture_output=True, text=True
)

summary_output = result.stdout.strip()
if not summary_output:
    print("ERROR: No output from cron_summary.py")
    print(f"stderr: {result.stderr}")
    sys.exit(1)

print(f"Summary output:\n{summary_output}\n")

# Now send via send_telegram.py
send_result = subprocess.run(
    [sys.executable, "/root/pmg-calendar/send_telegram.py"],
    input=summary_output,
    capture_output=True, text=True
)

print(f"Telegram response: {send_result.stdout}")
if send_result.returncode != 0:
    print(f"Telegram stderr: {send_result.stderr}")
    sys.exit(1)

print("Done: Summary sent to Telegram group.")
