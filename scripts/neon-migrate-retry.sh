#!/bin/bash
# Retry wrapper for Neon database migrations
# Neon serverless compute can take time to wake from suspension

MAX_RETRIES=3
RETRY_DELAY=5

for i in $(seq 1 $MAX_RETRIES); do
  echo "Migration attempt $i of $MAX_RETRIES..."
  npx prisma migrate deploy
  EXIT_CODE=$?
  
  if [ $EXIT_CODE -eq 0 ]; then
    echo "Migration succeeded on attempt $i"
    exit 0
  fi
  
  if [ $i -lt $MAX_RETRIES ]; then
    echo "Migration failed (exit code $EXIT_CODE). Retrying in ${RETRY_DELAY}s..."
    sleep $RETRY_DELAY
    RETRY_DELAY=$((RETRY_DELAY * 2))
  fi
done

echo "Migration failed after $MAX_RETRIES attempts"
exit 1
