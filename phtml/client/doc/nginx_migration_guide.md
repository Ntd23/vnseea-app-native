# Huong dan migration Nginx sau khi dua UI sang Nuxt trong `client/`

## Muc tieu

Sau migration, he thong nen chia thanh 3 lop ro rang:

1. `PHP` van xu ly admin, API, cac entrypoint cu, va cac file `.php`.
2. `Nginx` dung lam web server, serve static files, va reverse proxy user-facing routes sang Nuxt.
3. `Nuxt` nam trong thu muc `client/`, chay SSR qua Node tren port noi bo, vi du `3000`.

Khong nen thay toan bo website sang Nuxt trong mot buoc. Cach an toan hon la:

- Giu nguyen `admincp`, `admin-panel`, `api`, `requests.php`, `login-with.php`, cac route call.
- Dua dan cac trang public/user-facing sang Nuxt.
- Dung Nginx de tach route PHP va route Nuxt.

## Cau truc de xuat

```text
/home/vnseea/social
|-- admin-panel/
|-- api/
|-- assets/
|-- client/              # Nuxt app
|-- themes/
|-- upload/
|-- index.php
|-- requests.php
|-- api-v2.php
`-- ...
```

Production flow:

```text
Internet
  -> Nginx :443
     -> PHP-FPM cho /admincp, /admin-cp, /admin-panel, /api, *.php
     -> Nginx static cho /upload, /themes, /assets, /_nuxt
     -> Nuxt SSR (127.0.0.1:3000) cho cac route user-facing con lai
```

## Giai doan khuyen nghi

### Giai doan 1: Local

- Tao Nuxt app trong `client/`
- Chay Nuxt doc lap bang port rieng
- Xac nhan build va SSR on dinh

### Giai doan 2: Production

- Build Nuxt trong `client/`
- Chay `.output/server/index.mjs` bang PM2
- Sua Nginx production de:
  - giu PHP routes cu
  - reverse proxy user routes sang Nuxt
  - serve `/_nuxt/` tu `.output/public/_nuxt/`

Khong nen sua production truoc khi local chay on.

## Buoc 1: Tao project Nuxt trong `client/`

Neu `client/` dang rong, scaffold Nuxt vao do:

```bash
npx nuxi@latest init client
cd client
pnpm install
```

Neu dung `npm`:

```bash
npx nuxi@latest init client
cd client
npm install
```

## Buoc 2: Chay local

Trong `client/`:

```bash
pnpm dev --host 127.0.0.1 --port 3000
```

hoac:

```bash
npm run dev -- --host 127.0.0.1 --port 3000
```

Kiem tra:

```bash
curl http://127.0.0.1:3000
```

## Buoc 3: Build production

Trong `client/`:

```bash
pnpm build
```

hoac:

```bash
npm run build
```

Nuxt SSR output:

- server entry: `client/.output/server/index.mjs`
- static assets: `client/.output/public/`

## Buoc 4: Chay Nuxt bang PM2 tren production

```bash
cd /home/vnseea/social/client
pnpm install
pnpm build
pm2 start .output/server/index.mjs --name nuxt-social -- --host 127.0.0.1 --port 3000
pm2 save
```

Neu muon dung ecosystem file, tao `client/ecosystem.config.cjs`:

```js
module.exports = {
  apps: [
    {
      name: "nuxt-social",
      script: ".output/server/index.mjs",
      cwd: "/home/vnseea/social/client",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        HOST: "127.0.0.1",
        PORT: "3000",
        NITRO_HOST: "127.0.0.1",
        NITRO_PORT: "3000"
      }
    }
  ]
}
```

Sau do:

```bash
cd /home/vnseea/social/client
pm2 start ecosystem.config.cjs
pm2 save
```

## Buoc 5: Nguyen tac sua Nginx production

Khong can thay toan bo file Nginx bang mot config moi. Hay sua tren file production dang chay va ap dung cac nguyen tac sau.

### 5.1. Them upstream cho Nuxt

```nginx
upstream nuxt_app {
    server 127.0.0.1:3000;
    keepalive 64;
}
```

### 5.2. Giu nguyen cac PHP routes

Can giu:

- `/admincp`
- `/admin-cp`
- `/admin-panel`
- `/api`
- `*.php`
- cac entrypoint nhu `requests.php`, `login-with.php`, `call.php`, `cron-job.php`

### 5.3. Serve static assets truc tiep

```nginx
location /upload/ {
    alias /home/vnseea/social/upload/;
    expires 30d;
    add_header Cache-Control "public, immutable";
    try_files $uri =404;
}

