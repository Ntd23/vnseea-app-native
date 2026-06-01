<!-- Description: Renders the feed publisher box with backend post creation and current-user session data instead of local mock submission. -->
<template>
  <section class="publisher">
    <input
      ref="imageInputRef"
      class="publisher__file-input"
      type="file"
      accept="image/png,image/jpeg,image/gif"
      @change="selectImageFile"
    >
    <input
      ref="videoInputRef"
      class="publisher__file-input"
      type="file"
      accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-m4v"
      @change="selectVideoFile"
    >

    <div v-if="!expanded" class="publisher__compact" @click="openComposer">
      <div class="publisher__compact-avatar">
        <img v-if="currentUserAvatar" :src="currentUserAvatar" :alt="currentUserName" class="publisher__avatar-image">
        <span v-else>{{ currentUserInitials }}</span>
      </div>
      <div
        class="publisher__compact-input"
        role="button"
        tabindex="0"
        @click.stop="openComposer"
        @keydown.enter.prevent="openComposer"
        @keydown.space.prevent="openComposer"
      >
        {{ t("feed.publisherBox.prompt") }}
      </div>
      <div class="publisher__compact-actions">
        <button
          v-for="action in compactActions"
          :key="action.icon"
          class="publisher__compact-btn"
          :title="action.label"
          type="button"
          @click.stop="handleCompactActionOverride(action.value)"
        >
          <Icon :name="action.icon" class="h-5 w-5" />
        </button>
      </div>
    </div>

    <div v-else class="publisher__expanded">
      <div class="publisher__head">
        <div class="publisher__avatar">
          <img v-if="currentUserAvatar" :src="currentUserAvatar" :alt="currentUserName" class="publisher__avatar-image">
          <span v-else>{{ currentUserInitials }}</span>
        </div>
        <div class="publisher__meta">
          <p class="publisher__name">{{ currentUserName || t("feed.publisherBox.expandedOpen") }}</p>
        </div>
        <button class="publisher__close" type="button" @click="expanded = false">
          <Icon name="i-ph-x-bold" class="h-4 w-4" />
        </button>
      </div>

      <div v-if="statusMessage" class="publisher__status" :data-tone="statusTone">
        {{ statusMessage }}
      </div>

      <div v-if="!showProductForm" class="publisher__textarea-shell" :class="{ 'publisher__textarea-shell--colored': Boolean(activeColorOption) }" :style="activeColorOption ? { background: activeColorOption.bg, color: activeColorOption.text } : {}">
        <div class="publisher__textarea-highlight" aria-hidden="true">
          <template v-for="segment in highlightedDraftSegments" :key="segment.key">
            <span :class="{ 'publisher__textarea-mention': segment.isMention }">{{ segment.text }}</span>
          </template>
        </div>
        <textarea
          ref="textareaEl"
          v-model="draftText"
          class="publisher__textarea"
          :placeholder="t('feed.publisherBox.composerPlaceholder')"
          maxlength="280"
          spellcheck="false"
          autocomplete="off"
          autocapitalize="off"
          autocorrect="off"
          @input="handleInput"
          @click="updateMentionQuery"
          @keyup="handleTextareaKeyup"
          @keydown.esc.prevent="closeMentionSuggestions"
        />
      </div>

      <!-- Sell Product Form -->
      <div v-else class="publisher__product-form">
        <p class="publisher__product-title">
          <Icon name="i-ph-shopping-cart-bold" class="h-5 w-5 mr-1 text-orange-500" />
          {{ locale === "vi" ? "Đăng bán sản phẩm" : "List a Product for Sale" }}
        </p>
        
        <div class="publisher__product-grid">
          <div class="publisher__product-field">
            <label class="publisher__product-label">{{ locale === "vi" ? "Tên sản phẩm *" : "Product Name *" }}</label>
            <input 
              v-model="productForm.name" 
              type="text" 
              class="publisher__product-input" 
              :placeholder="locale === 'vi' ? 'Bạn đang bán gì?' : 'What are you selling?'"
              required
            >
          </div>

          <div class="publisher__product-row-2">
            <div class="publisher__product-field">
              <label class="publisher__product-label">{{ locale === "vi" ? "Giá *" : "Price *" }}</label>
              <div class="publisher__price-wrapper">
                <input 
                  v-model="productForm.price" 
                  type="text" 
                  class="publisher__product-input" 
                  placeholder="0.00"
                  required
                >
                <select v-model="productForm.currency" class="publisher__product-select publisher__currency-select">
                  <option value="₫">₫ (VND)</option>
                  <option value="$">$ (USD)</option>
                </select>
              </div>
            </div>

            <div class="publisher__product-field">
              <label class="publisher__product-label">{{ locale === "vi" ? "Danh mục *" : "Category *" }}</label>
              <select v-model="productForm.category" class="publisher__product-select">
                <option value="1">{{ locale === "vi" ? "Trang phục & Phụ kiện" : "Apparel & Accessories" }}</option>
                <option value="2">{{ locale === "vi" ? "Ô tô & Xe cộ" : "Autos & Vehicles" }}</option>
                <option value="3">{{ locale === "vi" ? "Sản phẩm trẻ em" : "Baby & Children's Products" }}</option>
                <option value="4">{{ locale === "vi" ? "Làm đẹp & Sức khỏe" : "Beauty Products & Services" }}</option>
                <option value="5">{{ locale === "vi" ? "Máy tính & Thiết bị ngoại vi" : "Computers & Peripherals" }}</option>
                <option value="6">{{ locale === "vi" ? "Điện tử dân dụng" : "Consumer Electronics" }}</option>
                <option value="10">{{ locale === "vi" ? "Nhà & Vườn" : "Home & Garden" }}</option>
              </select>
            </div>
          </div>

          <div class="publisher__product-row-2">
            <div class="publisher__product-field">
              <label class="publisher__product-label">{{ locale === "vi" ? "Tình trạng" : "Condition" }}</label>
              <select v-model="productForm.type" class="publisher__product-select">
                <option value="0">{{ locale === "vi" ? "Mới" : "New" }}</option>
                <option value="1">{{ locale === "vi" ? "Đã sử dụng" : "Used" }}</option>
              </select>
            </div>

            <div class="publisher__product-field">
              <label class="publisher__product-label">{{ locale === "vi" ? "Địa điểm" : "Location" }}</label>
              <input 
                v-model="productForm.location" 
                type="text" 
                class="publisher__product-input" 
                :placeholder="locale === 'vi' ? 'Hà Nội, Việt Nam...' : 'Location...'"
              >
            </div>
          </div>

          <div class="publisher__product-field">
            <label class="publisher__product-label">{{ locale === "vi" ? "Mô tả sản phẩm *" : "Description *" }}</label>
            <textarea 
              v-model="productForm.description" 
              class="publisher__product-textarea" 
              :placeholder="locale === 'vi' ? 'Thêm thông tin mô tả chi tiết sản phẩm...' : 'Add details about your product...'"
              rows="3"
              required
            />
          </div>

          <div class="publisher__product-field">
            <label class="publisher__product-label">{{ locale === "vi" ? "Hình ảnh sản phẩm *" : "Product Image *" }}</label>
            <div class="publisher__product-image-uploader" @click="productImageInput?.click()">
              <input
                ref="productImageInput"
                type="file"
                accept="image/png,image/jpeg,image/gif"
                class="hidden"
                @change="e => productForm.imageFile = e.target.files ? e.target.files[0] : null"
              >
              <div v-if="productForm.imageFile" class="publisher__product-image-preview">
                <Icon name="i-ph-image-square-bold" class="h-5 w-5 mr-1 text-green-500" />
                <span class="truncate flex-1">{{ productForm.imageFile.name }}</span>
                <button type="button" class="publisher__product-image-remove" @click.stop="productForm.imageFile = null">
                  <Icon name="i-ph-x-bold" class="h-4 w-4" />
                </button>
              </div>
              <div v-else class="publisher__product-image-placeholder">
                <Icon name="i-ph-upload-simple-bold" class="h-6 w-6 text-slate-400 mb-1" />
                <span>{{ locale === "vi" ? "Chọn hình ảnh sản phẩm" : "Upload product image" }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="showMentionSuggestions" class="publisher__mention-popover">
        <div v-if="mentionLoading" class="publisher__mention-state">
          <Icon name="i-lucide-loader-2" class="h-4 w-4 animate-spin" />
          <span>{{ t("feed.publisherBox.mentionLoading") }}</span>
        </div>
        <template v-else-if="mentionQuery.trim().length > 0">
          <button
            v-for="user in mentionSuggestions"
            :key="user.id"
            type="button"
            class="publisher__mention-option"
            @mousedown.prevent="selectMention(user)"
          >
            <span class="publisher__mention-avatar">
              <img v-if="user.avatarUrl" :src="user.avatarUrl" :alt="user.name">
              <span v-else>{{ user.initials }}</span>
            </span>
            <span class="publisher__mention-copy">
              <span class="publisher__mention-name">{{ user.name }}</span>
              <span class="publisher__mention-username">@{{ user.username }}</span>
            </span>
          </button>
        </template>
        <div v-if="!mentionLoading && mentionQuery.trim().length === 0" class="publisher__mention-state">
          {{ t("feed.publisherBox.mentionTypeToSearch") }}
        </div>
        <div v-else-if="!mentionLoading && mentionSuggestions.length === 0" class="publisher__mention-state">
          {{ t("feed.publisherBox.mentionEmpty") }}
        </div>
      </div>



      <div v-if="selectedMediaLabel || activeFeeling" class="publisher__selection-row">
        <div v-if="selectedMediaLabel" class="publisher__selection-pill">
          <Icon :name="selectedMediaType === 'video' ? 'i-ph-video-camera-bold' : 'i-ph-image-bold'" class="h-4 w-4" />
          <span>{{ selectedMediaLabel }}</span>
          <button type="button" class="publisher__selection-remove" @click="clearSelectedMedia">
            <Icon name="i-ph-x-bold" class="h-3.5 w-3.5" />
          </button>
        </div>

        <div v-if="activeFeeling" class="publisher__selection-pill">
          <span>{{ activeFeeling.emoji }}</span>
          <span>{{ feelingSelectedText }} {{ activeFeeling.label }}</span>
          <button type="button" class="publisher__selection-remove" @click="selectFeeling(activeFeeling.value)">
            <Icon name="i-ph-x-bold" class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div class="publisher__toolbar">
        <div class="publisher__actions">
          <button
            v-for="action in actions"
            :key="action.value"
            class="publisher__action-chip"
            :class="{
              'publisher__action-chip--active':
                (action.value === 'image' && selectedMediaType === 'image')
                || (action.value === 'video' && selectedMediaType === 'video')
                || (action.value === 'feeling' && Boolean(activeFeeling))
                || (action.value === 'poll' && showPollForm)
                || (action.value === 'colors' && showColorsPicker)
                || (action.value === 'product' && showProductForm),
            }"
            type="button"
            @click="handleActionOverride(action.value)"
          >
            <Icon :name="action.icon" class="h-4 w-4" />
            <span class="publisher__action-label">{{ action.label }}</span>
          </button>
        </div>

        <div class="publisher__submit-area">
          <span class="publisher__count" :class="{ 'publisher__count--warn': draft.text.length > 240 }">
            {{ draft.text.length }}/280
          </span>
          <button class="publisher__live-btn" type="button" @click="goToLive">
            <Icon name="i-ph-video-camera-bold" class="h-4.5 w-4.5 text-slate-600" />
            <span>{{ locale === 'vi' ? 'Trực tiếp' : 'Go Live' }}</span>
          </button>
          <button class="publisher__submit-btn" type="button" :disabled="submitting || !canPublish" @click="publish">
            <Icon v-if="submitting" name="i-lucide-loader-2" class="h-4 w-4 animate-spin" />
            <Icon v-else name="i-ph-paper-plane-tilt-fill" class="h-4 w-4" />
            {{ submitting ? t("feed.publisherBox.submitLoading") : t("feed.publisherBox.share") }}
          </button>
        </div>
      </div>

      <div v-if="showFeelingPicker" class="publisher__feeling-picker">
        <p class="publisher__feeling-title">{{ feelingPromptText }}</p>
        <button
          v-for="feeling in feelingOptions"
          :key="feeling.value"
          type="button"
          class="publisher__feeling-option"
          :class="{ 'publisher__feeling-option--active': activeFeeling?.value === feeling.value }"
          @click="selectFeeling(feeling.value)"
        >
          <span class="publisher__feeling-emoji">{{ feeling.emoji }}</span>
          <span>{{ feeling.label }}</span>
        </button>
      </div>

      <!-- Post background colors picker -->
      <div v-if="showColorsPicker" class="publisher__colors-picker">
        <button
          type="button"
          class="publisher__color-chip publisher__color-chip--none"
          :class="{ 'publisher__color-chip--active': selectedColorId === null }"
          @click="selectedColorId = null"
          :title="locale === 'vi' ? 'Không dùng màu nền' : 'No background'"
        >
          <Icon name="i-ph-prohibit-bold" class="h-4 w-4 text-slate-500" />
        </button>
        <button
          v-for="colorOpt in postColorOptions"
          :key="colorOpt.id"
          type="button"
          class="publisher__color-chip"
          :class="{ 'publisher__color-chip--active': selectedColorId === colorOpt.id }"
          :style="{ background: colorOpt.bg }"
          @click="selectedColorId = colorOpt.id"
          :title="colorOpt.label"
        />
      </div>

      <div v-if="showPollForm" class="publisher__poll-form">
        <p class="publisher__poll-title">
          <Icon name="i-ph-list-checks-bold" class="h-4 w-4" />
          {{ t('feed.publisherBox.actionPoll') }}
        </p>
        <div class="publisher__poll-answers">
          <div
            v-for="(_, idx) in pollAnswers"
            :key="idx"
            class="publisher__poll-answer-row"
          >
            <input
              v-model="pollAnswers[idx]"
              class="publisher__poll-input"
              type="text"
              :placeholder="t('feed.publisherBox.pollAnswerPlaceholder', { n: idx + 1 })"
            >
            <button
              v-if="pollAnswers.length > 2"
              type="button"
              class="publisher__poll-remove"
              :title="t('feed.publisherBox.pollRemoveAnswer')"
              @click="removePollAnswer(idx)"
            >
              <Icon name="i-ph-x-bold" class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <button
          v-if="pollAnswers.length < 10"
          type="button"
          class="publisher__poll-add"
          @click="addPollAnswer"
        >
          <Icon name="i-ph-plus-bold" class="h-3.5 w-3.5" />
          {{ t('feed.publisherBox.pollAddAnswer') }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useFeedMentionSearch } from "../../application/composables/useFeedMentionSearch"
