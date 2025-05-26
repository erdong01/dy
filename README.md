# dy
docker restart dy

go build -o ./release main.go

docker build  -t app .

docker run -it -dp 9090:9090 --name dy -v ./etc:/app/etc -v ./release:/app app 