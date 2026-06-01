English description: Guide for making agents and new branches follow the project skill and AGENTS.md rules.

# Agent Skill Handoff Guide

## Muc tieu

Tai lieu nay dung khi mo chat moi, doi agent, hoac lam tren branch khac. Muc tieu la bat agent doc dung rule cua project truoc khi sua code.

## File bat buoc phai co trong branch

Moi branch can giu cac file/folder nay:

| Path | Muc dich |
| --- | --- |
| `AGENTS.md` | Rule tong cua repo, noi PHP la backend source of truth va frontend nam trong `client/`. |
| `client/AGENTS.md` | Rule chinh cho Nuxt frontend, UI/UX/API/routing/SEO. |
| `client/ai/skills/*/SKILL.md` | Skill source versioned theo project. |
| `client/ai/sync-codex-skills.ps1` | Script sync skill vao Codex local home. |
| `client/doc/ui_style_guide.md` | Style guide bat buoc khi sua UI. |
| `client/doc/api-context-connection-roadmap.md` | Roadmap context/API da lam va chua lam. |
| `client/doc/dev-ownership-plan.md` | Chia viec dev de tranh conflict. |

Neu branch khac thieu cac file nay, merge/copy chung truoc khi giao task cho agent.

## Cach dung voi Codex

Chay sync skill tu repo hien tai:

```powershell
cd client
.\ai\sync-codex-skills.ps1
```

Neu muon xoa ban skill local cu roi copy lai tu repo:

```powershell
cd client
.\ai\sync-codex-skills.ps1 -Clean
```

Sau khi sync, mo chat moi voi Codex va giao task. Codex se thay cac skill trong `$CODEX_HOME/skills`.

## Cach dung voi agent khac

Neu agent khong tu doc skill, dua instruction nay vao dau task:

```text
Read AGENTS.md, client/AGENTS.md, then read the relevant skill under client/ai/skills before editing.
Use the project skills as local rules, not generic advice.
Do not change PHP unless the task explicitly requires backend behavior changes.
Frontend must call /_api/* and keep app/pages as thin Nuxt delivery wrappers.
```

Sau do chi ro skill can doc:

| Loai task | Skill can doc |
| --- | --- |
| Sua UI/component/page | `client/ai/skills/frontend-ui-system/SKILL.md` |
| Sua flow/redirect/loading/error UX | `client/ai/skills/frontend-ux-flow/SKILL.md` |
| Them/sua route Nuxt | `client/ai/skills/frontend-nuxt-routing/SKILL.md` |
| Noi API cho context | `client/ai/skills/frontend-api-integration/SKILL.md` |
| Doi chieu backend API doc | `client/ai/skills/backend-api-reference/SKILL.md` |
| Refactor bounded context | `client/ai/skills/frontend-bounded-context-refactor/SKILL.md` |
| Viet testcase | `client/ai/skills/frontend-testcase/SKILL.md` |
| SEO public page | `client/ai/skills/frontend-seo-content/SKILL.md` |

## Prompt mau khi giao task

Dung mau nay de tranh agent bo qua rule:

```text
Before doing the task:
1. Read AGENTS.md.
2. Read client/AGENTS.md.
3. Read the relevant skill:
   - <skill path>
4. Follow route registry, API bridge, UI style guide, and context ownership rules.

Task:
<noi dung task>
```

Vi du cho task noi API:

```text
Before doing the task:
1. Read AGENTS.md.
2. Read client/AGENTS.md.
3. Read client/ai/skills/frontend-api-integration/SKILL.md.
4. Read client/ai/skills/backend-api-reference/SKILL.md.
5. Use /_api/* from frontend and bridge to PHP in server/api/*.

Task:
Connect the products context to backend API without changing UI.
```

## Rule khi lam tren branch khac

1. Rebase/merge branch moi nhat co `client/ai/skills`.
2. Chay `.\ai\sync-codex-skills.ps1 -Clean` trong `client`.
3. Doc `client/doc/dev-ownership-plan.md` de biet context nao minh duoc sua.
4. Chi sua context duoc giao, tranh dung file shared neu khong can.
5. Neu phai sua shared file, ghi ro trong PR/task note.
6. Update `client/doc/api-context-connection-roadmap.md` neu context/API da xong.
7. Update `client/src/<context>/TEST_CASE.md` bang tieng Viet va ghi ro man hinh test.

## Checklist truoc khi giao task cho agent

- `[ ]` Branch co `AGENTS.md` va `client/AGENTS.md`.
- `[ ]` Branch co `client/ai/skills`.
- `[ ]` Da sync skill neu dung Codex.
- `[ ]` Task noi ro context owner.
- `[ ]` Task noi ro skill can doc.
- `[ ]` Neu task lien quan UI: noi ro khong redesign neu khong duoc yeu cau.
- `[ ]` Neu task lien quan API: noi ro frontend chi goi `/_api/*`.
- `[ ]` Neu task lien quan testcase: yeu cau ghi ro route/man hinh/viewport.

## Khi agent lam sai rule

Neu agent bo qua skill hoac sua sai layer, dung prompt ngan nay:

```text
Stop. Re-read AGENTS.md, client/AGENTS.md, and the relevant skill under client/ai/skills.
Do not continue until the solution follows the project architecture:
app/pages -> src/<context>/presentation -> application -> domain/infrastructure.
```
