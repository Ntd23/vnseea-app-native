# Checkout Manual Address Design

## Goal

Allow a buyer to keep the exact delivery-address text they entered when Google
does not provide a suitable suggestion.

## Design

- Add an optional `onUseTypedAddress` callback to `AddressSearchContent`.
- When the callback is present and the trimmed query has at least two
  characters, show a prominent **Dùng địa chỉ đã nhập** action directly below
  the search input.
- The action displays the exact trimmed address so the user can verify what
  will be kept.
- Checkout supplies the callback. Other address-search consumers do not, so
  their UI and behavior remain unchanged.
- On press, Checkout stores the trimmed address, dismisses the keyboard, and
  returns to the existing address form.
- City and country remain editable fields in the form. Manual selection does
  not require coordinates and does not call Google Place Details.

## Error And Validation Behavior

- Inputs shorter than two trimmed characters do not show the action.
- Existing required-field and phone validation continues to run when the user
  saves the address.
- Google suggestions, Geocoding fallback, and Google attribution remain
  available and unchanged.

## Verification

- A component test presses the manual action and receives the trimmed text.
- The test confirms Place Details and resolved-address callbacks are not used.
- Checkout contract tests confirm only Checkout enables the action.
- TypeScript, ESLint, targeted Jest, and `git diff --check` pass.

