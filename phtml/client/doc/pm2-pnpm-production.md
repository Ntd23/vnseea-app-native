# Chay `client/` tren production voi `pnpm` + `pm2`

## 1. Yeu cau

- Node.js LTS
- `pnpm`
- `pm2`
- Nginx reverse proxy vao Node SSR

## 2. Bien moi truong

Tao file `.env` tren server tu [`.env.example`](../.env.example).

Toi thieu:

```env
NUXT_PUBLIC_API_BASE=/api
NUXT_BACKEND_API_BASE=https://vnseea.vn
NUXT_PUBLIC_SITE_URL=https://vnseea.vn
NUXT_DEV_HOST=127.0.0.1
NUXT_DEV_PORT=3000
NUXT_ALLOWED_HOSTS=vnseea.vn,www.vnseea.vn
```

Luu y:
- `NUXT_PUBLIC_SITE_URL` phai la domain production that.
- `NUXT_BACKEND_API_BASE` phai tro toi backend PHP that.
- `NUXT_DEV_HOST` / `NUXT_DEV_PORT` duoc tai su dung cho Nitro runtime trong phase Node server.

## 3. Cai dat va build

Trong `client/`:

```bash
pnpm install --frozen-lockfile
pnpm build
```

Sau build, entry production la:

```text
.output/server/index.mjs
```

## 4. Chay bang PM2

Repo da co file:

```text
client/ecosystem.config.cjs
```

Chay:

```bash
cd /path/to/demo.vnseea/client
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Lenh quan trong:

```bash
pm2 status
pm2 logs vnseea-client
pm2 restart vnseea-client
pm2 stop vnseea-client
pm2 delete vnseea-client
```

## 5. Update khi deploy ban moi

```bash
cd /path/to/demo.vnseea/client
git pull
pnpm install --frozen-lockfile
pnpm build
pm2 restart vnseea-client
```

## 6. Route / proxy

Nginx nen:

- serve `/_nuxt/*` tu Node/Nuxt hoac proxy toan bo request ve Node
- giu cac PHP route legacy o layer Nginx/PHP-FPM
- proxy route public sang Node app `127.0.0.1:3000`

Xem them:

- [nginx_migration_guide.md](./nginx_migration_guide.md)

## 7. Health check nhanh

Sau khi chay PM2:

```bash
curl http://127.0.0.1:3000
```

Neu Node SSR ok, sau do moi test domain qua Nginx:

```bash
curl -I https://vnseea.vn
```

## 8. Ghi chu thuc dung

- `pm2` chi chay file da build, khong chay `nuxt dev`.
- Production flow dung la:
  - `pnpm install`
  - `pnpm build`
  - `pm2 start ecosystem.config.cjs`
- Khi thay doi env, can:
  - build lai neu config anh huong build/runtime
  - `pm2 restart vnseea-client`
