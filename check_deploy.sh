#!/bin/bash
# Check ALL PMG projects — auto redeploy if dead
# Runs via cron every hour

CLASP="/root/.nvm/versions/node/v22.22.1/bin/clasp"
PROJECT="/root/pmg-workshop-v3"
LOG="/var/log/pmg_deploy_check.log"

# Deployments to monitor
MAIN_ID="AKfycbyj3gdAaB0buDNR8L7Lsyd1kJWXgSldRh67P5dwvaXnx9MaGIBtqNYAdRgqurmgCZ-2FA"
WS_ID="AKfycbyHe7ZW-yBB5Xv6Mhn7oFuDmP3npwaRuZKNYhP3MGN8fqJZplAKiXcRFcFM7qlQkOwecA"
V2_ID="AKfycbzhkND_ISrEPqNHdvkZotPiwM_YMqMzC2t0BpCa54I4OHYpGRCMD7ifajSlkNb5BFfO"

MAIN_URL="https://script.google.com/macros/s/${MAIN_ID}/exec"
WS_URL="https://script.google.com/macros/s/${WS_ID}/exec"
V2_URL="https://script.google.com/macros/s/${V2_ID}/exec"

echo "$(date '+%Y-%m-%d %H:%M'): Checking all deployments..." >> "$LOG"

# Check function: returns HTTP code
check_url() {
  curl -s -o /dev/null -w "%{http_code}" "$1" 2>/dev/null
}

# Check all pages
GM=$(check_url "${MAIN_URL}?gm=1")
ENVR=$(check_url "${MAIN_URL}?envr=1")
OKR=$(check_url "${MAIN_URL}?okrall=1")
FIN=$(check_url "${MAIN_URL}?finance=1")
WS=$(check_url "${WS_URL}?workshop=1")
BILL=$(check_url "${MAIN_URL}?billing=1")
V2=$(check_url "${V2_URL}")

echo "$(date '+%H:%M'): GM=$GM ENVR=$ENVR OKR=$OKR FIN=$FIN BILL=$BILL WS=$WS V2=$V2" >> "$LOG"

NEEDS_REDEPLOY=0
DEAD_PAGES=""

if [ "$GM" != "200" ]; then NEEDS_REDEPLOY=1; DEAD_PAGES="$DEAD_PAGES GM"; fi
if [ "$ENVR" != "200" ]; then NEEDS_REDEPLOY=1; DEAD_PAGES="$DEAD_PAGES ENVR"; fi
if [ "$OKR" != "200" ]; then NEEDS_REDEPLOY=1; DEAD_PAGES="$DEAD_PAGES OKR"; fi
if [ "$FIN" != "200" ]; then NEEDS_REDEPLOY=1; DEAD_PAGES="$DEAD_PAGES Finance"; fi
if [ "$BILL" != "200" ]; then NEEDS_REDEPLOY=1; DEAD_PAGES="$DEAD_PAGES Billing"; fi
if [ "$WS" != "200" ]; then NEEDS_REDEPLOY=1; DEAD_PAGES="$DEAD_PAGES Workshop"; fi
if [ "$V2" != "200" ]; then NEEDS_REDEPLOY=1; DEAD_PAGES="$DEAD_PAGES V2"; fi

# Check systemd services
SERVICES_DEAD=""
journalctl -u car-insurance-app --no-pager -n 1 2>/dev/null | grep -q "Listening" || SERVICES_DEAD="$SERVICES_DEAD car-insurance"
journalctl -u cloudflared-car-insurance --no-pager -n 1 2>/dev/null | grep -q "tunnel" || SERVICES_DEAD="$SERVICES_DEAD cloudflared"

if [ -n "$SERVICES_DEAD" ]; then
    echo "$(date '+%H:%M'): Services down:$SERVICES_DEAD — restarting..." >> "$LOG"
    for svc in car-insurance-app cloudflared-car-insurance; do
        echo "$SERVICES_DEAD" | grep -q "$svc" && systemctl restart "$svc" 2>>"$LOG"
    done
fi

if [ "$NEEDS_REDEPLOY" = "1" ]; then
    echo "$(date '+%H:%M'): Dead pages:$DEAD_PAGES — redeploying..." >> "$LOG"
    cd "$PROJECT"
    $CLASP push 2>>"$LOG"
    $CLASP deploy --deploymentId "$MAIN_ID" 2>>"$LOG"
    $CLASP deploy --deploymentId "$WS_ID" 2>>"$LOG"
    
    # V2 is separate project
    cd /root/pmg-workshop-v2
    $CLASP deploy --deploymentId "$V2_ID" 2>>"$LOG"
    
    sleep 5
    # Verify
    GM2=$(check_url "${MAIN_URL}?gm=1")
    ENVR2=$(check_url "${MAIN_URL}?envr=1")
    WS2=$(check_url "${WS_URL}?workshop=1")
    V2_2=$(check_url "${V2_URL}")
    echo "$(date '+%H:%M'): After redeploy: GM=$GM2 ENVR=$ENVR2 WS=$WS2 V2=$V2_2" >> "$LOG"
    
    if [ "$GM2" != "200" ] || [ "$ENVR2" != "200" ] || [ "$WS2" != "200" ]; then
        echo "$(date '+%H:%M'): WARNING: Redeploy failed!" >> "$LOG"
        # Alert via Telegram
        TOKEN=$(grep TELEGRAM_BOT_TOKEN /root/.hermes/env 2>/dev/null | head -1 | cut -d= -f2 | tr -d '"' | tr -d "'")
        if [ -n "$TOKEN" ]; then
            curl -s -X POST "https://api.telegram.org/bot${TOKEN}/sendMessage" \
                -d "chat_id=-5060108435" \
                -d "text=⚠️ PMG Dashboard redeploy FAILED! GM=$GM2 ENVR=$ENVR2 WS=$WS2 V2=$V2_2 — needs manual fix" 2>/dev/null
        fi
    else
        echo "$(date '+%H:%M'): Redeploy OK." >> "$LOG"
    fi
else
    echo "$(date '+%H:%M'): All OK." >> "$LOG"
fi