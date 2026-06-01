# Store Convention

- Context-specific stores go in `src/<bounded-context>/application/stores/`.
- Shared cross-context stores go in `src/shared-kernel/application/stores/`.
- Do not add business stores back into `app/`.

Examples:

- `src/checkout/application/stores/useCheckoutStore.ts`
- `src/orders/application/stores/useOrdersStore.ts`
- `src/shared-kernel/application/stores/useUiShellStore.ts`
