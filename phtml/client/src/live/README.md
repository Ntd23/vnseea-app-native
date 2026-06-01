English description: Ownership note for the backend-backed LiveKit host studio context used by the /live route.

# Live

`live` bounded context đã được chốt runtime theo studio host thật.

Sở hữu:

- `presentation/pages/LivePage.vue`
- `presentation/components/LiveChat.vue`
- `application/view-models/useLiveStudioPageVM.ts`
- `application/composables/useLiveKitStudio.ts`
- `domain/types/live.types.ts`
- `domain/repositories/LiveRepository.ts`
- `infrastructure/repositories/ApiLiveRepository.ts`
- `server/api/live/*`

Lưu ý:

- Route `/live` chỉ phục vụ host studio.
- Không còn catalog mock hoặc local comment/like runtime trong route active.
- Viewer player inline trong `feed/story` nằm ngoài phạm vi context pass này.
