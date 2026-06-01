English description: Test cases for the feed bounded context, covering the home feed shell, content ordering, and story creation flow.

# Test Case Feed

## Pham vi

- Context: `client/src/feed`
- Route chinh: `/home`, `/status/create`
- Muc tieu: thu tu section cua Nuxt phai giong `themes/wowonder/layout/home/content.phtml`

## Chuan bi

- Chay `cd client && npm run dev`
- Test tren Desktop `1440x900` va Mobile `390x844`
- Dang nhap bang 1 tai khoan co stories, home feed va quyen dang bai tren backend PHP

## Case

| ID | Man hinh | Route | Cach test | Ky vong |
| --- | --- | --- | --- | --- |
| `FEED-001` | Desktop `1440x900` | `/home` | Mo trang home | Thu tu hien thi la `filter row -> stories -> announcement -> publisher -> order control -> greeting -> new posts -> post list -> load more`. |
| `FEED-002` | Mobile `390x844` | `/home` | Cuon tu tren xuong | Cac block van theo dung thu tu PHP, khong nhay sidebar vao giua feed. |
| `FEED-003` | Desktop `1440x900` | `/home` | Kiem tra shell 3 cot | Feed nam o cot giua, sidebar trai/phai van dung shell co san, khong co hero/dashboard lon. |
| `FEED-004` | Desktop `1440x900` | `/home` | Bam nut xem bai moi va load more | Nut dat dung vi tri sau greeting/post list, khong chen vao stories hoac publisher. |
| `FEED-005` | Desktop `1440x900` va Mobile `390x844` | `/status/create` | Mo route tao story/post | Form la upload-first: chon media truoc, preview xuat hien song song, action submit nam cuoi flow. |
| `FEED-006` | Desktop `1440x900` va Mobile `390x844` | `/home` | Upload 2-3 stories khac media bang tai khoan A, dang nhap tai khoan B co quyen xem story cua A, mo feed va bam card story cua A | Rail chi hien 1 card cho A; viewer co nhieu progress segments va bam/click phai-trai se chuyen qua tung story khac nhau, khong lap lai cung mot media. |
| `FEED-007` | Desktop `1440x900` va Mobile `390x844` | `/home` | Mo story viewer bang tai khoan owner va visitor | Viewer chi hien media, author, time va caption neu backend co `description`; khong hien title/interaction/hint mock va khong tu tang view o client. |
| `FEED-008` | Desktop `1440x900` va Mobile `390x844` | `/home` | Upload mot story video tu backend bang tai khoan A, dang nhap tai khoan B, mo home feed va click vao card story video do | Story viewer phai render video media dung loai file; khong duoc fallback sang avatar chi vi media la video. Neu backend tra video URL hop le thi phai phat video trong viewer thay vi hinh anh/placeholder. |
| `FEED-009` | Desktop `1440x900` va Mobile `390x844` | `/home` | Mo story rail va story viewer | Card story video khong hien nut tam giac rieng tren thumbnail; khi mo viewer phai hien so luot xem backend, nut reaction va nut tra loi story o footer. |
| `FEED-010` | Desktop `1440x900` va Mobile `390x844` | `/home` | Dang nhap tai khoan B, mo story cua A, bam nhanh nut reaction roi nhan giu nut reaction de mo tray va chon lan luot `Like`, `Love`, `HaHa`, `Wow`, `Sad`, `Angry` | Bam nhanh gui `Like`; nhan giu moi mo tray reaction; moi reaction phai goi API that `requests.php?f=status&s=register_reaction` voi reaction id backend `1..6`; UI hien reaction vua chon, khong con toggle tym gia. |
| `FEED-011` | Desktop `1440x900` va Mobile `390x844` | `/home` -> `/messages` | Dang nhap tai khoan B, nhap noi dung reply story cua A roi bam gui; sau do mo messages voi A | Reply phai duoc gui qua API v2 `send-message` kem `story_id`; input clear sau khi thanh cong va message xuat hien o thread backend. |
| `FEED-012` | Desktop `1440x900` va Mobile `390x844` | Toan site | Bam chuyen qua cac route lon nhu `/home`, `/messages`, `/explore`, `/pages` | Thanh loading indicator cua Nuxt hien o dau trang trong luc route dang chuyen, khong can reload trinh duyet. |

## Trang thai hien tai

- `FEED-001` → `FEED-007`: da co test case, can tiep tuc verify theo preview/backend thuc te
- `FEED-008`: da fix mapper story video; can verify lai bang backend thuc te tren owner va visitor
- `FEED-009`: da them kiem tra viewer actions va bo play badge tren story card
- `FEED-010` -> `FEED-011`: da chuyen reaction/reply story sang API bridge that; can test bang 2 tai khoan backend
- `FEED-012`: da them Nuxt loading indicator toan site

## Lenh kiem tra

```powershell
cd client
npm run build
```
