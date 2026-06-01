<!-- English description: Wowonder-aligned product creation form that submits multipart data through the Nuxt API bridge. -->

<template>
  <div class="new-product-page mx-auto w-full max-w-[980px] px-3 pb-12 pt-4 sm:px-4">
    <section class="new-product-heading">
      <div class="new-product-heading__inner">
        <span>
          <Icon name="i-ph-storefront-fill" class="h-5 w-5" />
        </span>
        <h1>Tạo sản phẩm</h1>
      </div>
    </section>

    <form class="new-product-form" @submit.prevent="submitProduct">
      <div class="new-product-row new-product-row--name-price">
        <label class="new-product-field">
          <span>Tên sản phẩm</span>
          <input v-model="draft.fields.title" type="text" autocomplete="off">
        </label>

        <label class="new-product-field">
          <span>Giá bán</span>
          <input v-model="draft.fields.price" type="text" inputmode="decimal" placeholder="0.00">
        </label>
      </div>

      <label class="new-product-field">
        <span>Mô tả sản phẩm</span>
        <textarea
          v-model="draft.fields.description"
          rows="4"
          placeholder="Mô tả sản phẩm"
        />
      </label>

      <div class="new-product-row new-product-row--category">
        <label class="new-product-field">
          <span>Loại</span>
          <select v-model="draft.fields.category" :disabled="categoryOptions.length === 0">
            <option v-if="categoryOptions.length === 0" value="">
              Không có danh mục
            </option>
            <option v-for="option in categoryOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <label class="new-product-field">
          <span>Loại hình</span>
          <select v-model="draft.fields.condition">
            <option v-for="option in conditionOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
      </div>

      <div v-if="subCategoryOptions.length > 0" class="new-product-row new-product-row--stock">
        <label class="new-product-field">
          <span>Danh mục con</span>
          <select v-model="selectedSubCategory">
            <option v-for="option in subCategoryOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
      </div>

      <div class="new-product-row new-product-row--location">
        <label class="new-product-field">
          <span>Địa điểm</span>
          <input
            v-model="draft.fields.location"
            type="text"
            autocomplete="off"
            placeholder="Địa điểm"
          >
        </label>

        <label class="new-product-field">
          <span>Tiền tệ</span>
          <select v-model="draft.fields.currency">
            <option v-for="option in currencyOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
      </div>

      <div class="new-product-row new-product-row--stock">
        <label class="new-product-field">
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

      <div class="new-product-media">
        <label>Hình ảnh</label>
        <div class="new-product-images">
          <button
            type="button"
            class="new-product-upload"
            @click="fileInput?.click()"
          >
            <Icon name="i-ph-camera-fill" class="h-7 w-7" />
          </button>

          <span
            v-for="preview in newFilePreviews"
            :key="preview.key"
            class="new-product-thumb"
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

      <div class="new-product-actions">
        <NuxtLink to="/my-products" class="new-product-back">
          <Icon name="i-ph-arrow-left" class="h-4 w-4" />
          Quay lại
        </NuxtLink>
        <button type="submit" class="new-product-submit" :disabled="isSubmitting">
          {{ isSubmitting ? "Đang đăng..." : "Đăng" }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import type { ProductEditorDraft } from "../../domain/types/product-editor.types"
import type { ProductCategoryOption, ProductSubCategoryOption } from "../../domain/types/product-marketplace.types"
import { watchDebounced } from "@vueuse/core"
import { useProductEditorDraft } from "../../application/composables/useProductEditorDraft"
import { createApiProductRepository } from "../../infrastructure/repositories/ApiProductRepository"
import { useNuxtApiClient } from "../../../shared-kernel/infrastructure/http/nuxt-api-client"

type FilePreview = {
  index: number
  key: string
  name: string
  src: string
}

const toast = useToast()
const productRepository = createApiProductRepository()
const apiClient = useNuxtApiClient()
const fileInput = ref<HTMLInputElement | null>(null)
const newFiles = shallowRef<File[]>([])
const newFilePreviews = shallowRef<FilePreview[]>([])
const selectedSubCategory = ref("")
const isSubmitting = ref(false)
const stockInput = ref("")
const hasTouchedStockInput = ref(false)

const conditionOptions = [
  { label: "Mới", value: "new" },
  { label: "Đã sử dụng", value: "used" },
] as const

const currencyOptions = [
  { label: "VND (đ)", value: "VND" },
  { label: "USD ($)", value: "USD" },
  { label: "EUR (€)", value: "EUR" },
] as const

const createInitialDraft = (): ProductEditorDraft => ({
  mode: "create",
  fields: {
    title: "",
    price: "",
    description: "",
    category: "",
    condition: "new",
    location: "",
    currency: "VND",
    stock: "",
  },
  removedImageIds: [],
  lastSavedAt: null,
})

const { draft, markSaved, resetDraft } = useProductEditorDraft("product-editor:create", createInitialDraft())
stockInput.value = draft.value.fields.stock

const { data: marketplaceData } = useAsyncData(
  "product:create:categories",
  () => productRepository.list({ limit: 1 }),
  {
    default: () => ({
      items: [],
      hasMore: false,
      nextOffset: null,
      categories: [] as ProductCategoryOption[],
      subCategories: [] as ProductSubCategoryOption[],
      distanceFilterAvailable: false,
    }),
  },
)

const categoryOptions = computed(() => marketplaceData.value?.categories ?? [])

const subCategoryOptions = computed(() =>
  (marketplaceData.value?.subCategories ?? []).filter(
    option => option.parentId === draft.value.fields.category,
  ),
)

watch(
  () => categoryOptions.value.map(option => option.value).join("|"),
  () => {
    const options = categoryOptions.value

    if (draft.value.fields.category && options.some(option => option.value === draft.value.fields.category)) {
      return
    }

    draft.value.fields.category = options[0]?.value ?? ""
  },
  { immediate: true },
)

watch(
  () => draft.value.fields.category,
  () => {
    const options = subCategoryOptions.value

    if (selectedSubCategory.value && options.some(option => option.value === selectedSubCategory.value)) {
      return
    }

    selectedSubCategory.value = options[0]?.value ?? ""
  },
  { immediate: true },
)

watch(
  () => subCategoryOptions.value.map(option => option.value).join("|"),
  () => {
    const options = subCategoryOptions.value

    if (selectedSubCategory.value && options.some(option => option.value === selectedSubCategory.value)) {
      return
    }

    selectedSubCategory.value = options[0]?.value ?? ""
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

const removeNewFile = (index: number) => {
  newFiles.value = newFiles.value.filter((_, fileIndex) => fileIndex !== index)
  if (fileInput.value) {
    fileInput.value.value = ""
  }
  refreshFilePreviews()
}

watchDebounced(
  [() => draft.value.fields, () => newFiles.value.length],
  () => {
    markSaved()
  },
  { deep: true, debounce: 800, maxWait: 2000 },
)

const ensureCategory = () => {
  const categoryExists = categoryOptions.value.some(category => category.value === draft.value.fields.category)

  if (!draft.value.fields.category || !categoryExists) {
    draft.value.fields.category = categoryOptions.value[0]?.value ?? ""
  }
}

const validateForm = () => {
  ensureCategory()

  const fields = draft.value.fields
  const price = Number(fields.price)

  if (!fields.title.trim() || !fields.description.trim() || !fields.location.trim() || !fields.category) {
    toast.add({
      title: "Thiếu thông tin sản phẩm",
      description: "Vui lòng nhập tên, mô tả, danh mục và địa điểm.",
      color: "error",
    })
    return false
  }

  if (!Number.isFinite(price) || price <= 0) {
    toast.add({
      title: "Giá bán không hợp lệ",
      description: "Giá bán phải là số lớn hơn 0.",
      color: "error",
    })
    return false
  }

  if (newFiles.value.length === 0) {
    toast.add({
      title: "Chưa có hình ảnh",
      description: "Vui lòng chọn ít nhất một ảnh sản phẩm.",
      color: "error",
    })
    return false
  }

  return true
}

const submitProduct = async () => {
  if (isSubmitting.value || !validateForm()) {
    return
  }

  const fields = draft.value.fields
  const form = new FormData()
  fields.stock = stockInput.value

  form.append("product_title", fields.title.trim())
  form.append("product_category", fields.category)
  form.append("product_description", fields.description.trim())
  form.append("product_price", fields.price.trim())
  form.append("product_location", fields.location.trim())
  form.append("product_type", fields.condition === "used" ? "1" : "0")
  form.append("currency", fields.currency)

  if (selectedSubCategory.value) {
    form.append("product_sub_category", selectedSubCategory.value)
  }

  if (fields.stock.trim()) {
    form.append("units", fields.stock.trim())
  }

  for (const file of newFiles.value) {
    form.append("images[]", file, file.name)
  }

  isSubmitting.value = true

  try {
    const response = await apiClient.post<{ id?: string; postId?: string }, FormData>("product/create", form)
    markSaved()
    resetDraft(createInitialDraft())
    stockInput.value = ""
    newFiles.value = []
    revokePreviews()
    if (fileInput.value) {
      fileInput.value.value = ""
    }
    toast.add({
      title: "Đã đăng sản phẩm",
      color: "success",
    })

    await navigateTo(response.postId ? `/post/${encodeURIComponent(response.postId)}` : "/my-products")
  }
  catch (error) {
    toast.add({
      title: "Không thể đăng sản phẩm",
      description: error instanceof Error ? error.message : String(error),
      color: "error",
    })
  }
  finally {
    isSubmitting.value = false
  }
}

onBeforeUnmount(() => {
  revokePreviews()
})
</script>

<style scoped>
.new-product-heading,
.new-product-form {
  border: 1px solid #dbe3f2;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 2px 6px rgba(13, 38, 76, 0.08);
}

.new-product-heading {
  margin-bottom: 16px;
}

.new-product-heading__inner {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 58px;
  padding: 0 16px;
}

.new-product-heading__inner span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  color: #ffffff;
  background: #0000ff;
}

.new-product-heading h1 {
  margin: 0;
  color: #111827;
  font-size: 20px;
  font-weight: 900;
}

.new-product-form {
  padding: 18px;
}

.new-product-row {
  display: grid;
  gap: 14px;
  margin-bottom: 14px;
}

.new-product-row--name-price,
.new-product-row--location {
  grid-template-columns: minmax(0, 1fr) 220px;
}

.new-product-row--category {
  grid-template-columns: minmax(0, 1fr) 220px;
}

.new-product-row--stock {
  grid-template-columns: minmax(0, 1fr);
}

.new-product-field {
  display: grid;
  gap: 7px;
  margin-bottom: 14px;
}

.new-product-field span,
.new-product-media > label {
  color: #555555;
  font-size: 13px;
  font-weight: 800;
}

.new-product-field input,
.new-product-field textarea,
.new-product-field select {
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

.new-product-field input,
.new-product-field select {
  height: 42px;
  padding: 0 12px;
}

.new-product-field textarea {
  min-height: 112px;
  resize: vertical;
  padding: 12px;
  line-height: 1.6;
}

.new-product-field input:focus,
.new-product-field textarea:focus,
.new-product-field select:focus {
  border-color: #0000ff;
  box-shadow: 0 0 0 3px rgba(0, 0, 255, 0.08);
}

.new-product-field select:disabled {
  color: #8a9bb2;
  background: #f4f7fb;
}

.new-product-media {
  display: grid;
  gap: 8px;
  margin-top: 2px;
}

.new-product-images {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.new-product-upload,
.new-product-thumb {
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

.new-product-upload {
  color: #344258;
  cursor: pointer;
}

.new-product-thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.new-product-thumb button {
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

.new-product-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 18px;
}

.new-product-back,
.new-product-submit {
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

.new-product-back {
  color: #344258;
  background: #eef3fb;
}

.new-product-submit {
  min-width: 124px;
  color: #ffffff;
  background: #0000ff;
}

.new-product-submit:disabled {
  cursor: progress;
  opacity: 0.68;
}

@media (max-width: 760px) {
  .new-product-row--name-price,
  .new-product-row--location,
  .new-product-row--category {
    grid-template-columns: 1fr;
  }
}
</style>
