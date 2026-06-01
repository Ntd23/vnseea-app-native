# Foundation Context

`foundation` chua cac UI shell va base presentation component duoc dung cheo giua nhieu bounded context.

Scope hien tai:
- `presentation/components/DrawerShell.vue`
- `presentation/components/DropdownShell.vue`
- `presentation/components/EmptyState.vue`
- `presentation/components/LoadingSkeleton.vue`
- `presentation/components/ModalShell.vue`
- `presentation/components/PageHeader.vue`
- `presentation/components/PageSection.vue`
- `presentation/components/ResponsiveContainer.vue`

Nguyen tac:
- `foundation` khong chua route runtime rieng.
- Consumer phai import explicit tu `src/foundation/presentation/components/*`.
- Khong phu thuoc vao auto-import legacy tu `app/components/foundation/*`.
