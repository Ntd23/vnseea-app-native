# Refactor Sample: Community

Đây là sample tiếp theo sau `product` và `checkout`, nhưng lần này gắn trực tiếp với composable runtime đang dùng cho:
- group detail
- page detail

Sample đã được scaffold tại:
- [client/src/community/README.md](/d:/Duong/src/laragon/www/demo.vnseea/client/src/community/README.md)
- [domain/services/community-metrics.service.ts](/d:/Duong/src/laragon/www/demo.vnseea/client/src/community/domain/services/community-metrics.service.ts)
- [infrastructure/adapters/communityDirectory.adapter.ts](/d:/Duong/src/laragon/www/demo.vnseea/client/src/community/infrastructure/adapters/communityDirectory.adapter.ts)
- [application/composables/useCommunityGroupDetail.ts](/d:/Duong/src/laragon/www/demo.vnseea/client/src/community/application/composables/useCommunityGroupDetail.ts)
- [application/composables/useCommunityPageDetail.ts](/d:/Duong/src/laragon/www/demo.vnseea/client/src/community/application/composables/useCommunityPageDetail.ts)

## Ý nghĩa bước này

Khác với sample `checkout`, phần này không chỉ scaffold folder.

Nó bắt đầu di chuyển:
- community lookup
- localized count rule
- group/page detail orchestration

ra khỏi `app/composables/*`.

## Mapping bước đầu

Từ:
- `client/app/composables/useCommunityGroupDetail.ts`
- `client/app/composables/useCommunityPageDetail.ts`

Sang:
- `src/community/application/composables/*`
- `src/community/infrastructure/adapters/*`
- `src/community/domain/services/*`

## Chưa làm ở bước này

- chưa move `presentation/pages/*` của `community`
- chưa move `app/components/community/*`
- chưa tách hết data source khỏi `types/community.ts`
- `useMockSocialData` vẫn đang là dependency chuyển tiếp
