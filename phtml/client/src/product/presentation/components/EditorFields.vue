<template>
  <UCard
    class="rounded-[28px] border border-[#dbe3f2] bg-white shadow-[0_14px_34px_rgba(15,35,110,0.07)]"
    :ui="{ body: 'p-5 sm:p-6' }"
  >
    <div class="grid gap-5 md:grid-cols-[minmax(0,1fr)_360px]">
      <UFormField :label="$t('pages.productEditor.titleLabel')" size="xl" class="space-y-2">
        <UInput
          v-model="title"
          size="xl"
          variant="outline"
          color="primary"
          class="w-full"
          :ui="{ base: 'h-[5.5rem] rounded-[22px] px-5 text-[1.1rem]' }"
        />
      </UFormField>

      <UFormField :label="$t('pages.productEditor.priceLabel')" size="xl" class="space-y-2">
        <UInputNumber
          v-model="priceValue"
          size="xl"
          orientation="vertical"
          :min="0"
          :step="0.01"
          placeholder="0.00"
          class="w-full"
          :ui="{ base: 'h-[5.5rem] rounded-[22px] px-5 text-[1.1rem]' }"
        />
      </UFormField>
    </div>

    <UFormField
      :label="descriptionLabel || $t('pages.productEditor.descriptionLabel')"
      size="xl"
      class="mt-8 space-y-2"
    >
      <UTextarea
        v-model="description"
        autoresize
        :rows="5"
        :placeholder="$t('pages.productEditor.descriptionPlaceholder')"
        class="w-full"
        :ui="{ base: 'min-h-[210px] rounded-[22px] px-5 py-5 text-[1rem] leading-8' }"
      />
    </UFormField>

    <div class="mt-8 grid gap-5 md:grid-cols-[minmax(0,1fr)_360px]">
      <UFormField :label="$t('pages.productEditor.categoryLabel')" size="xl" class="space-y-2">
        <USelect
          v-model="categoryModel"
          :items="categoryOptions"
          value-key="value"
          label-key="label"
          size="xl"
          class="w-full"
          :ui="{ base: 'h-[5.5rem] rounded-[22px] px-5 text-[1.1rem] font-medium' }"
        />
      </UFormField>

      <UFormField :label="$t('pages.productEditor.conditionLabel')" size="xl" class="space-y-2">
        <USelect
          v-model="conditionModel"
          :items="conditionOptions"
          value-key="value"
          label-key="label"
          size="xl"
          class="w-full"
          :ui="{ base: 'h-[5.5rem] rounded-[22px] px-5 text-[1.1rem] font-medium' }"
        />
      </UFormField>
    </div>

    <div class="mt-8 grid gap-5 md:grid-cols-[minmax(0,1fr)_360px]">
      <UFormField :label="$t('pages.productEditor.locationLabel')" size="xl" class="space-y-2">
        <UInput
          v-model="location"
          size="xl"
          color="neutral"
          :leading-icon="'i-ph-magnifying-glass-bold'"
          :placeholder="$t('pages.productEditor.locationPlaceholder')"
          class="w-full"
          :ui="{ base: 'h-[5.5rem] rounded-[22px] px-5 text-[1.1rem]' }"
        />
      </UFormField>

      <UFormField :label="$t('pages.productEditor.currencyLabel')" size="xl" class="space-y-2">
        <USelect
          v-model="currencyModel"
          :items="currencyOptions"
          value-key="value"
          label-key="label"
          size="xl"
          class="w-full"
          :ui="{ base: 'h-[5.5rem] rounded-[22px] px-5 text-[1.1rem] font-medium' }"
        />
      </UFormField>
    </div>

    <div class="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
      <UFormField :label="$t('pages.productEditor.stockLabel')" size="xl" class="space-y-2">
        <UInputNumber
          v-model="stockValue"
          size="xl"
          orientation="vertical"
          :min="0"
          :step="1"
          class="w-full"
          :ui="{ base: 'h-[5.5rem] rounded-[22px] px-5 text-[1.1rem]' }"
        />
      </UFormField>

      <div class="flex items-end justify-start lg:justify-end">
        <UBadge color="neutral" variant="soft" class="rounded-full px-4 py-3 text-[13px] font-semibold">
          {{ mediaSummary }}
        </UBadge>
      </div>
    </div>

    <UAlert
      class="mt-8 rounded-[22px]"
      color="primary"
      variant="subtle"
      icon="i-ph-info-fill"
      :description="$t('pages.productEditor.descriptionPlaceholder')"
    />

    <div class="mt-8">
      <slot name="media" />
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type {
  CategoryValue,
  ConditionValue,
  CurrencyValue,
  ProductOption,
} from "../../domain/types/product-editor.types"

const props = withDefaults(defineProps<{
  categoryOptions: ProductOption<CategoryValue>[]
  conditionOptions: ProductOption<ConditionValue>[]
  currencyOptions: ProductOption<CurrencyValue>[]
  mediaSummary: string
  descriptionLabel?: string
}>(), {
  descriptionLabel: undefined,
})

const title = defineModel<string>("title", { required: true })
const price = defineModel<string>("price", { required: true })
const description = defineModel<string>("description", { required: true })
const category = defineModel<CategoryValue>("category", { required: true })
const condition = defineModel<ConditionValue>("condition", { required: true })
const location = defineModel<string>("location", { required: true })
const currency = defineModel<CurrencyValue>("currency", { required: true })
const stock = defineModel<string>("stock", { required: true })

const normalizeSelectValue = <T extends string>(
  value: unknown,
  options: ProductOption<T>[],
  fallback: T,
): T => {
  if (typeof value === "string" && options.some(option => option.value === value)) {
    return value as T
  }

  if (
    typeof value === "object"
    && value !== null
    && "value" in value
    && typeof value.value === "string"
    && options.some(option => option.value === value.value)
  ) {
    return value.value as T
  }

  return fallback
}

const categoryFallback = computed(() => props.categoryOptions[0]?.value ?? "vehicles")
const conditionFallback = computed(() => props.conditionOptions[0]?.value ?? "new")
const currencyFallback = computed(() => props.currencyOptions[0]?.value ?? "USD")

const categoryModel = computed<CategoryValue>({
  get: () => normalizeSelectValue(category.value, props.categoryOptions, categoryFallback.value),
  set: value => {
    category.value = normalizeSelectValue(value, props.categoryOptions, categoryFallback.value)
  },
})

const conditionModel = computed<ConditionValue>({
  get: () => normalizeSelectValue(condition.value, props.conditionOptions, conditionFallback.value),
  set: value => {
    condition.value = normalizeSelectValue(value, props.conditionOptions, conditionFallback.value)
  },
})

const currencyModel = computed<CurrencyValue>({
  get: () => normalizeSelectValue(currency.value, props.currencyOptions, currencyFallback.value),
  set: value => {
    currency.value = normalizeSelectValue(value, props.currencyOptions, currencyFallback.value)
  },
})

const priceValue = computed<number | undefined>({
  get: () => {
    const value = Number(price.value)
    return Number.isFinite(value) ? value : undefined
  },
  set: value => {
    price.value = value === undefined || value === null ? "" : String(value)
  },
})

const stockValue = computed<number | undefined>({
  get: () => {
    const value = Number(stock.value)
    return Number.isFinite(value) ? value : undefined
  },
  set: value => {
    stock.value = value === undefined || value === null ? "" : String(value)
  },
})
</script>