import { useFeedPublisherBoxVM } from "../../application/view-models/useFeedPublisherBoxVM"
import type { FeedPostRecord } from "../../domain/types/feed.types"

const { t } = useI18n()
const { locale } = useI18n()
const props = defineProps<{
  pageId?: number
  eventId?: number
  groupId?: number
}>()
const emit = defineEmits<{
  created: [post: FeedPostRecord | null]
}>()

const imageInputRef = ref<HTMLInputElement | null>(null)
const videoInputRef = ref<HTMLInputElement | null>(null)
const productImageInput = ref<HTMLInputElement | null>(null)

const {
  textareaEl,
  expanded,
  draft,
  submitting,
  statusMessage,
  statusTone,
  currentUserName,
  currentUserAvatar,
  currentUserInitials,
  compactActions,
  actions,
  feelingOptions,
  activeFeeling,
  selectedMediaLabel,
  selectedMediaType,
  showFeelingPicker,
  showPollForm,
  pollAnswers,
  canPublish,
  handleCompactAction,
  handleAction,
  selectImageFile,
  selectVideoFile,
  clearSelectedMedia,
  selectFeeling,
  addPollAnswer,
  removePollAnswer,
  publish: publishPost,
  selectedColorId,
  showColorsPicker,
  postColorOptions,
  showProductForm,
  productForm,
} = useFeedPublisherBoxVM((event, post) => emit(event, post), props.pageId, props.eventId, props.groupId)

