<!-- English description: Wowonder-aligned product edit form that saves fields through the backend API bridge. -->

<template>
  <div class="edit-product-page mx-auto w-full max-w-[980px] px-3 pb-12 pt-4 sm:px-4">
    <section class="edit-product-heading">
      <div class="edit-product-heading__inner">
        <span>
          <Icon name="i-ph-shopping-bag-open-fill" class="h-5 w-5" />
        </span>
        <h1>Sửa sản phẩm</h1>
      </div>
    </section>

    <form class="edit-product-form" @submit.prevent="submitProduct">
      <div class="edit-product-row edit-product-row--name-price">
        <label class="edit-product-field">
          <span>{{ $t("pages.productEditor.titleLabel") || "Tên" }}</span>
          <input v-model="draft.fields.title" type="text">
        </label>

        <label class="edit-product-field">
          <span>{{ $t("pages.productEditor.priceLabel") || "Giá" }}</span>
          <input v-model="draft.fields.price" type="text" placeholder="0.00">
        </label>
      </div>

      <label class="edit-product-field">
        <span>{{ $t("pages.productEditor.descriptionLabel") || "Mô tả" }}</span>
        <textarea
          v-model="draft.fields.description"
          rows="4"
          :placeholder="$t('pages.productEditor.descriptionPlaceholder')"
        />
      </label>

      <div class="edit-product-row edit-product-row--category">
        <label class="edit-product-field">
          <span>Loại</span>
          <select v-model="draft.fields.category">
            <option v-for="option in categoryOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <label class="edit-product-field">
          <span>Loại hình</span>
          <select v-model="draft.fields.condition">
            <option v-for="option in conditionOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
      </div>

      <div class="edit-product-row edit-product-row--location">
        <label class="edit-product-field">
          <span>Địa điểm</span>
          <input
            v-model="draft.fields.location"
            type="text"
            :placeholder="$t('pages.productEditor.locationPlaceholder')"
          >
        </label>

        <label class="edit-product-field">
          <span>Tiền tệ</span>
          <select v-model="draft.fields.currency">
            <option v-for="option in currencyOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
      </div>

      <div class="edit-product-row edit-product-row--stock">
        <label class="edit-product-field">
          <span>Tổng số đơn vị mặt hàng</span>
          <input
            v-model="stockInput"
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            autocomplete="off"
            @input="hasTouchedStockInput = true"
          >
        </label>
      </div>

      <div class="edit-product-media">
        <label>Ảnh</label>
        <div class="edit-product-images">
          <button
            type="button"
            class="edit-product-upload"
            @click="fileInput?.click()"
          >
            <Icon name="i-ph-camera-fill" class="h-7 w-7" />
          </button>

          <span
            v-for="image in currentImages"
            :key="image.id"
            class="edit-product-thumb"
          >
            <button type="button" @click="removeCurrentImage(image.id)">
              <Icon name="i-ph-x-bold" class="h-3.5 w-3.5" />
            </button>
            <img :src="image.src" :alt="image.alt">
          </span>

          <span
            v-for="preview in newFilePreviews"
            :key="preview.key"
            class="edit-product-thumb"
          >
            <button type="button" @click="removeNewFile(preview.index)">
              <Icon name="i-ph-x-bold" class="h-3.5 w-3.5" />
            </button>
            <img :src="preview.src" :alt="preview.name">
          </span>
        </div>
        <input
          ref="fileInput"
          class="hidden"
          type="file"
          accept="image/*"
          multiple
          @change="handleFileInput"
        >
      </div>

      <div class="edit-product-actions">
        <NuxtLink to="/my-products" class="edit-product-back">
          <Icon name="i-ph-arrow-left" class="h-4 w-4" />
          Quay lại
        </NuxtLink>
        <button type="submit" class="edit-product-submit">
          Lưu
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import type {
  ProductEditorDraft,
  ProductRecord,
} from "../../domain/types/product-editor.types"
import { watchDebounced } from "@vueuse/core"
import { useProductEditorDraft } from "../../application/composables/useProductEditorDraft"
import { useProductEditorMeta } from "../../application/composables/useProductEditorMeta"
import { createApiProductRepository } from "../../infrastructure/repositories/ApiProductRepository"

type FilePreview = {
  index: number
  key: string
  name: string
  src: string
}

const props = defineProps<{
  productId: string
}>()

const { t } = useI18n()
const toast = useToast()
const productRepository = createApiProductRepository()
const fileInput = ref<HTMLInputElement | null>(null)
const newFiles = shallowRef<File[]>([])
const newFilePreviews = shallowRef<FilePreview[]>([])
const stockInput = ref("")
const hasTouchedStockInput = ref(false)

