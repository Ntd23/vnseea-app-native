# VNSEEA UI Style Guide — Chuẩn thiết kế cho toàn bộ dự án

> Tài liệu này mô tả các quy tắc, pattern và token đã áp dụng khi redesign Home Feed. Dùng làm chuẩn khi refactor các trang/component khác.

---

## 1. Bảng màu (Color Palette)

| Token | Giá trị | Dùng cho |
|---|---|---|
| **Brand Primary** | `#0000ff` | Button filled, active states, accent, indicator bars |
| **Brand Primary Light** | `rgba(0, 0, 255, 0.05)` | Active background, hover tint nhẹ |
| **Brand Primary Hover** | `rgba(0, 0, 255, 0.03)` | Hover background trên các nav item |
| **Brand Gradient** | `linear-gradient(180deg, #2233ff 0%, #0000ff 100%)` | Primary button, admin card header |
| **Text Primary** | `#0f172a` | Tiêu đề chính, tên user |
| **Text Secondary** | `#334155` | Label, body text |
| **Text Tertiary** | `#64748b` | Metadata, timestamp, helper text |
| **Text Muted** | `#94a3b8` | Placeholder, section title nhỏ |
| **Border Light** | `#e2e8f0` | Border input, card divider |
| **Border Subtle** | `#f1f5f9` | Divider mỏng, separator |
| **Surface Card** | `#ffffff` | Card background |
| **Surface Tinted** | `#fafbfe` | Input background, alternate row |
| **Surface Page** | `#f0f4ff` hoặc inherit | Page background (đã set ở layout) |
| **Danger** | `#dc2626` | Logout, delete, destructive actions |
| **Danger Hover BG** | `#fef2f2` | Hover background cho danger items |
| **Success/Online** | `#0ea5e9` | Online dot, live indicator |
| **Badge Red** | `#ff3b30` | Notification badge |

### ❌ KHÔNG dùng

```css
/* SAI — quá harsh */
border: 1px solid #111111;
border: 1px solid black;
color: #000000;

/* ĐÚNG — mềm hơn */
border: 1px solid #e2e8f0;
color: #334155;
```

---

## 2. Typography

### Font Stack
```css
font-family: inherit; /* Dùng font từ Nuxt config, KHÔNG hardcode */
```

### Quy tắc chung

| Loại | Size | Weight | Color | Ghi chú |
|---|---|---|---|---|
| **Page title** | `16-18px` | `800` | `#0f172a` | `letter-spacing: -0.01em` |
| **Card title / Username** | `13-14px` | `700` | `#1e293b` | Normal case |
| **Body text** | `13-14px` | `500` | `#334155` | `line-height: 1.55` |
| **Label** | `11-12px` | `600-700` | `#64748b` | Normal case |
| **Section title nhỏ** | `11px` | `700` | `#94a3b8` | `text-transform: uppercase; letter-spacing: 0.06em` |
| **Badge / Chip** | `9-10px` | `700-800` | varies | |
| **Metadata** | `11-12px` | `500` | `#94a3b8` | Timestamp, role |

### ❌ KHÔNG dùng

```css
/* SAI — tracking quá rộng, nhìn giật */
text-transform: uppercase;
letter-spacing: 0.2em;   /* hoặc tracking-widest */
font-weight: 900;        /* black weight cho body text */

/* ĐÚNG — chỉ uppercase cho section title nhỏ, tracking vừa phải */
text-transform: uppercase;
letter-spacing: 0.04em–0.06em;
font-weight: 700;
```

### ❌ KHÔNG dùng `font-black` / `font-weight: 900` cho menu items

```css
/* SAI */
.menu-item {
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.2em;
}

/* ĐÚNG */
.menu-item {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  /* Normal case, no uppercase */
}
```

---

## 3. Spacing & Sizing

### Border Radius

| Element | Radius |
|---|---|
| Card, modal, dropdown | `16px` hoặc `18px` |
| Button lớn, input | `12px` |
| Icon container | `10px` |
| Pill / tag | `999px` (full round) |
| Avatar | `50%` (circle) |
| Image grid | `14px` |
| Mini badge | `6px` |

### ❌ KHÔNG dùng

```css
/* SAI — quá tròn cho card */
border-radius: 24px;
border-radius: 28px;

/* ĐÚNG */
border-radius: 16px;
```

