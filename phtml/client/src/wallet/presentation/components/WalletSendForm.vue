<!-- English description: Inline send-money form that searches real backend recipients before transfer. -->
<template>
    <div v-if="open" class="space-y-5">
        <UFormField :label="t('pages.walletPage.amountLabel')">
          <UInputNumber
            v-model="draft.amount"
            :min="1"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="t('pages.walletPage.transferContent')">
          <UTextarea
            v-model="transferNote"
            :rows="3"
            :placeholder="t('pages.walletPage.transferContentPlaceholder')"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="t('pages.walletPage.searchRecipient')">
          <UInput
            v-model="recipientQuery"
            icon="i-ph-magnifying-glass-duotone"
            :loading="searching"
            :placeholder="t('pages.walletPage.searchRecipientPlaceholder')"
            class="w-full"
          />
        </UFormField>

        <div class="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <UInput
            v-model="qrPayload"
            icon="i-ph-qr-code-duotone"
            :placeholder="t('pages.walletPage.qrPayloadPlaceholder')"
            class="w-full"
          />
          <UButton
            color="neutral"
            variant="soft"
            class="rounded-full font-semibold"
            icon="i-ph-scan-duotone"
            @click="applyQrPayload"
          >
            {{ t("pages.walletPage.applyQr") }}
          </UButton>
          <UButton
            color="neutral"
            variant="soft"
            class="rounded-full font-semibold"
            :icon="scanning ? 'i-ph-x-duotone' : 'i-ph-camera-duotone'"
            @click="scanning ? stopQrScan() : startQrScan()"
          >
            {{ scanning ? t("pages.walletPage.stopScanQr") : t("pages.walletPage.scanQr") }}
          </UButton>
        </div>

        <div v-show="scanning" class="wallet-send-scan">
          <div id="qr-reader" class="wallet-send-scan__reader" />
        </div>

        <div class="flex flex-col gap-2 rounded-2xl bg-[var(--bg-surface-hover)] border border-[var(--border-light)] p-4 text-center text-xs">
          <span class="font-bold text-[var(--text-secondary)]">Hoặc tải lên hình ảnh chứa mã QR để quét nhanh:</span>
          <input
            type="file"
            accept="image/*"
            class="mx-auto block text-xs cursor-pointer text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            @change="scanQrFile"
          >
        </div>

        <div v-if="draft.recipientUserId" class="wallet-send-selected">
          <img
            v-if="selectedRecipient?.avatarUrl"
            :src="selectedRecipient.avatarUrl"
            :alt="selectedRecipient.name"
            class="h-11 w-11 rounded-full object-cover"
          >
          <div v-else class="avatar-md avatar-muted shrink-0">
            {{ selectedRecipientName.slice(0, 1).toUpperCase() }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-title-primary">{{ selectedRecipientName }}</p>
            <p class="truncate text-caption-secondary">{{ t("pages.walletPage.selectedRecipient") }}</p>
          </div>
          <button type="button" class="wallet-send-selected__clear" @click="clearRecipient">
            <Icon name="i-ph-x-duotone" class="h-4 w-4" />
          </button>
        </div>

        <div class="max-h-64 space-y-2 overflow-y-auto pr-1">
          <div
            v-if="selectedRecipientLabel && !recipients.some(recipient => recipient.id === draft.recipientUserId)"
            class="flex items-center gap-3 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface-active)] px-3 py-3"
          >
            <div class="avatar-md avatar-muted shrink-0">
              {{ selectedRecipientLabel.slice(0, 1).toUpperCase() }}
            </div>
            <div class="min-w-0">
              <p class="truncate text-title-primary">{{ selectedRecipientLabel }}</p>
              <p class="truncate text-caption-secondary">{{ t("pages.walletPage.qrRecipient") }}</p>
            </div>
          </div>

          <button
            v-for="recipient in recipients"
            :key="recipient.id"
            type="button"
            class="wallet-send-recipient flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition"
            :class="recipient.id === draft.recipientUserId ? 'border-[var(--border-strong)] bg-[var(--bg-surface-active)]' : 'border-[var(--border-light)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)]'"
            @click="selectRecipient(recipient)"
          >
            <img
              v-if="recipient.avatarUrl"
              :src="recipient.avatarUrl"
              :alt="recipient.name"
              class="h-10 w-10 rounded-full object-cover"
            >
            <div v-else class="avatar-md avatar-muted shrink-0">
              {{ recipient.name.slice(0, 1).toUpperCase() }}
            </div>
            <div class="min-w-0">
              <p class="truncate text-title-primary">{{ recipient.name }}</p>
              <p class="truncate text-caption-secondary">@{{ recipient.username }}</p>
            </div>
          </button>

          <p
            v-if="recipientQuery.length >= 2 && !searching && recipients.length === 0"
            class="rounded-2xl bg-[var(--bg-muted)] p-4 text-caption-secondary"
          >
            {{ t("pages.walletPage.noRecipients") }}
          </p>
        </div>

        <UAlert
          v-if="localError"
          color="error"
          variant="subtle"
          class="rounded-2xl"
          :description="localError"
        />

        <UButton
          block
          color="primary"
          class="rounded-full font-semibold"
          :loading="submitting"
          @click="submit"
        >
          {{ t("pages.walletPage.sendSubmit") }}
        </UButton>

        <div v-if="confirmOpen" class="wallet-send-confirm" role="dialog" aria-modal="true">
          <section class="wallet-send-confirm__dialog">
            <div class="wallet-send-confirm__header">
              <div>
                <p class="text-label-secondary">{{ t("pages.walletPage.confirmTransferEyebrow") }}</p>
                <h3 class="text-heading text-[var(--text-primary)]">{{ t("pages.walletPage.confirmTransferTitle") }}</h3>
              </div>
              <button type="button" class="wallet-send-confirm__close" @click="confirmOpen = false">
                <Icon name="i-ph-x-duotone" class="h-5 w-5" />
              </button>
            </div>

            <dl class="wallet-send-confirm__list">
              <div>
                <dt>{{ t("pages.walletPage.confirmRecipient") }}</dt>
                <dd>{{ selectedRecipientName }}</dd>
              </div>
              <div>
                <dt>{{ t("pages.walletPage.confirmAmount") }}</dt>
                <dd>{{ formattedDraftAmount }}</dd>
              </div>
              <div>
                <dt>{{ t("pages.walletPage.confirmContent") }}</dt>
                <dd>{{ normalizedTransferNote || "-" }}</dd>
              </div>
              <div>
                <dt>{{ t("pages.walletPage.confirmDate") }}</dt>
                <dd>{{ confirmationDate }}</dd>
              </div>
            </dl>

            <div class="wallet-send-confirm__actions">
              <UButton
                color="neutral"
                variant="soft"
                class="rounded-full font-semibold"
                :disabled="submitting"
                @click="confirmOpen = false"
              >
                {{ t("pages.walletPage.confirmCancel") }}
              </UButton>
              <UButton
                color="primary"
                class="rounded-full font-semibold"
                :loading="submitting"
                @click="confirmTransfer"
              >
                {{ t("pages.walletPage.confirmSubmit") }}
              </UButton>
            </div>
          </section>
        </div>
    </div>
</template>

<script setup lang="ts">
import { formatCurrency } from "#shared-kernel/application/utils/formatCurrency"
import type {
  WalletCurrencyRule,
  WalletRecipient,
  WalletSendDraft,
} from "../../domain/types/wallet.types"

const props = defineProps<{
  open: boolean
  recipients: WalletRecipient[]
  searching: boolean
  submitting: boolean
  balance: number
  currency: string
  currencySymbol: string
  currencyRule: WalletCurrencyRule
}>()

const emit = defineEmits<{
  "update:open": [value: boolean]
  search: [query: string]
  send: [payload: WalletSendDraft]
}>()

const { t } = useI18n()
const recipientQuery = ref("")
const qrPayload = ref("")
const selectedRecipientLabel = ref("")
const localError = ref("")
const transferNote = ref("")
const confirmOpen = ref(false)
const scanning = ref(false)
const draft = reactive<WalletSendDraft>({
  recipientUserId: 0,
  amount: 0,
})

const { locale } = useI18n()
const toast = useToast()

onMounted(() => {
  if (typeof window !== "undefined") {
    const globalWin = window as any
    if (!globalWin.Html5Qrcode) {
      const script = document.createElement("script")
      script.src = "https://unpkg.com/html5-qrcode"
      script.async = true
      script.onload = () => {
        console.log("html5-qrcode loaded successfully")
      }
      document.head.appendChild(script)
    }
  }
})

const selectedRecipient = computed(() =>
  props.recipients.find(recipient => recipient.id === draft.recipientUserId) ?? null,
)
const selectedRecipientName = computed(() =>
  selectedRecipient.value
    ? `${selectedRecipient.value.name} (@${selectedRecipient.value.username})`
    : selectedRecipientLabel.value || `User #${draft.recipientUserId}`,
)
const normalizedTransferNote = computed(() => transferNote.value.trim())
const formattedDraftAmount = computed(() =>
  formatCurrency(draft.amount || 0, {
    currency: props.currency,
    currencySymbol: props.currencySymbol,
    currencyRule: props.currencyRule,
    locale: locale.value,
  }),
)
const confirmationDate = computed(() =>
  new Intl.DateTimeFormat(locale.value, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date()),
)

let directScanner: any = null

watch(recipientQuery, (query) => {
  emit("search", query)
})

watch(
  () => props.open,
  (open) => {
    if (!open) {
      recipientQuery.value = ""
      qrPayload.value = ""
      selectedRecipientLabel.value = ""
      draft.recipientUserId = 0
      draft.amount = 0
      transferNote.value = ""
      confirmOpen.value = false
      localError.value = ""
      stopQrScan()
    }
  },
)

watch(
  () => props.recipients,
  (recipients) => {
    const recipient = recipients.find(item => item.id === draft.recipientUserId)
    if (recipient) {
      selectedRecipientLabel.value = recipient.name
    }
  },
)

onBeforeUnmount(() => {
  stopQrScan()
})

function parseWalletQrPayload(value: string) {
  const raw = value.trim()

  if (!raw) return null

  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      const type = String(parsed.type ?? "")

      if (type === "wallet" || type === "send") {
        return {
          to: Number(parsed.to ?? 0) || 0,
          amount: parsed.amount === undefined || parsed.amount === null ? null : Number(parsed.amount),
        }
      }
    }
    catch {
      return null
    }
  }

  if (!raw.includes("|")) return null

  const parts = raw.split("|")
  const prefix = parts.shift()?.toUpperCase()

  if (prefix !== "WALLET") return null

  const values = new Map<string, string>()
  for (const part of parts) {
    const separatorIndex = part.indexOf("=")
    if (separatorIndex > -1) {
      values.set(part.slice(0, separatorIndex), part.slice(separatorIndex + 1))
    }
  }

  return {
    to: Number(values.get("to") ?? 0) || 0,
    amount: values.has("amount") ? Number(values.get("amount")) : null,
  }
}

