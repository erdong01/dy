# dy

cd /var/go/src/dy
git pull
go build -o ./release main.go

docker restart dy

docker build  -t app .

docker run -it -dp 9090:9191 --name dy -v ./etc:/app/etc -v ./release:/app --restart unless-stopped app 




 

去除插播
缓存资源文件,去除特征段ts,然后保存输出

context7 key:ctx7sk-96f27a93-d311-49d8-92ab-f384f22d73ab