const activeColorOption = computed(() => {
  if (selectedColorId.value === null) return null
  return postColorOptions.value.find(opt => opt.id === selectedColorId.value) || null
})

const draftText = computed({
  get: () => draft.value?.text || "",
  set: (value: string) => {
    if (draft.value) {
      draft.value.text = value
    }
  },
})

const {
  mentionQuery,
  mentionLoading,
  mentionSuggestions,
  showMentionSuggestions,
  highlightedMentionSegments: highlightedDraftSegments,
  updateMentionQuery,
  handleMentionKeyup: handleTextareaKeyup,
  closeMentionSuggestions,
  selectMention,
  clearSelectedMentions,
} = useFeedMentionSearch({
  text: draftText,
  textarea: textareaEl,
  active: expanded,
})

async function publish() {
  await publishPost()

  if (!draft.value?.text) {
    clearSelectedMentions()
  }
}

function resizeTextarea() {
  if (textareaEl.value) {
    textareaEl.value.style.height = "auto"
    textareaEl.value.style.height = `${textareaEl.value.scrollHeight}px`
  }
}

function handleInput(e: Event) {
  updateMentionQuery(e)
  resizeTextarea()
}

function handleActionOverride(value: any) {
  console.log("[FeedPublisherBox] handleActionOverride triggered for value:", value)
  try {
    if (value === "image") {
      showFeelingPicker.value = false
      showPollForm.value = false
      showColorsPicker.value = false
      showProductForm.value = false
      console.log("[FeedPublisherBox] Clicking imageInputRef:", imageInputRef.value)
      imageInputRef.value?.click()
      expanded.value = true
      return
    }

    if (value === "video") {
      showFeelingPicker.value = false
      showPollForm.value = false
      showColorsPicker.value = false
      showProductForm.value = false
      console.log("[FeedPublisherBox] Clicking videoInputRef:", videoInputRef.value)
      videoInputRef.value?.click()
      expanded.value = true
      return
    }

    console.log("[FeedPublisherBox] Calling standard handleAction for:", value)
    handleAction(value)
  } catch (error) {
    console.error("[FeedPublisherBox] Error in handleActionOverride:", error)
  }
}

