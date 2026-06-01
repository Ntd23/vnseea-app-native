# Funding bounded context

- Runtime list page: `src/funding/presentation/pages/FundingPage.vue`
- Runtime create page: `src/funding/presentation/pages/CreateFundingPage.vue`
- Runtime detail page: `src/funding/presentation/pages/ShowFundPage.vue`
- Route entry files in `app/pages/*` giữ SEO/meta và import thẳng `src/funding/presentation/pages/*`
- Funding mock data, filter logic, clone/donation helpers đã được move sang `src/funding/infrastructure/mocks/fundingCatalog.ts`
- Funding domain types đã được tách sang `src/funding/domain/types/funding.types.ts`
- Legacy `app/components/funding/*`, `app/components/pages/FundingPage.vue`, `CreateFundingPage.vue`, `ShowFundPage.vue`, `app/composables/useMockFundingData.ts` có thể xóa sau khi build pass
