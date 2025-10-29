# dy

cd /var/go/src/dy

go build -o ./release main.go

docker restart dy

docker build  -t app .

docker run -it -dp 9090:9191 --name dy -v ./etc:/app/etc -v ./release:/app --restart unless-stopped app 