function handleCompactActionOverride(value: any) {
  console.log("[FeedPublisherBox] handleCompactActionOverride triggered for value:", value)
  try {
    if (value === "image") {
      showFeelingPicker.value = false
      showPollForm.value = false
      showColorsPicker.value = false
      showProductForm.value = false
      console.log("[FeedPublisherBox] Clicking compact imageInputRef:", imageInputRef.value)
      imageInputRef.value?.click()
      expanded.value = true
      return
    }

    if (value === "video") {
      showFeelingPicker.value = false
      showPollForm.value = false
      showColorsPicker.value = false
      showProductForm.value = false
      console.log("[FeedPublisherBox] Clicking compact videoInputRef:", videoInputRef.value)
      videoInputRef.value?.click()
      expanded.value = true
      return
    }

    console.log("[FeedPublisherBox] Calling standard handleCompactAction for:", value)
    handleCompactAction(value)
  } catch (error) {
    console.error("[FeedPublisherBox] Error in handleCompactActionOverride:", error)
  }
}

async function openComposer() {
  expanded.value = true
  await nextTick()
  resizeTextarea()
  textareaEl.value?.focus()
}


const feelingPromptText = computed(() =>
  locale.value === "vi" ? "Bạn đang cảm thấy gì?" : "What are you feeling?",
)

