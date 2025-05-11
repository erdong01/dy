FROM ubuntu:24.04

WORKDIR /app

VOLUME ["/app/etc"]
VOLUME ["/app"]

ENTRYPOINT ["/app/main"]