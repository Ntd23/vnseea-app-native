English description: Documents the backend-backed messages bounded context, including text, file, record, typing, and realtime behavior.

# Messages bounded context

- Route wrapper: `client/app/pages/messages.vue`
- Runtime page: `client/src/messages/presentation/pages/MessagesPage.vue`
- Page view-model: `client/src/messages/application/view-models/useMessagesPageVM.ts`
- Inbox state/composable: `client/src/messages/application/composables/useMessagesInbox.ts`
- Recorder composable: `client/src/messages/application/composables/useMessageRecorder.ts`
- Realtime composable: `client/src/messages/application/composables/useMessageRealtime.ts`
- Repository contract: `client/src/messages/domain/repositories/MessagesRepository.ts`
- Repository implementation: `client/src/messages/infrastructure/repositories/ApiMessagesRepository.ts`
- Nuxt bridge: `client/server/api/messages/*`

## Active scope

- Tabs kept active:
  - `Send multiple`
  - `Users`
  - `Groups`
- Supported message payloads:
  - `text`
  - `file`
  - `record`
- Typing:
  - enabled only for 1:1 user threads
  - not shown for group threads
  - not shown for multi-send

## Flow

`app/pages/messages.vue -> MessagesPage.vue -> useMessagesPageVM -> useMessagesInbox/useMessageRealtime/useMessageRecorder -> MessagesRepository -> /_api/messages/* -> xhr/messages.php | xhr/chat.php`

## Backend-backed actions

- Inbox: `GET /_api/messages/conversations`
- Thread: `GET /_api/messages/thread`
- Send single/group message: `POST /_api/messages/send`
- Multi-send: `POST /_api/messages/multi`
- Upload voice record: `POST /_api/messages/record/upload`
- Typing bridge: `POST /_api/messages/typing`
- Mark all read: `POST /_api/messages/read`
- Delete or leave conversation: `POST /_api/messages/delete`
- Create group chat: `POST /_api/messages/group`

## Realtime behavior

- Primary transport: Socket.IO
- Fallback: polling
- Realtime events used by this context:
  - `messages:count`
  - `message:typing`
  - `message:typing-stop`

Message arrival never trusts socket payload as final render data. The client refetches inbox/thread from the backend bridge so PHP remains the source of truth.

Do not add local mock conversations, fake typing state, or fake success state in this context.
