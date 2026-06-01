# Refactor Target

Use this file as the target architecture summary for the frontend.

## Main Goal

Refactor the Nuxt frontend so it becomes:

- scalable
- maintainable
- SSR-safe
- SEO-safe
- easier to split by module and owner

## Target Shape

- `app/*` stays as the Nuxt delivery layer
- `src/*` becomes the main implementation layer
- code is grouped by bounded context
- each context separates:
  - `presentation`
  - `application`
  - `domain`
  - `infrastructure`

## Practical Rule

Do not try to make every context "perfect DDD" in one pass.

Move in stages:

1. thin route wrapper
2. presentation page and shared presentation components
3. application orchestration
4. domain contracts and rules
5. infrastructure adapters, repositories, and mocks
6. legacy cleanup
