# API Structure Cho DDD + MVVM

> Tài liệu này chốt cấu trúc API layer cho `client`, dựa trên:
> - [missing_api_endpoints.md](./missing_api_endpoints.md)
> - [page_feature_audit.md](./page_feature_audit.md)

## 1. Kết luận kiến trúc

Frontend sẽ dùng:

- `DDD` để chia bounded context
- `MVVM` ở tầng page / screen
- `shared-kernel` cho HTTP, auth/session, utils dùng chung

Không dùng pattern:

- page gọi `$fetch` trực tiếp
- component gọi endpoint trực tiếp
- nhét DTO/API mapping vào `presentation`

## 2. Flow chuẩn

```txt
View (.vue page/component)
-> ViewModel (application/view-models hoặc application/composables)
-> Use case / store (application)
-> Repository interface (domain/repositories)
-> Repository implementation (infrastructure/repositories)
-> HTTP client (shared-kernel/infrastructure/http)
-> PHP endpoint / API
```

## 3. Folder structure mục tiêu

```txt
client/src/
├─ shared-kernel/
│  ├─ domain/
│  │  └─ types/
│  ├─ application/
│  │  ├─ composables/
│  │  ├─ stores/
│  │  └─ utils/
│  ├─ infrastructure/
│  │  └─ http/
│  └─ presentation/
│     └─ components/
│
├─ checkout/
│  ├─ domain/
│  │  ├─ entities/
│  │  ├─ repositories/
│  │  ├─ services/
│  │  └─ types/
│  ├─ application/
│  │  ├─ dto/
│  │  ├─ stores/
│  │  ├─ use-cases/
│  │  └─ view-models/
│  ├─ infrastructure/
│  │  ├─ http/
│  │  ├─ mappers/
│  │  ├─ repositories/
│  │  └─ persistence/
│  └─ presentation/
│     ├─ components/
│     └─ pages/
```

Ghi chú:

- `application/composables` hiện có thể tiếp tục dùng như ViewModel trong giai đoạn chuyển tiếp.
- Với code API-backed mới, ưu tiên rõ tên bằng `application/view-models`.

## 4. Đặt gì ở từng layer

### `domain`

Chứa:

- entity / value object
- type nghiệp vụ
- repository contract
- rule/specification thuần nghiệp vụ

Không chứa:

- `$fetch`
- `useRoute`, `useRouter`
- toast
- localStorage

### `application`

Chứa:

- use case
- ViewModel
- Pinia store
- orchestration của screen

Ví dụ:

- `useCheckoutPageVM.ts`
- `useOrdersPageVM.ts`
- `useSubmitFundingDonation.ts`
- `useMessagesStore.ts`

### `infrastructure`

Chứa:

- gọi API thật
- DTO request/response
- mapper API -> domain
- persistence local/session
- mock tạm thời trong giai đoạn chưa có endpoint

Ví dụ:

- `http/checkout.api.ts`
- `repositories/PhpCheckoutRepository.ts`
- `mappers/checkout.mapper.ts`

### `presentation`

Chứa:

- page `.vue`
- component `.vue`
- chỉ bind state, emit event, render UI

Không chứa:

- query API trực tiếp
- DTO mapping
- business rule lớn

## 5. Shared HTTP kernel

Phần dùng chung đã được đặt ở:

- [php-endpoint-client.ts](../src/shared-kernel/infrastructure/http/php-endpoint-client.ts)
- [api.types.ts](../src/shared-kernel/domain/types/api.types.ts)

Rule:

- toàn bộ repository implementation gọi qua `usePhpEndpointClient()`
- base URL lấy từ `runtimeConfig.public.apiBase`
- mặc định là `/api/v2/endpoints`

## 6. Store đặt ở đâu

Store không đặt trong `app/` nữa.

Đặt ở:

- `src/<context>/application/stores/*`
- `src/shared-kernel/application/stores/*` nếu dùng chung nhiều context

Ví dụ:

- `src/checkout/application/stores/useCheckoutStore.ts`
- `src/orders/application/stores/useOrdersStore.ts`
- `src/messages/application/stores/useMessagesStore.ts`

Khi nào cần store:

- state sống lâu hơn 1 page
- nhiều component/page cùng dùng
- có optimistic update / cache / sync nhiều action

Không cần store nếu:

- chỉ là local page state
- chỉ phục vụ 1 form/page đơn

## 7. Quy ước file API cho mỗi bounded context

Mỗi context API-backed nên có:

```txt
src/<context>/
├─ domain/
│  └─ repositories/
│     └─ <Context>Repository.ts
├─ application/
│  ├─ use-cases/
│  ├─ stores/
│  └─ view-models/
├─ infrastructure/
│  ├─ http/
│  │  └─ <context>.api.ts
│  ├─ mappers/
│  │  └─ <context>.mapper.ts
│  └─ repositories/
│     └─ Php<Context>Repository.ts
└─ presentation/
   └─ pages/
```

## 8. Bounded context ownership cho API

Dựa trên `page_feature_audit.md` và `missing_api_endpoints.md`, nên chia như sau:

### `auth`

Own:

