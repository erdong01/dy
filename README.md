# dy

cd /var/go/src/dy
git pul
go build -o ./release main.go

docker restart dy

docker build  -t app .

docker run -it -dp 9090:9191 --name dy -v ./etc:/app/etc -v ./release:/app --restart unless-stopped app 




 

去除插播
缓存资源文件,去除特征段ts,然后保存输出