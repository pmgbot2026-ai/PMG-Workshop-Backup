#!/usr/bin/env python3
# Send text to the PMG Telegram group as-is.
#
# PLAIN-TEXT ONLY as of 2026-11-14: the summary output contains literal
# '*' / '_' masking characters in plate numbers, which Telegram's Markdown
# parser silently consumed (and produced bogus italic entities) even though
# the API returned 200 ok. Markdown looked "nice" but was never a
# requirement — arrival as-is is. So we never set parse_mode.
#
# A legacy parse_mode fallback (Markdown -> plain on HTTP 400) is kept for
# backward compatibility only if PMG_PARSE_MODE env is explicitly set.
import json, urllib.request, urllib.error, sys, os

token_path = '/root/.hermes/telegram_bot_token'
with open(token_path) as f:
    token = f.read().strip()

chat_id = os.environ.get('TELEGRAM_CHAT_ID', '-5060108435')

if len(sys.argv) > 1:
    message = sys.argv[1]
else:
    message = sys.stdin.read()

def send(text, parse_mode=None):
    url = f'https://api.telegram.org/bot{token}/sendMessage'
    payload = {'chat_id': chat_id, 'text': text}
    if parse_mode:
        payload['parse_mode'] = parse_mode
    req = urllib.request.Request(url, data=json.dumps(payload).encode(),
                                 headers={'Content-Type': 'application/json'})
    try:
        resp = urllib.request.urlopen(req, timeout=60)
        return resp.read().decode(), None
    except urllib.error.HTTPError as e:
        return None, (e.code, e.read().decode())

parse_mode = os.environ.get('PMG_PARSE_MODE')  # None => plain text
body, err = send(message, parse_mode)
if body is None and parse_mode:
    body, err = send(message, None)

if body is None:
    print(f"Telegram send FAILED: HTTP {err[0]} {err[1]}", file=sys.stderr)
    sys.exit(1)
print(body)
