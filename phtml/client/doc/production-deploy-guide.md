<!-- English description: Production deployment guide for running the Nuxt client with the PHP backend, PHP-FPM, Nginx, and realtime services. -->

# Production Deploy Guide

## Mục tiêu

Chạy production theo mô hình chuẩn:

- PHP app ở repo root là backend source of truth.
- Nuxt app trong `client/` chạy SSR qua Node/Nitro.
- Nginx reverse proxy public domain vào Nuxt và PHP.
- PHP production dùng `php-fpm`, không dùng `php-cgi` watchdog.
- Realtime chạy bằng Node service riêng.

## Không Dùng Trên Prod

Không dùng các phần sau làm cơ chế production:

- `client/realtime/php-upstream-watchdog.mjs`
- `PHP_CGI_BIN`
- `PHP_INI_PATH`
- `PHP_UPSTREAM_PORTS`
- Windows `php-cgi.exe`

Các biến này chỉ dành cho local Windows/Laragon khi nginx cần upstream `9003/9004/...`.

## Yêu Cầu Server

- Linux server.
- Nginx.
- PHP-FPM đúng version backend yêu cầu.
- PHP extensions tối thiểu: `mysqli`, `curl`, `mbstring`, `openssl`, `json`, `gd` hoặc `imagick`, `zip`, `fileinfo`.
- MySQL/MariaDB.
- Node.js LTS.
- PM2 hoặc systemd để quản lý Node services.
- SSL certificate, ví dụ Let’s Encrypt.

## Biến Môi Trường Nuxt

Tạo `client/.env.production` hoặc inject qua PM2/systemd:

```env
NUXT_PUBLIC_API_BASE=/_api
NUXT_BACKEND_API_BASE=https://your-domain.com
NUXT_PUBLIC_BACKEND_WEB_BASE=https://your-domain.com
NUXT_BACKEND_SERVER_KEY=your_backend_server_key
NUXT_PUBLIC_SITE_URL=https://your-domain.com

NUXT_PUBLIC_REALTIME_URL=https://your-domain.com
REALTIME_INTERNAL_URL=http://127.0.0.1:3015
REALTIME_SECRET=change_this_to_a_long_random_secret
REALTIME_PORT=3015
```

Không commit file chứa secret thật.

## Build Nuxt

Từ thư mục `client/`:

```bash
pnpm install --frozen-lockfile
pnpm build
```

Output production nằm ở:

```text
client/.output/server/index.mjs
```

## PHP-FPM

Ví dụ PHP-FPM pool:

```ini
[vnseea]
user = www-data
group = www-data
listen = /run/php/vnseea.sock
listen.owner = www-data
listen.group = www-data
pm = dynamic
pm.max_children = 30
pm.start_servers = 6
pm.min_spare_servers = 4
pm.max_spare_servers = 10
```

Điều chỉnh `pm.max_children` theo RAM server và tải thực tế.

## Nginx Shape

Nginx nên route:

- `/_api/*` sang Nuxt SSR.
- `/_nuxt/*`, `/@vite/*` không dùng trong prod, assets do Nitro/Nginx xử lý tùy setup.
- `/api/*`, `/requests.php`, `/xhr/*`, PHP files sang PHP-FPM.
- Các route frontend còn lại sang Nuxt.

Ví dụ rút gọn:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    root /var/www/v2.vnseea;

    index index.php index.html;

    location ^~ /_api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location ^~ /socket.io/ {
        proxy_pass http://127.0.0.1:3015;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location ~ ^/(requests|ajax_loading|api-v2|api|xhr/.*|admincp|cron-job)\.php$ {
        include fastcgi_params;
        fastcgi_pass unix:/run/php/vnseea.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param DOCUMENT_ROOT $document_root;
    }

    location /api {
        rewrite ^/api(/?|)$ /api-v2.php last;
        rewrite ^/api/([^/]+)(/|)$ /api-v2.php?type=$1 last;
    }

    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_pass unix:/run/php/vnseea.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param DOCUMENT_ROOT $document_root;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Nếu `xhr/*.php` không match đúng, thêm location riêng:

```nginx
location ~ ^/xhr/.*\.php$ {
    include fastcgi_params;
    fastcgi_pass unix:/run/php/vnseea.sock;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    fastcgi_param DOCUMENT_ROOT $document_root;
}
```

## PM2

Ví dụ `ecosystem.production.cjs`:

```js
module.exports = {
  apps: [
    {
      name: "vnseea-client",
      cwd: "/var/www/v2.vnseea/client",
      script: ".output/server/index.mjs",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        HOST: "127.0.0.1",
        PORT: "3000",
        NITRO_HOST: "127.0.0.1",
        NITRO_PORT: "3000",
      },
    },
    {
      name: "vnseea-realtime",
      cwd: "/var/www/v2.vnseea/client",
      script: "realtime/notification-server.mjs",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        REALTIME_HOST: "127.0.0.1",
        REALTIME_PORT: "3015",
      },
    },
  ],
}
```

Không thêm `vnseea-php-upstreams` vào production PM2.

## Deploy Steps

1. Pull code.
2. Install PHP dependencies nếu backend có composer.
3. Install frontend dependencies trong `client/`.
4. Build Nuxt.
5. Restart PHP-FPM.
6. Restart PM2 services.
7. Reload Nginx.
8. Smoke test.

```bash
cd /var/www/v2.vnseea
git pull

cd client
pnpm install --frozen-lockfile
pnpm build

sudo systemctl restart php-fpm
pm2 reload ecosystem.production.cjs --update-env
sudo nginx -t
sudo systemctl reload nginx
```

## Smoke Test

Kiểm tra backend PHP:

```bash
curl -i https://your-domain.com/api/auth
curl -i https://your-domain.com/requests.php
```

Kiểm tra Nuxt:

```bash
curl -i https://your-domain.com/_api/navigation/general
curl -i https://your-domain.com/messages
```

Kiểm tra realtime:

```bash
curl -i https://your-domain.com/socket.io/?EIO=4\&transport=polling
```

## Nếu Gặp 502

Phân biệt lỗi:

- `/_api/*` 502: Node/Nuxt SSR chết hoặc Nginx proxy sai port `3000`.
- `/api/*`, `/requests.php`, `/xhr/*.php` 502: PHP-FPM chết, socket sai, permission sai, hoặc PHP extension thiếu.
- `/socket.io/*` 502: realtime Node service chết hoặc proxy websocket sai.

Lệnh kiểm tra:

```bash
systemctl status php-fpm
pm2 status
nginx -t
tail -f /var/log/nginx/error.log
```

## Ghi Chú Về Local

Local Windows/Laragon có thể dùng nhiều `php-cgi` ports như `9003-9010` để tránh nghẽn khi SSR gọi nhiều request song song. Đây chỉ là workaround local. Production phải dùng PHP-FPM pool.