const {
  conditionOptions,
  currencyOptions,
} = useProductEditorMeta()

const { data: marketplaceData } = useAsyncData(
  "product:editor:categories",
  () => productRepository.list({ limit: 1 }),
  {
    default: () => ({
      items: [],
      hasMore: false,
      nextOffset: null,
      categories: [],
      subCategories: [],
      distanceFilterAvailable: false,
    }),
  },
)

const { data: productData } = useAsyncData(
  `product:editor:${props.productId}`,
  () => productRepository.getById(props.productId),
)
const activeProduct = computed(() => productData.value)
const storageKey = computed(() => `product-editor:edit:${props.productId}`)

const emptyProduct = computed<ProductRecord>(() => ({
  id: props.productId,
  title: "",
  description: "",
  category: "home",
  condition: "new",
  location: "",
  currency: "VND",
  price: 0,
  stock: 0,
  images: [],
  updatedAt: "",
}))

const createDraftFromProduct = (product: ProductRecord): ProductEditorDraft => ({
  mode: "edit",
  productId: props.productId,
  fields: {
    title: product.title,
    price: product.price > 0 ? String(product.price) : "",
    description: product.description,
    category: product.category,
    condition: product.condition,
    location: product.location,
    currency: product.currency,
    stock: Number.isFinite(product.stock) && product.stock > 0 ? String(product.stock) : "",
  },
  removedImageIds: [],
  lastSavedAt: null,
})

const { draft, replaceSource, markSaved } = useProductEditorDraft(storageKey, createDraftFromProduct(activeProduct.value ?? emptyProduct.value))
stockInput.value = draft.value.fields.stock
const currentImages = computed(() =>
  (activeProduct.value?.images ?? []).filter(image => !draft.value.removedImageIds.includes(image.id)),
)

const categoryOptions = computed(() => {
  const categories = [...(marketplaceData.value?.categories ?? [])]
  const product = activeProduct.value
  const currentCategory = draft.value.fields.category || product?.category || ""
  const currentCategoryLabel = product?.categoryLabel || currentCategory
  const hasReadableCurrentCategory = currentCategoryLabel && currentCategoryLabel !== currentCategory

  if (
    currentCategory
    && hasReadableCurrentCategory
    && !categories.some(category => category.value === currentCategory)
  ) {
    categories.unshift({
      value: currentCategory,
      label: currentCategoryLabel,
    })
  }

  return categories
})

watch(
  () => [activeProduct.value?.category, categoryOptions.value.map(category => category.value).join("|")] as const,
  ([category]) => {
    const options = categoryOptions.value
    const currentCategory = draft.value.fields.category || category || ""

    if (currentCategory && options.some(option => option.value === currentCategory)) {
      draft.value.fields.category = currentCategory
      return
    }

    if (options[0]?.value) {
      draft.value.fields.category = options[0].value
    }
  },
  { immediate: true },
)

const revokePreviews = () => {
  newFilePreviews.value.forEach((preview) => {
    URL.revokeObjectURL(preview.src)
  })
  newFilePreviews.value = []
}

const refreshFilePreviews = () => {
  if (!import.meta.client) return

  revokePreviews()
  newFilePreviews.value = newFiles.value.map((file, index) => ({
    index,
    key: `${file.name}-${file.lastModified}-${index}`,
    name: file.name,
    src: URL.createObjectURL(file),
  }))
}

const handleFileInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  newFiles.value = Array.from(input.files ?? [])
  refreshFilePreviews()
}

const removeCurrentImage = (imageId: string) => {
  if (!draft.value.removedImageIds.includes(imageId)) {
    draft.value.removedImageIds.push(imageId)
  }
}

const removeNewFile = (index: number) => {
  newFiles.value = newFiles.value.filter((_, fileIndex) => fileIndex !== index)
  if (fileInput.value) {
    fileInput.value.value = ""
  }
  refreshFilePreviews()
}

watch(
  () => activeProduct.value,
  () => {
    const nextProduct = activeProduct.value ?? emptyProduct.value

    replaceSource(createDraftFromProduct(nextProduct))

    if (Number.isFinite(nextProduct.stock) && nextProduct.stock > 0) {
      draft.value.fields.stock = String(nextProduct.stock)
      stockInput.value = String(nextProduct.stock)
    }
    else {
      stockInput.value = draft.value.fields.stock
    }

    newFiles.value = []
    revokePreviews()
    if (fileInput.value) {
      fileInput.value.value = ""
    }
  },
  { immediate: true },
)

watch(
  stockInput,
  (value) => {
    const normalized = value.replace(/\D/g, "")

    if (normalized !== value) {
      stockInput.value = normalized
      return
    }

    if (draft.value.fields.stock !== normalized) {
      draft.value.fields.stock = normalized
    }
  },
)