### Padding / Gap

| Context | Value |
|---|---|
| Card padding | `16px–20px` |
| Nav item padding | `8px–12px horizontal, 10px–12px vertical` |
| Gap giữa cards | `16px` |
| Gap giữa icon + label | `10px–12px` |
| Section gap | `8px` |

---

## 4. Shadow

```css
/* Card shadow — nhẹ nhàng */
box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);

/* Dropdown / overlay shadow */
box-shadow: 0 12px 44px rgba(0, 0, 0, 0.12);

/* Primary button glow */
box-shadow: 0 4px 14px rgba(0, 0, 255, 0.2);

/* Active nav item */
box-shadow: 0 4px 12px rgba(0, 0, 255, 0.2);
```

### ❌ KHÔNG dùng

```css
/* SAI — shadow quá đậm */
box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
shadow-[-12px_0_40px_rgba(0,0,0,0.5)];
```

---

## 5. Component Patterns

### 5.1 Nav Item (Sidebar / Menu)

```html
<NuxtLink class="nav-item" :class="{ 'nav-item--active': isActive }">
  <span class="nav-item__icon">
    <Icon :name="icon" />
  </span>
  <span class="nav-item__label">{{ label }}</span>
</NuxtLink>
```

```css
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.15s ease;
}

.nav-item:hover {
  background: rgba(0, 0, 255, 0.03);
}

.nav-item--active {
  background: rgba(0, 0, 255, 0.05);
}

/* Icon container */
.nav-item__icon {
  display: flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #f1f5f9;
  color: #475569;
  transition: all 0.15s ease;
}

.nav-item:hover .nav-item__icon {
  background: rgba(0, 0, 255, 0.06);
  color: #0000ff;
}

.nav-item__icon--active {
  background: #0000ff !important;
  color: #ffffff !important;
  box-shadow: 0 4px 12px rgba(0, 0, 255, 0.2);
}

/* Label */
.nav-item__label {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.nav-item--active .nav-item__label {
  color: #0000ff;
  font-weight: 700;
}
```

### 5.2 Ghost Button (Action buttons: Like, Comment, Share)

```css
.ghost-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex: 1;
  padding: 9px 0;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.ghost-btn:hover {
  background: rgba(0, 0, 255, 0.04);
  color: #0000ff;
}

/* Active state (e.g. liked) */
.ghost-btn--active {
  color: #0000ff;
  font-weight: 700;
}
```

### ❌ Ghost Button — KHÔNG dùng

```css
/* SAI */
border: 1px solid #111111;
border: 1px solid black;
background: #f0f0f0;
text-transform: uppercase;
```

### 5.3 Primary Button (CTA)

```css
.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 20px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(180deg, #2233ff 0%, #0000ff 100%);
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 255, 0.2);
  transition: all 0.15s ease;
}

.btn-primary:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 255, 0.28);
  transform: translateY(-1px);
}

.btn-primary:active {
  transform: scale(0.98);
}
```

### 5.4 Outline Button / Pill

```css
.btn-outline {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 255, 0.15);
  background: #ffffff;
  color: #0000ff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-outline:hover {
  background: #0000ff;
  color: #ffffff;
  border-color: #0000ff;
}
```

### 5.5 Input / Textarea

```css
.input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #fafbfe;
  font-size: 13px;
  color: #334155;
  outline: none;
  font-family: inherit;
  transition: border-color 0.15s ease;
}

.input:focus {
  border-color: rgba(0, 0, 255, 0.25);
}

.input::placeholder {
  color: #94a3b8;
}
```

### 5.6 Card

```css
.card {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 255, 0.04);
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}
```

### 5.7 Dropdown Menu

```css
.dropdown {
  position: absolute;
  z-index: 50;
  margin-top: 8px;
  width: 280px;
  border-radius: 18px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 255, 0.06);
  box-shadow: 0 12px 44px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.dropdown__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  text-decoration: none;
  color: #1e293b;
  font-size: 13px;
  font-weight: 600;
  transition: background 0.12s ease;
}

.dropdown__item:hover {
  background: rgba(0, 0, 255, 0.04);
}
```

### 5.8 Divider

