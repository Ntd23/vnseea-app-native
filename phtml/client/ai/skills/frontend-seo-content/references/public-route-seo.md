# Public Route SEO

Use this file to separate public pages from private surfaces.

## Usually Public

- marketing or informational landing pages
- public profile pages such as `/:@username`
- public content pages such as blogs, events, products, and public directory-style pages

## Usually Private or Not Index-Worthy

- `welcome`
- `register`
- `forgot-password`
- `checkout`
- `wallet`
- `withdrawal`
- `setting`
- account-only order history
- chat and message screens

## Canonical Mindset

- Public routes need stable canonical URLs.
- Dynamic public pages should derive canonical from the resolved slug or username, not from ad-hoc client state.

## Search Snippet Mindset

- Title should identify the page clearly.
- Description should describe the visible page purpose, not internal implementation details.