const feelingSelectedText = computed(() =>
  locale.value === "vi" ? "Đang cảm thấy" : "Feeling",
)

function goToLive() {
  navigateTo("/live")
}
</script>

<style scoped>
.publisher__compact {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 255, 0.06);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 16px rgba(0, 0, 255, 0.03);
  cursor: pointer;
  pointer-events: auto;
  user-select: none;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.publisher__compact:hover {
  border-color: rgba(0, 0, 255, 0.12);
  box-shadow: 0 2px 8px rgba(0, 0, 255, 0.06);
}

.publisher__compact-avatar,
.publisher__avatar {
  display: flex;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 50%;
  background: linear-gradient(145deg, #3333ff 0%, #0000ff 100%);
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
  box-shadow: 0 4px 12px rgba(0, 0, 255, 0.18);
}

.publisher__avatar {
  width: 42px;
  height: 42px;
  font-size: 13px;
  box-shadow: 0 6px 18px rgba(0, 0, 255, 0.16);
}

.publisher__avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.publisher__compact-input {
  position: relative;
  z-index: 2;
  flex: 1;
  min-width: 0;
  min-height: 38px;
  display: flex;
  align-items: center;
  padding: 8px 14px;
  border-radius: 999px;
  background: #f1f5f9;
  font-size: 14px;
  color: #94a3b8;
  font-weight: 500;
  cursor: text;
  pointer-events: auto;
}

.publisher__compact-actions {
  position: relative;
  z-index: 3;
  display: flex;
  gap: 2px;
}

.publisher__compact-btn {
  position: relative;
  z-index: 3;
  display: flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 2px solid rgba(0, 0, 255, 0.08);
  background: rgba(0, 0, 255, 0.03);
  color: #64748b;
  cursor: pointer;
  pointer-events: auto;
  user-select: none;
  transition: all 0.15s ease;
}

.publisher__compact-btn:hover {
  border-color: rgba(0, 0, 255, 0.2);
  background: rgba(0, 0, 255, 0.06);
  color: #0000ff;
}

.publisher__expanded {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 255, 0.08);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), 0 8px 28px rgba(0, 0, 255, 0.05);
  animation: publisher-in 0.2s ease;
}

