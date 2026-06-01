# Forum bounded context

- Runtime page: `src/forum/presentation/pages/ForumPage.vue`
- Route entry: `app/pages/forum/index.vue` stays thin and only handles layout/SEO.
- Presentation calls `useForumPageVM`, not `$fetch` directly.
- View model calls `ForumRepository`; `ApiForumRepository` talks to `/_api/forum/*`.
- Nuxt server routes bridge to PHP `api/v2/endpoints/forum.php`.
- Current live features: forum workflow tabs (`browse`, `members`, `search`, `my_threads`, `my_messages`), current user's threads, forum thread list after choosing a forum, thread detail after choosing a topic, create thread, reply thread, URL-synced `tab`/`fid`/`tid`/`q`, and load more.
- `src/forum/infrastructure/mocks/forumCatalog.ts` is now legacy reference only and should not be used by runtime forum UI.
