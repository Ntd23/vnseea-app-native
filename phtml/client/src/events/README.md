English description: Notes for the backend-backed events bounded context and its Nuxt delivery flow.

# Events Context

Bounded context `events` hiện dùng dữ liệu thật từ backend PHP qua bridge Nuxt `/_api/events/*`.

Luồng hiện tại:

- `app/pages/events/index.vue` -> `src/events/presentation/pages/EventsPage.vue`
- `app/pages/events/[id].vue` -> `src/events/presentation/pages/EventDetailPage.vue`
- `app/pages/events/create-event.vue` -> `src/events/presentation/pages/CreateEventPage.vue`
- `src/events/application/view-models/*`
- `src/events/infrastructure/repositories/ApiEventsRepository.ts`
- `server/api/events/*`

Ghi chú:

- Frontend không gọi trực tiếp PHP endpoint.
- Tab danh sách sự kiện lấy từ `get-events`.
- Trang chi tiết lấy từ `get_event_by_id`.
- RSVP dùng `go-to-event` và `interest-event`.
- Form tạo sự kiện dùng `create-event` và hỗ trợ upload `event_cover`.