@keyframes publisher-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.publisher__head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.publisher__meta {
  flex: 1;
  min-width: 0;
}

.publisher__name {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.publisher__close {
  display: flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.12s ease;
}

.publisher__close:hover {
  background: #f1f5f9;
  color: #475569;
}

.publisher__status {
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 13px;
  line-height: 1.5;
}

.publisher__status[data-tone="neutral"] {
  background: #f1f5ff;
  color: #475569;
}

.publisher__status[data-tone="success"] {
  background: #ecfdf5;
  color: #16a34a;
}

.publisher__status[data-tone="warning"] {
  background: #fffbeb;
  color: #d97706;
}

.publisher__textarea-shell {
  position: relative;
  border-radius: 14px;
  background: #fafbfe;
}

.publisher__textarea-highlight,
.publisher__textarea {
  width: 100%;
  min-height: 96px;
  padding: 14px 16px;
  font-size: 14.5px;
  line-height: 1.7;
  font-family: inherit;
  white-space: pre-wrap;
  word-break: break-word;
}

.publisher__textarea-highlight {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: 14px;
  color: transparent;
}

.publisher__textarea-mention {
  color: #1420ff;
}

.publisher__textarea {
  position: relative;
  z-index: 1;
  resize: none;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  background: transparent;
  color: #334155;
  caret-color: #334155;
  outline: none;
  text-decoration: none;
  transition: border-color 0.15s ease, height 0.1s ease;
  overflow-y: hidden;
}

.publisher__textarea::spelling-error,
.publisher__textarea::grammar-error {
  text-decoration: none;
}

.publisher__textarea:focus {
  border-color: rgba(0, 0, 255, 0.2);
}

.publisher__textarea::placeholder {
  color: #94a3b8;
}

.publisher__mention-popover {
  margin-top: -6px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
}

.publisher__mention-option,
.publisher__mention-state {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 10px;
  border: 0;
  background: #ffffff;
  padding: 10px 12px;
  text-align: left;
}

.publisher__mention-option {
  cursor: pointer;
  transition: background 0.12s ease;
}

.publisher__mention-option:hover {
  background: rgba(20, 32, 255, 0.05);
}

.publisher__mention-state {
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
}

.publisher__mention-avatar {
  display: inline-flex;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 50%;
  background: #1420ff;
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
}

.publisher__mention-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.publisher__mention-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.publisher__mention-name {
  overflow: hidden;
  color: #0f172a;
  font-size: 13px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.publisher__mention-username {
  overflow: hidden;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.publisher__file-input {
  display: none;
}

.publisher__selection-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.publisher__selection-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 999px;
  border: 1px solid #dbeafe;
  background: #eff6ff;
  padding: 6px 12px;
  color: #1e3a8a;
  font-size: 12px;
  font-weight: 700;
}

.publisher__selection-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  padding: 0;
}

.publisher__toolbar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-top: 1px solid #f1f5f9;
  padding-top: 12px;
}

