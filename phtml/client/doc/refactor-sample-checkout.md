# Refactor Sample: Checkout

Đây là sample thứ hai sau `product`.

Sample đã được scaffold tại:
- [client/src/checkout/README.md](/d:/Duong/src/laragon/www/demo.vnseea/client/src/checkout/README.md)
- [domain/types/checkout.types.ts](/d:/Duong/src/laragon/www/demo.vnseea/client/src/checkout/domain/types/checkout.types.ts)
- [domain/repositories/CheckoutRepository.ts](/d:/Duong/src/laragon/www/demo.vnseea/client/src/checkout/domain/repositories/CheckoutRepository.ts)
- [domain/specifications/shipping-address.specification.ts](/d:/Duong/src/laragon/www/demo.vnseea/client/src/checkout/domain/specifications/shipping-address.specification.ts)
- [application/use-cases/create-checkout-snapshot.ts](/d:/Duong/src/laragon/www/demo.vnseea/client/src/checkout/application/use-cases/create-checkout-snapshot.ts)
- [application/composables/useCheckoutFlow.ts](/d:/Duong/src/laragon/www/demo.vnseea/client/src/checkout/application/composables/useCheckoutFlow.ts)
- [infrastructure/persistence/checkout.storage.ts](/d:/Duong/src/laragon/www/demo.vnseea/client/src/checkout/infrastructure/persistence/checkout.storage.ts)
- [presentation/pages/CheckoutPage.vue](/d:/Duong/src/laragon/www/demo.vnseea/client/src/checkout/presentation/pages/CheckoutPage.vue)

## Ý nghĩa sample

Sample này cho team thấy:
- một flow transactional nên tách thế nào
- address validation là `domain specification`
- orchestration checkout là `application composable`
- local persistence là `infrastructure detail`

## Mapping từ code cũ

Từ:
- `client/types/checkout.ts`
- `client/app/components/checkout/*`
- `client/app/components/pages/CheckoutPage.vue`

Sang:
- `src/checkout/domain/*`
- `src/checkout/application/*`
- `src/checkout/infrastructure/*`
- `src/checkout/presentation/*`

## Điều cần giữ

- route wrapper mỏng
- form UI không tự ôm business flow
- validation không nằm rải trong template
- local storage không nằm trong domain