function applyQrPayload() {
  localError.value = ""
  const parsed = parseWalletQrPayload(qrPayload.value)

  if (!parsed?.to) {
    localError.value = t("pages.walletPage.errorQrPayload")
    return
  }

  draft.recipientUserId = parsed.to
  selectedRecipientLabel.value = `User #${parsed.to}`
  recipientQuery.value = String(parsed.to)
  emit("search", String(parsed.to))

  if (parsed.amount !== null && Number.isFinite(parsed.amount) && parsed.amount > 0) {
    draft.amount = parsed.amount
  }

  stopQrScan()
}

function selectRecipient(recipient: WalletRecipient) {
  draft.recipientUserId = recipient.id
  selectedRecipientLabel.value = recipient.name
}

function clearRecipient() {
  draft.recipientUserId = 0
  selectedRecipientLabel.value = ""
  confirmOpen.value = false
}

function submit() {
  localError.value = ""

  if (!draft.recipientUserId) {
    localError.value = t("pages.walletPage.errorRecipient")
    return
  }

  if (draft.amount <= 0 || draft.amount > props.balance) {
    localError.value = t("pages.walletPage.errorAmount")
    return
  }

  confirmOpen.value = true
}

function confirmTransfer() {
  emit("send", {
    ...draft,
    note: normalizedTransferNote.value,
  })
}

