#!/usr/bin/env python3
import json, urllib.request, sys

token_path = '/root/.hermes/telegram_bot_token'
with open(token_path) as f:
    token = f.read().strip()

chat_id = '-5060108435'

if len(sys.argv) > 1:
    message = sys.argv[1]
else:
    message = sys.stdin.read()

url = f'https://api.telegram.org/bot{token}/sendMessage'
payload = json.dumps({'chat_id': chat_id, 'text': message, 'parse_mode': 'Markdown'}).encode()
req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'})
resp = urllib.request.urlopen(req)
print(resp.read().decode())