```css
.divider {
  height: 1px;
  margin: 4px 16px;  /* hoặc 8px 16px cho divider rộng hơn */
  background: #f1f5f9;
}
```

### 5.9 Avatar

```css
/* Text avatar */
.avatar {
  display: flex;
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(145deg, #3333ff 0%, #0000ff 100%);
  font-size: 11px;
  font-weight: 800;
  color: #ffffff;
}

/* Avatar with online indicator */
.avatar-wrap {
  position: relative;
}

.avatar-status {
  position: absolute;
  bottom: -1px;
  right: -1px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #ffffff;
  background: #cbd5e1; /* offline */
}

.avatar-status--online {
  background: #0ea5e9;
  box-shadow: 0 0 6px rgba(14, 165, 233, 0.4);
}
```

### 5.10 Tabs

```css
.tab {
  display: flex;
  align-items: center;
  gap: 5px;
  flex: 1;
  justify-content: center;
  padding: 7px 6px;
  border-radius: 8px;
  border: none;
  background: transparent;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab:hover {
  background: #f8fafc;
  color: #475569;
}

.tab--active {
  background: rgba(0, 0, 255, 0.05);
  color: #0000ff;
  font-weight: 700;
}
```

### 5.11 Tag / Hashtag Chip

```css
.tag {
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(0, 0, 255, 0.06);
  color: #0000ff;
  font-size: 12px;
  font-weight: 600;
  transition: background 0.12s ease;
}

.tag:hover {
  background: rgba(0, 0, 255, 0.1);
}
```

### 5.12 Admin Card Header (dùng cho avatar dropdown, mobile menu)

```css
.admin-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  background: linear-gradient(135deg, #0000ff 0%, #2233ff 100%);
  color: #ffffff;
}

.admin-card__role {
  font-size: 15px;
  font-weight: 800;
}

.admin-card__icon {
  font-size: 28px; /* emoji */
}
```

---

## 6. Transition / Animation

```css
/* Transition chuẩn cho mọi interactive element */
transition: all 0.15s ease;

/* Hover scale cho icon */
.icon:hover { transform: scale(1.08); }

/* Button press */
.btn:active { transform: scale(0.98); }

/* Online dot pulse */
@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.online-dot { animation: pulse-dot 2s ease-in-out infinite; }
```

### ❌ KHÔNG dùng

```css
/* SAI — quá lâu, gây sluggish */
transition: all 0.5s ease;
transition: all 300ms;

/* ĐÚNG — nhanh, responsive */
transition: all 0.12s–0.15s ease;
```

---

## 7. Responsive

| Breakpoint | Ý nghĩa |
|---|---|
| `< 1280px` | Mobile/Tablet — ẩn sidebar, hiện mobile bar |
| `≥ 1280px` (xl) | Desktop — hiện sidebar, ẩn mobile bar |

### Quy tắc

- `HeaderIconNav`: ẩn trên mobile (`display: none` mặc định, `display: flex` từ xl)
- `LeftSidebar` + `RightSidebar`: chỉ hiện từ `xl` trở lên
- Mobile bar: chỉ hiện `< xl` (dùng class `xl:hidden`)
- Card width trên feed: max `~820px` (không stretch full width)

---

## 8. CSS Naming Convention

Dùng **BEM-like** với double underscore cho element, double dash cho modifier:

```css
.component {}
.component__element {}
.component__element--modifier {}
```

Ví dụ thực tế:

```css
.post-card {}
.post-card__header {}
.post-card__actions {}
.post-card__action-btn {}
.post-card__action-btn--active {}

.chat-widget {}
.chat-widget__header {}
.chat-widget__tab {}
.chat-widget__tab--active {}
.chat-widget__contact {}
.chat-widget__contact-name {}
```

### ❌ KHÔNG dùng

```css
/* SAI — Tailwind utility trong scoped CSS (trừ khi project dùng Tailwind) */
.flex .items-center .gap-3 .rounded-2xl

/* SAI — class name quá chung */
.box .item .btn .title

/* ĐÚNG — descriptive, BEM */
.sidebar-item__icon--active
.post-card__action-btn
```

---

## 9. Icon Usage

