<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <div class="addr-picker">
        <div class="addr-picker-header">
          <h3 class="addr-picker-title">{{ $t("checkout.shippingForm.selectAddress") }}</h3>
          <button type="button" class="addr-picker-close" @click="isOpen = false">
            <Icon name="i-ph-x" class="h-5 w-5" />
          </button>
        </div>

        <button
          type="button"
          class="addr-picker-add-new-btn"
          @click="onAddNewAddress"
        >
          <Icon name="i-ph-plus-bold" class="h-4 w-4" />
          <span>{{ $t("checkout.shippingForm.addNewAddress") }}</span>
        </button>

        <div v-if="loading" class="addr-picker-loading">
          <UProgress animation="carousel" />
          <p class="addr-picker-loading-text">{{ $t("checkout.shippingForm.loadingAddresses") }}</p>
        </div>

        <div v-else-if="addresses.length === 0" class="addr-picker-empty">
          <Icon name="i-ph-map-pin" class="h-8 w-8 addr-picker-empty-icon" />
          <p>{{ $t("checkout.shippingForm.noAddresses") }}</p>
        </div>

        <div v-else class="addr-picker-list">
          <div
            v-for="addr in addresses"
            :key="addr.id || addr.phone"
            class="addr-picker-card"
            :class="{ 'is-deleting': isDeleting === addr.id }"
          >
            <button
              type="button"
              class="addr-picker-info-btn"
              @click="selectAddress(addr)"
            >
              <div class="addr-picker-item-name">{{ addr.fullName }}</div>
              <div class="addr-picker-item-phone">{{ addr.phone }}</div>
              <div class="addr-picker-item-detail">
                {{ [addr.streetAddress, addr.city, addr.country].filter(Boolean).join(', ') }}
              </div>
            </button>

            <div class="addr-picker-actions">
              <button
                type="button"
                class="addr-picker-action-btn edit-btn"
                @click.stop="editAddress(addr)"
                :title="$t('checkout.shippingForm.editAddress')"
              >
                <Icon name="i-ph-pencil-simple-line-bold" class="h-4 w-4" />
              </button>
              <button
                type="button"
                class="addr-picker-action-btn delete-btn"
                @click.stop="deleteAddress(addr)"
                :disabled="isDeleting !== null"
                :title="$t('checkout.shippingForm.deleteAddress')"
              >
                <Icon v-if="isDeleting === addr.id" name="i-ph-spinner-gap-bold" class="h-4 w-4 animate-spin" />
                <Icon v-else name="i-ph-trash-bold" class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { SavedShippingAddress } from "../../domain/types/checkout.types"

const props = defineProps<{
  fetchAddresses: () => Promise<SavedShippingAddress[]>
  deleteAddress?: (addressId: string) => Promise<void>
}>()

const isOpen = defineModel<boolean>("open", { default: false })

const emit = defineEmits<{
  select: [address: SavedShippingAddress]
  'add-new': []
  edit: [address: SavedShippingAddress]
}>()

const { t } = useI18n()
const toast = useToast()

const onAddNewAddress = () => {
  emit("add-new")
  isOpen.value = false
}

const loading = ref(true)
const addresses = ref<SavedShippingAddress[]>([])
const isDeleting = ref<string | null>(null)

const loadAddresses = async () => {
  loading.value = true
  try {
    addresses.value = await props.fetchAddresses()
  }
  catch {
    addresses.value = []
  }
  finally {
    loading.value = false
  }
}

const selectAddress = (addr: SavedShippingAddress) => {
  emit("select", addr)
  isOpen.value = false
}

const editAddress = (addr: SavedShippingAddress) => {
  emit("edit", addr)
  isOpen.value = false
}

const deleteAddress = async (addr: SavedShippingAddress) => {
  if (!addr.id || !props.deleteAddress) return

  if (!confirm(t("checkout.shippingForm.confirmDeleteAddress"))) {
    return
  }

  isDeleting.value = addr.id
  try {
    await props.deleteAddress(addr.id)
    toast.add({
      title: t("checkout.shippingForm.deleteSuccessTitle"),
      description: t("checkout.shippingForm.deleteSuccessDescription"),
      color: "success",
    })
    await loadAddresses()
  }
  catch {
    toast.add({
      title: t("checkout.shippingForm.deleteErrorTitle"),
      description: t("checkout.shippingForm.deleteErrorDescription"),
      color: "error",
    })
  }
  finally {
    isDeleting.value = null
  }
}

watch(isOpen, (val) => {
  if (val) {
    loadAddresses()
  }
})
</script>

<style scoped>
.addr-picker {
  padding: 16px;
  width: 100%;
  box-sizing: border-box;
}

@media (min-width: 480px) {
  .addr-picker {
    padding: 24px;
    min-width: 420px;
  }
}

.addr-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.addr-picker-title {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: #111827;
}

.addr-picker-close {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: background 0.15s;
}

.addr-picker-close:hover {
  background: #f3f4f6;
  color: #111827;
}

.addr-picker-loading {
  padding: 32px 0;
  text-align: center;
}

.addr-picker-loading-text {
  margin-top: 12px;
  font-size: 14px;
  color: #6b7280;
}

.addr-picker-empty {
  text-align: center;
  padding: 40px 0;
  color: #6b7280;
  font-size: 14px;
}

.addr-picker-empty-icon {
  color: #d1d5db;
  margin-bottom: 12px;
}

.addr-picker-add-new-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px;
  margin-bottom: 16px;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  color: #4361ee;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.addr-picker-add-new-btn:hover {
  background: #f1f5f9;
  border-color: #4361ee;
  color: #3b52d9;
}

.addr-picker-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.addr-picker-card {
  display: flex;
  align-items: stretch;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.addr-picker-card:hover {
  border-color: #4361ee;
  box-shadow: 0 4px 12px rgba(67, 97, 238, 0.05);
}

.addr-picker-card.is-deleting {
  opacity: 0.5;
  pointer-events: none;
}

.addr-picker-info-btn {
  flex: 1;
  text-align: left;
  background: none;
  border: none;
  padding: 16px;
  cursor: pointer;
  width: 100%;
}

.addr-picker-item-name {
  font-size: 15px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 2px;
}

.addr-picker-item-phone {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 6px;
}

.addr-picker-item-detail {
  font-size: 13px;
  color: #4b5563;
  line-height: 1.4;
}

.addr-picker-actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  border-left: 1px solid #f3f4f6;
  background: #fafafa;
}

.addr-picker-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.addr-picker-action-btn.edit-btn {
  color: #4361ee;
}

.addr-picker-action-btn.edit-btn:hover {
  background: rgba(67, 97, 238, 0.08);
  border-color: #4361ee;
}

.addr-picker-action-btn.delete-btn {
  color: #ef4444;
}

.addr-picker-action-btn.delete-btn:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.08);
  border-color: #ef4444;
}

.addr-picker-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
