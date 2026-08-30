#!/usr/bin/env bash
#
# Install (or remove) a macOS LaunchAgent that runs the backup pull regularly.
#
#   ./scripts/install-backup-pull-agent.sh            # install
#   ./scripts/install-backup-pull-agent.sh --uninstall
#
# **Why launchd and not cron.** A laptop is asleep at 03:00. `cron` on macOS simply skips a run
# whose time passed while the machine was asleep — it never catches up, and it says nothing. So a
# machine closed overnight would silently take no backup at all, which is the exact failure this
# whole change exists to prevent, dressed as a working schedule.
#
# `StartInterval` is measured against elapsed time rather than a wall-clock instant, so a missed
# window fires once shortly after wake. Hourly rather than daily for the same reason: the shorter
# the interval, the smaller the gap between the machine coming online and a copy existing.
#
# ⚠️ The pull is a catch-up by construction — it fetches every blob it does not already hold — so
# a laptop off for five days pulls five dumps on its next run. Nothing needs to remember which
# days were missed; "what is in Azure but not here" answers that on every run.

set -Eeuo pipefail

LABEL="org.jnanaprabodhini.veervrat.backup-pull"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$REPO/scripts/pull-backups.sh"
LOG_DIR="$HOME/Library/Logs/veervrat"
INTERVAL_SECONDS="${VEERVRAT_PULL_INTERVAL_SECONDS:-3600}"

die() { echo "FATAL: $*" >&2; exit 1; }

if [ "${1:-}" = "--uninstall" ]; then
  launchctl bootout "gui/$(id -u)/${LABEL}" 2>/dev/null || true
  rm -f "$PLIST"
  echo "removed ${LABEL}"
  exit 0
fi

[ "$(uname)" = "Darwin" ] || die "this installs a macOS LaunchAgent; on Linux use a systemd timer with Persistent=true, which catches up the same way"
[ -x "$SCRIPT" ] || die "not found or not executable: $SCRIPT"

mkdir -p "$HOME/Library/LaunchAgents" "$LOG_DIR"

cat > "$PLIST" <<PLIST_END
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>

  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>-lc</string>
    <string>${SCRIPT}</string>
  </array>

  <!-- Elapsed time, not a wall-clock instant: a window missed while asleep fires shortly
       after wake, which cron does not do. -->
  <key>StartInterval</key>
  <integer>${INTERVAL_SECONDS}</integer>

  <!-- Also run once at load, so installing this does not mean waiting an hour to find out
       whether it works. -->
  <key>RunAtLoad</key>
  <true/>

  <key>StandardOutPath</key>
  <string>${LOG_DIR}/backup-pull.log</string>
  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/backup-pull.log</string>

  <key>ProcessType</key>
  <string>Background</string>
</dict>
</plist>
PLIST_END

plutil -lint "$PLIST" >/dev/null || die "generated plist is malformed"

launchctl bootout "gui/$(id -u)/${LABEL}" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"

echo "installed ${LABEL}"
echo "  runs:  ${SCRIPT}"
echo "  every: ${INTERVAL_SECONDS}s, and once now"
echo "  log:   ${LOG_DIR}/backup-pull.log"
echo ""
echo "  check it:    launchctl list | grep veervrat"
echo "  check state: ${REPO}/scripts/pull-backups.sh --status"
echo ""
echo "⚠️  This machine holds the only copy outside Azure. If it is lost, so is that copy —"
echo "    an interim, recorded as one in openspec/changes/offsite-backup, to revisit before go-live."