location /themes/ {
    alias /home/vnseea/social/themes/;
    expires 7d;
    try_files $uri =404;
}

location /assets/ {
    alias /home/vnseea/social/assets/;
    expires 7d;
    try_files $uri =404;
}

location /_nuxt/ {
    alias /home/vnseea/social/client/.output/public/_nuxt/;
    expires 1y;
    add_header Cache-Control "public, immutable";
    try_files $uri =404;
}
```

### 5.4. Proxy user-facing routes sang Nuxt

Phan nay phai dat sau cac location PHP/static da duoc xu ly.

```nginx
location / {
    proxy_pass http://nuxt_app;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

## Mau Nginx production toi thieu

Day la mau rut gon theo huong migration, khong phai file duy nhat bat buoc:

```nginx
upstream nuxt_app {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name vnseea.vn www.vnseea.vn;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name vnseea.vn www.vnseea.vn;
    root /home/vnseea/social;
    index index.php index.html index.htm;

    ssl_certificate /etc/letsencrypt/live/vnseea.vn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vnseea.vn/privkey.pem;

    location /upload/ {
        alias /home/vnseea/social/upload/;
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    location /themes/ {
        alias /home/vnseea/social/themes/;
        expires 7d;
        try_files $uri =404;
    }

    location /assets/ {
        alias /home/vnseea/social/assets/;
        expires 7d;
        try_files $uri =404;
    }

    location /_nuxt/ {
        alias /home/vnseea/social/client/.output/public/_nuxt/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    location = /admincp {
        rewrite ^(.*)$ /admincp.php last;
    }

    location /admincp {
        rewrite ^/admincp/(.*)$ /admincp.php?page=$1 last;
    }

    location /admin {
        rewrite ^/admin-cp$ /admincp.php last;
        rewrite ^/admin-cp/(.*)$ /admincp.php?page=$1 last;
    }

    location /api {
        rewrite ^/api(/?|)$ /api-v2.php last;
        rewrite ^/api/([^\/]+)(\/|)$ /api-v2.php?type=$1 last;
    }

    location ~ ^/(ajax_loading|requests|login-with|call|call_livekit|call_group_livekit|call_jitsi|cron-job|OneSignalSDKWorker)\.php$ {
        include fastcgi_params;
        fastcgi_pass unix:/run/php/177434245169607.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param DOCUMENT_ROOT $document_root;
    }

    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_pass unix:/run/php/177434245169607.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param DOCUMENT_ROOT $document_root;
    }

    location / {
        proxy_pass http://nuxt_app;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Checklist sau migration

- `client/` build thanh cong
- PM2 giu process Nuxt song
- `/admincp` van vao duoc
- `/api/...` van phuc vu app/mobile
- `/_nuxt/*` tra static asset dung
- route public tra ve HTML tu Nuxt
- upload, theme assets, va image cu van load dung

## Ghi chu quan trong

- File `nginx.conf` rewrite hien tai cua PHP app khong nen mang sang nguyen xi neu da chuyen public routes qua Nuxt.
- Local Laragon va production la hai bo config khac nhau. Local co the dung port `8080/8443`, production dung `80/443`.
- Neu migration theo tung trang, co the de Nuxt xu ly mot nhom route truoc, khong can all-in ngay.