@media (min-width: 640px) {
  .publisher__toolbar {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.publisher__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.publisher__action-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 10px;
  border: none;
  background: transparent;
  font-size: 12.5px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s ease;
}

.publisher__action-chip:hover {
  background: rgba(0, 0, 255, 0.04);
  color: #0000ff;
}

.publisher__action-chip--active {
  background: rgba(0, 0, 255, 0.06);
  color: #0000ff;
}

.publisher__feeling-picker {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
  gap: 8px;
  padding: 10px 0 2px;
}

.publisher__feeling-title {
  grid-column: 1 / -1;
  margin: 0 0 2px;
  color: #475569;
  font-size: 13px;
  font-weight: 700;
}

.publisher__feeling-option {
  display: flex;
  min-width: 0;
  min-height: 40px;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  padding: 8px 10px;
  color: #334155;
  font-size: 13px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
}

.publisher__feeling-emoji {
  display: inline-flex;
  width: 24px;
  height: 24px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #f8fafc;
  font-size: 16px;
  line-height: 1;
}

.publisher__feeling-option--active,
.publisher__feeling-option:hover {
  border-color: rgba(0, 0, 255, 0.2);
  background: rgba(0, 0, 255, 0.05);
  color: #0000ff;
}

.publisher__action-label {
  display: none;
}

@media (min-width: 480px) {
  .publisher__action-label {
    display: inline;
  }
}

.publisher__submit-area {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.publisher__count {
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  transition: color 0.15s ease;
}

.publisher__count--warn {
  color: #dc2626;
}

.publisher__submit-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  border-radius: 999px;
  background: linear-gradient(180deg, #2233ff 0%, #0000ff 100%);
  padding: 8px 18px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(0, 0, 255, 0.2);
  transition: all 0.15s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.publisher__submit-btn:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 255, 0.28);
  transform: translateY(-1px);
}

.publisher__submit-btn:active {
  transform: scale(0.97);
}

.publisher__live-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  border-radius: 999px;
  background: #f1f5f9;
  padding: 8px 18px;
  color: #475569;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.publisher__live-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
  transform: translateY(-1px);
}

.publisher__live-btn:active {
  transform: scale(0.97);
}

.publisher__submit-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

/* Poll form */
.publisher__poll-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 0 2px;
  border-top: 1px solid #f1f5f9;
  animation: publisher-in 0.18s ease;
}

.publisher__poll-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 4px;
  color: #31a38c;
  font-size: 13px;
  font-weight: 700;
}

