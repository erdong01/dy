FROM ubuntu:24.04

WORKDIR /app

VOLUME ["./etc","/app/etc"]
VOLUME ["./release","/app"]

ENTRYPOINT ["/app/main"]