#!/usr/bin/env python3
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

# Try Markdown first (bold ** renders); if entity parsing fails (e.g. stray
# unmatched _ or * in data), resend the exact same text in plain mode.
body, err = send(message, 'Markdown')
if body is None and err[0] == 400 and "can't parse entities" in err[1]:
    body, err = send(message, None)

if body is None:
    print(f"Telegram send FAILED: HTTP {err[0]} {err[1]}", file=sys.stderr)
    sys.exit(1)
print(body)
