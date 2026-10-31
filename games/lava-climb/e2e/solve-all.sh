#!/bin/sh
# Solves levels in parallel: sh e2e/solve-all.sh [log file] [level numbers...]
log=${1:-/dev/stdout}; shift
[ $# -gt 0 ] || set -- $(seq 1 24)
printf '%s\n' "$@" | xargs -P 8 -I{} sh -c "node e2e/solve.mjs {} 2>&1 | cut -c1-170 >> $log"