- Icon set: **Phosphor** (`i-ph-*`)
- Active state: dùng `-fill` suffix (`i-ph-house-fill`)
- Inactive state: dùng `-duotone` suffix (`i-ph-house-duotone`)
- Size: `h-4 w-4` (16px) cho small, `h-5 w-5` (20px) cho nav, `h-[21px] w-[21px]` cho mobile bar

```html
<!-- Active -->
<Icon :name="isActive ? 'i-ph-house-fill' : 'i-ph-house-duotone'" />
```

---

## 10. Checklist khi refactor 1 component

- [ ] Bỏ hết `border: ... black`, `border: ... #111111`
- [ ] Bỏ hết `text-transform: uppercase` + `tracking-widest` / `tracking-[0.2em]` trên nav items
- [ ] Bỏ hết `font-weight: 900` (`font-black`) trên body/menu text
- [ ] Đổi border-radius từ `24px`/`28px` về `16px` (card) hoặc `12px` (button/input)
- [ ] Đổi shadow từ nặng về nhẹ (`0 2px 12px rgba(0,0,0,0.04)`)
- [ ] Đổi màu text từ `#000` / `var(--text-primary)` về `#334155` hoặc `#1e293b`
- [ ] Input/textarea dùng `border: 1px solid #e2e8f0; background: #fafbfe`
- [ ] Button action (Like, Comment) → ghost style, không border
- [ ] Active state → `background: rgba(0,0,255,0.05); color: #0000ff`
- [ ] Hover state → `background: rgba(0,0,255,0.03)`
- [ ] Dùng `transition: all 0.15s ease` cho mọi interactive
- [ ] Dùng scoped CSS, đặt tên theo BEM
- [ ] Icon: fill cho active, duotone cho inactive
- [ ] Responsive: test cả mobile (390px) và desktop (1440px+)

---

## 11. Files đã refactor (tham khảo)

| File | Mô tả |
|---|---|
| [PostCard.vue](file:///d:/Duong/src/laragon/www/demo.vnseea/client/src/feed/presentation/components/PostCard.vue) | Ghost buttons, soft card |
| [PostHeader.vue](file:///d:/Duong/src/laragon/www/demo.vnseea/client/src/feed/presentation/components/PostHeader.vue) | Gradient avatar, follow pill |
| [PostMediaGrid.vue](file:///d:/Duong/src/laragon/www/demo.vnseea/client/src/feed/presentation/components/PostMediaGrid.vue) | Subtle overlay, corner badge |
| [FeedPublisherBox.vue](file:///d:/Duong/src/laragon/www/demo.vnseea/client/src/feed/presentation/components/FeedPublisherBox.vue) | Compact/expand mode |
| [StoryCarousel.vue](file:///d:/Duong/src/laragon/www/demo.vnseea/client/src/feed/presentation/components/StoryCarousel.vue) | Vertical cards |
| [SidebarMenuItem.vue](file:///d:/Duong/src/laragon/www/demo.vnseea/client/src/navigation/presentation/components/SidebarMenuItem.vue) | Normal case, accent bar |
| [LeftSidebar.vue](file:///d:/Duong/src/laragon/www/demo.vnseea/client/src/navigation/presentation/components/LeftSidebar.vue) | Section title nhẹ |
| [HeaderIconNav.vue](file:///d:/Duong/src/laragon/www/demo.vnseea/client/src/navigation/presentation/components/HeaderIconNav.vue) | Icon+label, desktop only |
| [HeaderBar.vue](file:///d:/Duong/src/laragon/www/demo.vnseea/client/src/navigation/presentation/components/HeaderBar.vue) | Mobile bar, search toggle |
| [HeaderUserMenu.vue](file:///d:/Duong/src/laragon/www/demo.vnseea/client/src/navigation/presentation/components/HeaderUserMenu.vue) | Admin card dropdown |
| [MobileMenu.vue](file:///d:/Duong/src/laragon/www/demo.vnseea/client/src/navigation/presentation/components/MobileMenu.vue) | Clean drawer menu |
| [ChatWidget.vue](file:///d:/Duong/src/laragon/www/demo.vnseea/client/src/navigation/presentation/components/ChatWidget.vue) | Native HTML, soft UI |
| [HomeFeedPage.vue](file:///d:/Duong/src/laragon/www/demo.vnseea/client/src/feed/presentation/pages/HomeFeedPage.vue) | 16px gap, clean layout |
