if [ "$1" = "main" ]; then
    docker compose run --rm main
elif [ "$1" = "jupyter" ]; then
    docker compose up jupyter
else
    docker compose run --rm main python "$1"
fi