watch(
  () => draft.value.fields.stock,
  (value) => {
    if (hasTouchedStockInput.value) {
      return
    }

    if (value !== stockInput.value) {
      stockInput.value = value
    }
  },
)

watchDebounced(
  [() => draft.value.fields, () => draft.value.removedImageIds.slice(), () => newFiles.value.length],
  () => {
    markSaved()
  },
  { deep: true, debounce: 800, maxWait: 2000 },
)

const submitProduct = async () => {
  draft.value.fields.stock = stockInput.value

  const categoryExists = categoryOptions.value.some(category => category.value === draft.value.fields.category)
  if (!draft.value.fields.category || !categoryExists) {
    const fallbackCategory = categoryOptions.value[0]?.value

    if (fallbackCategory) {
      draft.value.fields.category = fallbackCategory
    }
  }

  try {
    await productRepository.update(props.productId, draft.value)
    markSaved()
    toast.add({
      title: t("pages.editProductPage.updateSuccessTitle"),
      color: "success",
    })
  }
  catch (error) {
    toast.add({
      title: t("pages.editProductPage.updateErrorTitle"),
      description: error instanceof Error ? error.message : String(error),
      color: "error",
    })
  }
}

onBeforeUnmount(() => {
  revokePreviews()
})
</script>

<style scoped>
.edit-product-heading,
.edit-product-form {
  border: 1px solid #dbe3f2;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 2px 6px rgba(13, 38, 76, 0.08);
}

.edit-product-heading {
  margin-bottom: 16px;
}

.edit-product-heading__inner {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 58px;
  padding: 0 16px;
}

.edit-product-heading__inner span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  color: #ffffff;
  background: #0000ff;
}

.edit-product-heading h1 {
  margin: 0;
  color: #111827;
  font-size: 20px;
  font-weight: 900;
}

.edit-product-form {
  padding: 18px;
}

.edit-product-row {
  display: grid;
  gap: 14px;
  margin-bottom: 14px;
}

.edit-product-row--name-price,
.edit-product-row--location {
  grid-template-columns: minmax(0, 1fr) 220px;
}

.edit-product-row--category {
  grid-template-columns: minmax(0, 1fr) 220px;
}

.edit-product-row--stock {
  grid-template-columns: minmax(0, 1fr);
}

.edit-product-field {
  display: grid;
  gap: 7px;
  margin-bottom: 14px;
}

.edit-product-field span,
.edit-product-media > label {
  color: #555555;
  font-size: 13px;
  font-weight: 800;
}

.edit-product-field input,
.edit-product-field textarea,
.edit-product-field select {
  width: 100%;
  border: 1px solid #dbe3f2;
  border-radius: 4px;
  outline: 0;
  background: #ffffff;
  color: #111827;
  font-size: 15px;
  font-weight: 500;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.edit-product-field input,
.edit-product-field select {
  height: 42px;
  padding: 0 12px;
}

.edit-product-field textarea {
  min-height: 112px;
  resize: vertical;
  padding: 12px;
  line-height: 1.6;
}

.edit-product-field input:focus,
.edit-product-field textarea:focus,
.edit-product-field select:focus {
  border-color: #0000ff;
  box-shadow: 0 0 0 3px rgba(0, 0, 255, 0.08);
}

.edit-product-media {
  display: grid;
  gap: 8px;
  margin-top: 2px;
}

.edit-product-images {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.edit-product-upload,
.edit-product-thumb {
  position: relative;
  display: inline-flex;
  overflow: hidden;
  width: 92px;
  height: 92px;
  align-items: center;
  justify-content: center;
  border: 1px solid #dbe3f2;
  border-radius: 4px;
  background: #eef3fb;
}

.edit-product-upload {
  color: #344258;
  cursor: pointer;
}

.edit-product-thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.edit-product-thumb button {
  position: absolute;
  top: 5px;
  right: 5px;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 999px;
  color: #ffffff;
  background: rgba(0, 0, 0, 0.68);
  cursor: pointer;
}

.edit-product-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 18px;
}

.edit-product-back,
.edit-product-submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 40px;
  border-radius: 4px;
  border: 0;
  cursor: pointer;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 900;
  text-decoration: none;
}

.edit-product-back {
  color: #344258;
  background: #eef3fb;
}

.edit-product-submit {
  color: #ffffff;
  background: #0000ff;
}

@media (max-width: 760px) {
  .edit-product-row--name-price,
  .edit-product-row--location,
  .edit-product-row--category {
    grid-template-columns: 1fr;
  }
}
</style>