- `auth.php`
- `social-login.php`
- `create-account.php`
- `send-reset-password-email.php`
- `reset_password.php`
- `active_account_sms.php`

### `profile`

Own:

- `get-user-data.php`
- `update-user-data.php`
- `reset_avatar.php`
- `follow-user.php`
- `block-user.php`
- `report_user.php`
- `poke.php`
- `gift.php`
- `add-to-family.php`

### `settings`

Own:

- `update-user-data.php`
- `mute.php`
- `block-user.php`
- `delete-session.php` nếu có
- `verification`
- `payments`
- `addresses`
- các endpoint settings con

### `feed`

Own:

- `posts.php`
- `new_post.php`
- `post-actions.php`
- `comments.php`
- `get-stories.php`
- `create-story.php`
- `delete-story.php`
- `get_story_views.php`
- `react_story.php`

### `messages`

Own:

- `get_chats.php`
- `get_user_messages.php`
- `send-message.php`
- `set-chat-typing-status.php`
- `read_chats.php`
- `delete_message.php`
- `delete-conversation.php`
- `group_chat.php`
- `page_chat.php`

### `community`

Own:

- `create-group.php`
- `get-group-data.php`
- `join-group.php`
- `get_group_members.php`
- `update-group-data.php`
- `create-page.php`
- `get-page-data.php`
- `update-page-data.php`
- `like-page.php`
- `rate_page.php`

### `product`

Own:

- `get-products.php`
- `create-product.php`
- `edit-product.php`

### `checkout`

Own:

- `checkout.php`
- `stripe.php`
- `razorpay.php`
- `paystack.php`
- `cashfree.php`
- `address.php`

### `orders`

Own:

- `market.php`

### `wallet`

Own:

- `wallet.php`

### `withdrawal`

Own:

- withdrawal endpoint(s)

### `blogs`

Own:

- `blogs.php`
- `get-blog-by-id.php`

### `events`

Own:

- `get-events.php`
- `create-event.php`
- `get_event_by_id.php`
- `go-to-event.php`
- `interest-event.php`

### `jobs`

Own:

- `job.php`
- `open_to_work.php` nếu `linkedin mode`

### `funding`

Own:

- `funding.php`

### `live`

Own:

- `live.php`

### `monetization`

Own:

- `subscriptions.php`
- `monetization_user.php`
- `switch_account.php`

Đây là context cần backend bổ sung endpoint trước theo `missing_api_endpoints.md`.

## 9. MVVM naming rule

Để rõ ràng hơn từ phase API này:

- `presentation/pages/*.vue` = `View`
- `application/view-models/useXxxPageVM.ts` = `ViewModel`
- `domain/*` + `repository` = `Model/domain`

Ví dụ:

```txt
src/checkout/presentation/pages/CheckoutPage.vue
src/checkout/application/view-models/useCheckoutPageVM.ts
src/checkout/domain/repositories/CheckoutRepository.ts
src/checkout/infrastructure/repositories/PhpCheckoutRepository.ts
```

## 10. Mẫu tối thiểu cho 1 context API-backed

Ví dụ `orders`:

```txt
src/orders/
├─ domain/
│  ├─ types/orders.types.ts
│  └─ repositories/OrderRepository.ts
├─ application/
│  ├─ stores/useOrdersStore.ts
│  ├─ use-cases/getBuyerOrders.ts
│  └─ view-models/useOrdersPageVM.ts
├─ infrastructure/
│  ├─ http/orders.api.ts
│  ├─ mappers/orders.mapper.ts
│  └─ repositories/PhpOrderRepository.ts
└─ presentation/
   ├─ pages/OrdersPage.vue
   └─ components/*
```

## 11. Rollout order đề xuất

Theo tình trạng hiện tại, thứ tự nên là:

1. `auth`
2. `profile`
3. `feed`
4. `messages`
5. `community`
6. `product`
7. `checkout`
8. `orders`
9. `wallet`
10. `withdrawal`
11. `blogs`
12. `events`
13. `jobs`
14. `funding`
15. `live`
16. `monetization`

Nếu bám sát `missing_api_endpoints.md`, thì backend ưu tiên:

1. `monetization/subscriptions.php`
2. `monetization_user.php`
3. quyết định `switch_account.php`
4. kiểm tra `open_to_work.php`

## 12. Quy tắc bắt buộc từ giờ

- Không gọi endpoint trực tiếp trong `.vue`
- Không đặt store trong `app/`
- Không đặt repository implementation trong `application`
- Không để mock API nằm mãi trong `app/composables`
- Mỗi endpoint phải có owner context rõ ràng
- Repository contract phải nằm ở `domain/repositories`
- Implementation PHP endpoint client phải nằm ở `infrastructure`

## 13. Trạng thái hiện tại

Đã xong:

- UI runtime đã chuyển sang `src/<context>/*`
- `app/` đã về delivery layer
- shared composables đã về `shared-kernel`
- shared PHP endpoint client đã có

Chưa xong:

- repository implementation thật cho từng context
- API mapper thật
- page ViewModel chuẩn hóa đồng đều
- store thật cho các context cần state dài đời
