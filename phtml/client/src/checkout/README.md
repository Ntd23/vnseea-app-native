# Checkout Sample Context

Đây là sample bounded context `checkout`.

Mục tiêu:
- làm mẫu thứ hai sau `product`
- cho team thấy cách áp cùng pattern vào một flow transactional
- chưa thay runtime hiện tại

Mapping từ code hiện tại:
- `types/checkout.ts` -> `domain/types/checkout.types.ts`
- `app/components/checkout/*` -> `presentation/components/*`
- `app/components/pages/CheckoutPage.vue` -> `presentation/pages/CheckoutPage.vue`

Điểm cần chú ý ở checkout:
- state giao dịch không được trộn vào route/page quá sâu
- address validation nên là rule/application concern, không chỉ là template concern
- persistence local chỉ là infrastructure detail
