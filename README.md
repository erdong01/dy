# dy

docker build  -t app .

docker run -it -dp 9090:9090 -v ./etc:/app/etc -v ./release:/app app 