async function startQrScan() {
  localError.value = ""

  if (typeof window === "undefined" || !(window as any).Html5Qrcode) {
    localError.value = t("pages.walletPage.errorQrScanUnsupported")
    return
  }

  try {
    scanning.value = true
    await nextTick()

    directScanner = new (window as any).Html5Qrcode("qr-reader")
    const config = {
      fps: 12,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.777,
    }

    const cameras = await (window as any).Html5Qrcode.getCameras()
    const preferred = (cameras || []).find((cam: any) =>
      /back|rear|environment/i.test((cam.label || "").toLowerCase()),
    )
    const cameraConfig = preferred ? { deviceId: { exact: preferred.id } } : { facingMode: "environment" }

    await directScanner.start(
      cameraConfig,
      config,
      (decodedText: string) => {
        qrPayload.value = decodedText
        applyQrPayload()
      },
      () => {},
    )
  }
  catch (err) {
    stopQrScan()
    localError.value = t("pages.walletPage.errorQrScan")
    console.error("Camera scan start failed:", err)
  }
}

async function stopQrScan() {
  scanning.value = false

  if (directScanner) {
    try {
      await directScanner.stop()
    } catch (_) {}
    try {
      await directScanner.clear()
    } catch (_) {}
    directScanner = null
  }

  const readerEl = document.getElementById("qr-reader")
  if (readerEl) {
    readerEl.innerHTML = ""
  }
}

