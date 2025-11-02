#!/bin/bash

ports=("$@")  # Take ports from CLI arguments

if [ ${#ports[@]} -eq 0 ]; then
    echo "No ports provided."
    exit 1
fi

for port in "${ports[@]}"; do
    echo "Checking port: $port"
    pids=$(lsof -ti:$port)

    if [ -z "$pids" ]; then
        echo "No process is using port $port."
        continue
    fi

    num_pids=$(wc -w <<< "$pids")
    (( num_pids > 1 )) && processVerb="processes" || processVerb="process"

    echo "Killing $processVerb on port $port: $pids"
    echo "$pids" | xargs kill -9
    echo "Done."
done

