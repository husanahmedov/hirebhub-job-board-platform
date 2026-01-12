#!/bin/bash
# Kill process on port 8080
echo "🔍 Looking for process on port 8080..."
PID=$(lsof -ti:8080)

if [ -z "$PID" ]; then
  echo "✅ No process found on port 8080"
else
  echo "🔪 Killing process $PID..."
  kill -9 $PID
  echo "✅ Port 8080 is now free"
fi
