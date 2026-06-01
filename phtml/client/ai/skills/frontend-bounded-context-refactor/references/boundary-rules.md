# Boundary Rules

Use this file for layer and context boundaries.

## Layer Direction

- `presentation` may depend on:
  - `application`
  - `shared-kernel`
- `application` may depend on:
  - `domain`
  - `infrastructure`
  - `shared-kernel`
- `infrastructure` may depend on:
  - `domain`
  - `shared-kernel`
- `domain` must not depend on:
  - `presentation`
  - `application`
  - `infrastructure`

## Context Boundary

- Context A should not import internals of context B directly.
- If A needs data from B, prefer:
  - a public API of B
  - a DTO at application level
  - an ACL or adapter at infrastructure level

## Shared-Kernel Discipline

Only move something into `shared-kernel` when it is truly generic and reused.

Do not push one context's business rules into `shared-kernel` just to avoid choosing an owner.