.publisher__poll-answers {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.publisher__poll-answer-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.publisher__poll-input {
  flex: 1;
  height: 40px;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fafbfe;
  font-size: 13.5px;
  color: #334155;
  outline: none;
  font-family: inherit;
  transition: border-color 0.15s ease;
}

.publisher__poll-input:focus {
  border-color: rgba(0, 0, 255, 0.2);
}

.publisher__poll-input::placeholder {
  color: #94a3b8;
}

.publisher__poll-remove {
  display: inline-flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  border: 1px solid #e2e8f0;
  border-radius: 50%;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.12s ease;
  flex-shrink: 0;
}

.publisher__poll-remove:hover {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #dc2626;
}

.publisher__poll-add {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  padding: 7px 14px;
  border: 1.5px dashed rgba(49, 163, 140, 0.4);
  border-radius: 10px;
  background: rgba(49, 163, 140, 0.04);
  color: #31a38c;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.publisher__poll-add:hover {
  background: rgba(49, 163, 140, 0.1);
  border-color: rgba(49, 163, 140, 0.6);
}

/* Post Colors Picker */
.publisher__colors-picker {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 14px 16px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px dashed rgba(0, 0, 255, 0.08);
  animation: publisher-in 0.18s ease;
}

.publisher__color-chip {
  position: relative;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.publisher__color-chip:hover {
  transform: scale(1.15);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.08);
}

.publisher__color-chip--active {
  transform: scale(1.1);
  box-shadow: 0 0 0 2.5px #0000ff, 0 3px 6px rgba(0,0,0,0.15);
}

.publisher__color-chip--none {
  background: #ffffff;
  color: #64748b;
  border: 1px solid #cbd5e1;
}

.publisher__color-chip--none.publisher__color-chip--active {
  border-color: #0000ff;
}

/* Colored Composer Preview */
.publisher__textarea-shell--colored {
  position: relative;
  border-radius: 12px;
  padding: 24px !important;
  min-height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);
  transition: background 0.3s ease;
}

.publisher__textarea-shell--colored .publisher__textarea {
  background: transparent !important;
  color: inherit !important;
  font-size: 20px !important;
  font-weight: 700 !important;
  text-align: center !important;
  min-height: 100px !important;
  line-height: 1.5 !important;
  padding: 0 !important;
  caret-color: currentColor;
}

.publisher__textarea-shell--colored .publisher__textarea::placeholder {
  color: rgba(255, 255, 255, 0.8) !important;
}

.publisher__textarea-shell--colored .publisher__textarea-highlight {
  display: none !important;
}

/* Product Form */
.publisher__product-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid rgba(0, 0, 255, 0.05);
  animation: publisher-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.publisher__product-title {
  display: flex;
  align-items: center;
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 8px;
  margin: 0;
}

.publisher__product-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.publisher__product-row-2 {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

@media (min-width: 520px) {
  .publisher__product-row-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.publisher__product-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.publisher__product-label {
  font-size: 11.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #64748b;
}

.publisher__product-input,
.publisher__product-select,
.publisher__product-textarea {
  font-family: inherit;
  font-size: 13.5px;
  color: #0f172a;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(0,0,0,0.02);
  outline: none;
  transition: all 0.15s ease;
}

.publisher__product-input:focus,
.publisher__product-select:focus,
.publisher__product-textarea:focus {
  border-color: #0000ff;
  box-shadow: 0 0 0 3px rgba(0, 0, 255, 0.1);
}

.publisher__price-wrapper {
  display: flex;
  gap: 8px;
}

.publisher__price-wrapper .publisher__product-input {
  flex: 1;
}

.publisher__currency-select {
  width: 90px;
  flex-shrink: 0;
}

.publisher__product-textarea {
  resize: vertical;
}

/* Product Uploader */
.publisher__product-image-uploader {
  display: flex;
  min-height: 72px;
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  background: #ffffff;
  cursor: pointer;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  transition: all 0.15s ease;
}

.publisher__product-image-uploader:hover {
  border-color: #0000ff;
  background: rgba(0, 0, 255, 0.02);
}

.publisher__product-image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.publisher__product-image-preview {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 8px;
  font-size: 13.5px;
  color: #0f172a;
  font-weight: 600;
}

.publisher__product-image-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: #f1f5f9;
  color: #64748b;
  cursor: pointer;
  transition: all 0.12s ease;
}

.publisher__product-image-remove:hover {
  background: #fee2e2;
  color: #dc2626;
}
</style>