async function scanQrFile(event: Event) {
  localError.value = ""
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  if (typeof window === "undefined" || !(window as any).Html5Qrcode) {
    localError.value = t("pages.walletPage.errorQrScanUnsupported")
    return
  }

  try {
    const decodedText = await (window as any).Html5Qrcode.scanFile(file, true)
    qrPayload.value = decodedText
    applyQrPayload()
    toast.add({
      color: "success",
      icon: "i-ph-check-circle-fill",
      title: locale.value === "vi" ? "Quét mã thành công" : "QR scanned successfully",
      description: locale.value === "vi" 
        ? "Đã đọc thành công thông tin ví người nhận từ tệp ảnh QR."
        : "Successfully read wallet recipient info from the uploaded QR image.",
    })
  } catch (err) {
    localError.value = locale.value === "vi"
      ? "Không tìm thấy hoặc không đọc được mã QR từ hình ảnh này."
      : "Could not read or find a QR code from the uploaded image."
    console.error("File QR scan failed:", err)
  }
}
</script>

<style scoped>
.wallet-send-scan {
  overflow: hidden;
  border: 1px solid var(--border-light);
  border-radius: 16px;
  background: #0f172a;
}

.wallet-send-scan__reader :deep(video) {
  display: block !important;
  width: 100% !important;
  height: auto !important;
  aspect-ratio: 16 / 10;
  object-fit: cover !important;
}

.wallet-send-scan__reader :deep(#qr-reader__dashboard),
.wallet-send-scan__reader :deep(#qr-reader__status_span) {
  display: none !important;
}

.wallet-send-selected {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid rgba(0, 0, 255, 0.14);
  border-radius: 16px;
  background: rgba(0, 0, 255, 0.04);
  padding: 12px;
}

.wallet-send-selected__clear {
  position: relative;
  z-index: 2;
  display: flex;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  color: #64748b;
  cursor: pointer;
  pointer-events: auto;
  user-select: none;
}

.wallet-send-selected__clear > *,
.wallet-send-recipient > *,
.wallet-send-confirm__close > * {
  pointer-events: none;
}

.wallet-send-recipient {
  position: relative;
  z-index: 2;
  min-height: 58px;
  cursor: pointer;
  pointer-events: auto;
  user-select: none;
}

.wallet-send-confirm {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.48);
  padding: 16px;
}

.wallet-send-confirm__dialog {
  width: min(100%, 460px);
  border: 1px solid var(--border-light);
  border-radius: 16px;
  background: var(--bg-surface);
  padding: 18px;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.24);
}

.wallet-send-confirm__header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 16px;
}

.wallet-send-confirm__close {
  position: relative;
  z-index: 2;
  display: flex;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  background: var(--bg-surface);
  color: var(--text-secondary);
  cursor: pointer;
  pointer-events: auto;
  user-select: none;
}

.wallet-send-confirm__list {
  display: grid;
  gap: 10px;
  margin-top: 18px;
}

.wallet-send-confirm__list div {
  display: grid;
  gap: 4px;
  border-bottom: 1px solid var(--border-light);
  padding-bottom: 10px;
}

.wallet-send-confirm__list dt {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
}

.wallet-send-confirm__list dd {
  overflow-wrap: anywhere;
  font-size: 14px;
  font-weight: 800;
  color: var(--text-primary);
}

.wallet-send-confirm__actions {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 18px;
}
</style>
