#!/bin/bash

# Start Ollama in the background.
/bin/ollama serve &

# Record Process ID.
pid=$!

# Wait for Ollama service to start.
sleep 5

echo "🔴 Retrieving model gemma2:9b..."
ollama pull gemma2:9b

# Wait for Ollama process to finish.
wait $pid
