<!-- English description: Renders the right-sidebar chat widget with real inbox contacts, quick send actions, mini threads, and online presence indicators. -->
<template>
  <div class="chat-widget">
    <div class="chat-widget__header">
      <div>
        <span class="chat-widget__title">{{ $t("navigation.chatWidget.title") }}</span>
        <div class="chat-widget__online">
          <div class="chat-widget__online-dot" />
          <span>{{ $t("navigation.chatWidget.onlineCount", { count: onlineCount }) }}</span>
        </div>
      </div>

      <div class="chat-widget__header-actions">
        <button
          class="chat-widget__header-btn"
          type="button"
          :title="$t('navigation.chatWidget.actionCreateGroup')"
          @click="openMessagesTab('multi')"
        >
          <Icon name="i-ph-user-plus-duotone" class="h-4 w-4" />
        </button>
        <button
          class="chat-widget__header-btn"
          type="button"
          :title="$t('navigation.chatWidget.actionOpenMessages')"
          @click="openMessagesTab()"
        >
          <Icon name="i-ph-chat-teardrop-dots-duotone" class="h-4 w-4" />
        </button>
      </div>
    </div>

    <div class="chat-widget__tabs">
      <UButton
        v-for="tab in tabs"
        :key="tab.value"
        type="button"
        color="neutral"
        variant="ghost"
        class="chat-widget__tab"
        :class="{ 'chat-widget__tab--active': activeTab === tab.value }"
        @click="activeTab = tab.value"
      >
        <Icon :name="activeTab === tab.value ? tab.activeIcon : tab.icon" class="h-4 w-4" />
        <span>{{ $t(tab.label) }}</span>
      </UButton>
    </div>

    <div v-if="activeTab === 'send'" class="chat-widget__content chat-widget__content--send">
      <div class="chat-widget__send-scroll">
        <div class="chat-widget__send-card">
          <div class="chat-widget__field">
            <label class="chat-widget__field-label">
              <span class="inline-flex items-center gap-1.5">
                <Icon name="i-ph-tag-duotone" class="h-3.5 w-3.5" />
                <span>{{ $t("pages.messagesPage.label") }}</span>
              </span>
            </label>
            <select v-model="activeSendTagFilter" class="chat-widget__select">
              <option value="">{{ $t("pages.messagesPage.chooseTag") }}</option>
              <option value="0">{{ $t("pages.messagesPage.allTaggedUsers") }}</option>
              <option
                v-for="tag in messageTagLabels"
                :key="tag.id"
                :value="String(tag.id)"
              >
                {{ tag.name }}
              </option>
            </select>
          </div>

          <div class="chat-widget__recipient-heading">
            <div class="chat-widget__field-label chat-widget__field-label--inline">
              <Icon name="i-ph-users-three-duotone" class="h-3.5 w-3.5" />
              <span>{{ $t("navigation.chatWidget.sendToLabel") }}</span>
            </div>
            <label class="chat-widget__select-all">
              <input
                type="checkbox"
                :checked="allVisibleSendRecipientsSelected"
                class="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                :disabled="sendCandidates.length === 0"
                @change="toggleAllVisibleSendRecipients"
              >
              <span>{{ $t("navigation.chatWidget.selectAll") }}</span>
            </label>
          </div>

          <div class="chat-widget__field">
            <UInput
              v-model="sendTo"
              :placeholder="$t('navigation.chatWidget.recipientPlaceholder')"
              icon="i-ph-magnifying-glass-duotone"
              :ui="{
                base: 'rounded-xl border border-[var(--border-light)] bg-[var(--bg-muted)] px-3 py-2 text-sm shadow-none',
              }"
            />
          </div>

          <div class="chat-widget__recipient-box" :class="{ 'chat-widget__recipient-box--empty': selectedSendRecipients.length === 0 }">
            <div v-if="selectedSendRecipients.length > 0" class="chat-widget__recipient-chips">
              <div
                v-for="recipient in selectedSendRecipients"
                :key="recipient.id"
                class="chat-widget__recipient-chip"
              >
                <UAvatar
                  :src="recipient.avatarUrl"
                  :alt="recipient.name"
                  size="xs"
                  class="rounded-full"
                />
                <span>{{ recipient.name }}</span>
                <button
                  class="chat-widget__recipient-remove"
                  type="button"
                  :title="$t('navigation.chatWidget.clearSelectedRecipient')"
                  @click="toggleSendRecipient(recipient)"
                >
                  <Icon name="i-ph-x-bold" class="h-2.5 w-2.5" />
                </button>
              </div>
            </div>
            <span v-else class="chat-widget__recipient-empty">{{ $t("navigation.chatWidget.noRecipientSelected") }}</span>
          </div>

          <div v-if="showSendCandidates" class="chat-widget__suggestions">
            <button
              v-for="candidate in sendCandidates"
              :key="candidate.id"
              type="button"
              class="chat-widget__suggestion"
              :class="{ 'chat-widget__suggestion--selected': selectedSendRecipientIds.includes(candidate.userId ?? 0) }"
              @click="toggleSendRecipient(candidate)"
            >
              <UAvatar
                v-if="candidate.type === 'user'"
                :src="candidate.avatarUrl"
                :alt="candidate.name"
                size="xs"
                class="rounded-full"
              />
              <div v-else class="chat-widget__group-icon">
                <Icon name="i-ph-users-three-fill" class="h-4 w-4" />
              </div>
              <div class="min-w-0 flex-1 text-left">
                <p class="chat-widget__suggestion-name">{{ candidate.name }}</p>
                <p class="chat-widget__suggestion-meta">{{ buildPresenceLabel(candidate) }}</p>
              </div>
            </button>
          </div>
          <p v-else-if="sendCandidates.length === 0" class="chat-widget__hint">
            {{ $t("navigation.chatWidget.noMatchingRecipients") }}
          </p>
        </div>

        <div class="chat-widget__send-card">
          <div class="chat-widget__field">
            <label class="chat-widget__field-label">{{ $t("navigation.chatWidget.content") }}</label>
            <UTextarea
              v-model="sendMessage"
              autoresize
              :rows="4"
              :placeholder="$t('navigation.chatWidget.messagePlaceholder')"
              :ui="{
                base: 'chat-widget__textarea rounded-[14px] border border-[var(--border-light)] bg-[var(--bg-muted)] px-4 py-3 text-sm shadow-none',
              }"
              @keydown.enter.exact.prevent="sendQuickMessage"
            />
          </div>

          <div class="chat-widget__composer-tools">
            <input
              ref="fileInput"
              class="hidden"
              type="file"
              @change="onFile"
            >
            <button
              type="button"
              class="chat-widget__attach-btn"
              @click="fileInput?.click()"
            >
              <Icon name="i-ph-paperclip-duotone" class="h-4 w-4" />
              <span>{{ $t("navigation.chatWidget.chooseFile") }}</span>
            </button>
            <template v-if="attachFile">
              <div v-if="attachFilePreviewUrl" class="chat-widget__image-preview-container">
                <img :src="attachFilePreviewUrl" class="chat-widget__image-preview" alt="Preview" />
                <button
                  class="chat-widget__image-preview-clear"
                  type="button"
                  :title="$t('navigation.chatWidget.clearAttachment')"
                  @click="clearFile"
                >
                  <Icon name="i-ph-x-bold" class="h-3 w-3" />
                </button>
              </div>
              <template v-else>
                <span class="chat-widget__file-name">{{ attachFile.name }}</span>
                <button
                  class="chat-widget__clear-btn"
                  type="button"
                  :title="$t('navigation.chatWidget.clearAttachment')"
                  @click="clearFile"
                >
                  <Icon name="i-ph-x-bold" class="h-3 w-3" />
                </button>
              </template>
            </template>
          </div>
        </div>
      </div>

      <div class="chat-widget__send-actions">
        <UButton
          type="button"
          variant="solid"
          icon="i-ph-paper-plane-right-fill"
          class="chat-widget__send-btn btn-primary"
          :loading="isSendingQuick"
          :disabled="!canSendQuickMessage"
          @click="sendQuickMessage"
        >
          {{ $t("navigation.chatWidget.sendMessage") }}
        </UButton>
      </div>
    </div>

    <div v-else class="chat-widget__content">
      <div v-if="isLoadingInbox" class="chat-widget__list chat-widget__list--loading">
        <div v-for="index in 5" :key="index" class="chat-widget__skeleton-row">
          <USkeleton class="h-10 w-10 rounded-full" />
          <div class="min-w-0 flex-1 space-y-2">
            <USkeleton class="h-3 w-2/3 rounded-full" />
            <USkeleton class="h-3 w-full rounded-full" />
          </div>
        </div>
      </div>

      <div
        v-else-if="activeTab === 'contacts' && filteredContacts.length === 0"
        class="chat-widget__empty"
      >
        <Icon name="i-ph-chat-circle-dots-duotone" class="chat-widget__empty-icon" />
        <p>{{ $t("navigation.chatWidget.emptyContacts") }}</p>
      </div>

      <div
        v-else-if="activeTab === 'groups' && filteredGroups.length === 0"
        class="chat-widget__empty"
      >
        <Icon name="i-ph-users-three-duotone" class="chat-widget__empty-icon" />
        <p>{{ $t("navigation.chatWidget.emptyGroups") }}</p>
      </div>
      
      <div v-else class="chat-widget__list">
        <div v-if="activeTab !== 'send'" class="chat-widget__footer">
          <UInput
            v-model="search"
            :placeholder="$t('navigation.chatWidget.searchPlaceholder')"
            icon="i-ph-magnifying-glass-duotone"
            class="chat-widget__footer-input"
            :ui="{
              base: 'chat-widget__footer-input-control',
            }"
          />
        </div>

        <div
          v-for="contact in activeTab === 'contacts' ? filteredContacts : filteredGroups"
          :key="contact.id"
          class="chat-widget__contact-wrapper"
        >
          <button
            class="chat-widget__contact"
            type="button"
            @click="openMiniChat(contact)"
          >
            <div class="chat-widget__contact-avatar-wrap">
              <button
                v-if="contact.type === 'user'"
                type="button"
                class="chat-widget__contact-avatar-btn"
                @click.stop="openAvatarMenu(contact, $event)"
              >
                <UAvatar
                  :src="contact.avatarUrl"
                  :alt="contact.name"
                  size="md"
                  class="h-10 w-10 rounded-full"
                />
                <div
                  class="chat-widget__contact-status"
                  :class="{ 'chat-widget__contact-status--online': contact.isOnline }"
                />
              </button>
              <div v-else class="chat-widget__group-icon chat-widget__group-icon--large">
                <Icon name="i-ph-users-three-fill" class="h-5 w-5" />
              </div>
            </div>

            <div class="chat-widget__contact-info">
              <div class="chat-widget__contact-top">
                <p class="chat-widget__contact-name">{{ contact.name }}</p>
                <span class="chat-widget__contact-time">{{ contact.time }}</span>
              </div>

              <div class="chat-widget__contact-middle">
                <span
                  class="chat-widget__contact-presence"
                  :class="{ 'chat-widget__contact-presence--online': contact.type === 'user' && contact.isOnline }"
                >
                  {{ buildPresenceLabel(contact) }}
                </span>
                <span v-if="contact.unreadCount > 0" class="chat-widget__contact-badge">
                  {{ contact.unreadCount > 99 ? "99+" : contact.unreadCount }}
                </span>
              </div>

              <p v-if="buildPreviewLabel(contact)" class="chat-widget__contact-preview">
                {{ buildPreviewLabel(contact) }}
              </p>
            </div>
          </button>
        </div>

        <!-- Avatar context menu (Teleport to body to avoid overflow clipping) -->
        <Teleport to="body">
          <Transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 scale-95 translate-y-1"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100 scale-100 translate-y-0"
            leave-to-class="opacity-0 scale-95 translate-y-1"
          >
            <div
              v-if="avatarMenuContact"
              class="chat-widget__avatar-menu"
              :style="avatarMenuStyle"
            >
              <div class="chat-widget__avatar-menu-section">
                <div class="chat-widget__avatar-menu-item chat-widget__avatar-menu-item--muted">
                  <Icon name="i-ph-lock-key-duotone" class="h-5 w-5" />
                  <span>{{ $t("navigation.chatWidget.endToEndEncrypted") }}</span>
                </div>
                <button
                  type="button"
                  class="chat-widget__avatar-menu-item"
                  @click="openFullMessagesFromAvatarMenu"
                >
                  <Icon name="i-ph-chat-circle-dots-duotone" class="h-5 w-5" />
                  <span>{{ $t("navigation.chatWidget.openInMessenger") }}</span>
                </button>
                <button
                  v-if="avatarMenuContact.profileUrl"
                  type="button"
                  class="chat-widget__avatar-menu-item"
                  @click="goToAvatarProfile"
                >
                  <Icon name="i-ph-user-circle-duotone" class="h-5 w-5" />
                  <span>{{ $t("navigation.chatWidget.viewProfile") }}</span>
                </button>
              </div>

              <div class="chat-widget__avatar-menu-section">
                <button type="button" class="chat-widget__avatar-menu-item" @click="callAvatarContact('audio')">
                  <Icon name="i-ph-phone-duotone" class="h-5 w-5" />
                  <span>{{ $t("navigation.chatWidget.audioCall") }}</span>
                </button>
                <button type="button" class="chat-widget__avatar-menu-item" @click="callAvatarContact('video')">
                  <Icon name="i-ph-video-camera-duotone" class="h-5 w-5" />
                  <span>{{ $t("navigation.chatWidget.videoCall") }}</span>
                </button>
              </div>

              <div class="chat-widget__avatar-menu-section">
                <button type="button" class="chat-widget__avatar-menu-item" @click="closeAvatarMenu">
                  <Icon name="i-ph-palette-duotone" class="h-5 w-5" />
                  <span>{{ $t("navigation.chatWidget.changeTheme") }}</span>
                </button>
                <button type="button" class="chat-widget__avatar-menu-item" @click="closeAvatarMenu">
                  <Icon name="i-ph-thumbs-up-duotone" class="h-5 w-5" />
                  <span>{{ $t("navigation.chatWidget.changeReaction") }}</span>
                </button>
                <button type="button" class="chat-widget__avatar-menu-item" @click="closeAvatarMenu">
                  <Icon name="i-ph-pencil-simple-duotone" class="h-5 w-5" />
                  <span>{{ $t("navigation.chatWidget.nickname") }}</span>
                </button>
              </div>

              <div class="chat-widget__avatar-menu-section">
                <button type="button" class="chat-widget__avatar-menu-item" @click="openMessagesTabFromAvatarMenu('multi')">
                  <Icon name="i-ph-users-three-duotone" class="h-5 w-5" />
                  <span>{{ $t("navigation.chatWidget.createGroup") }}</span>
                </button>
                <button type="button" class="chat-widget__avatar-menu-item" @click="closeAvatarMenu">
                  <Icon name="i-ph-bell-slash-duotone" class="h-5 w-5" />
                  <span>{{ $t("navigation.chatWidget.muteNotifications") }}</span>
                </button>
                <button type="button" class="chat-widget__avatar-menu-item chat-widget__avatar-menu-item--danger" @click="closeAvatarMenu">
                  <Icon name="i-ph-user-minus-duotone" class="h-5 w-5" />
                  <span>{{ $t("navigation.chatWidget.blockUser") }}</span>
                </button>
              </div>
            </div>
          </Transition>
        </Teleport>
      </div>
      
      <div
        v-for="(miniSession, miniSessionIndex) in openMiniChatSessions"
        :key="miniSession.contact.id"
        class="chat-widget__mini"
        :class="`chat-widget__mini--${miniSessionIndex + 1}`"
      >
        <div class="chat-widget__mini-header">
          <div class="chat-widget__mini-identity">
            <NuxtLink
              v-if="miniSession.contact.type === 'user'"
              :to="miniSession.contact.profileUrl || '#'"
              class="chat-widget__mini-avatar-link"
              :title="$t('navigation.chatWidget.viewProfile')"
              @click="activeMiniHeaderContactId = null"
            >
              <UChip
                :show="Boolean(miniSession.contact.isOnline)"
                position="bottom-right"
                color="success"
                inset
                :ui="{ base: '!bg-emerald-500' }"
              >
                <UAvatar
                  :src="miniSession.contact.avatarUrl"
                  :alt="miniSession.contact.name"
                  size="sm"
                  class="rounded-full"
                />
              </UChip>
            </NuxtLink>
            <div v-else class="chat-widget__group-icon chat-widget__group-icon--selected">
              <Icon name="i-ph-users-three-fill" class="h-4 w-4" />
            </div>
            <button
              type="button"
              class="chat-widget__mini-name-btn"
              @click.stop="toggleMiniHeaderMenu(miniSession)"
            >
              <span class="chat-widget__mini-title">{{ miniSession.contact.name }}</span>
              <span class="chat-widget__mini-status">{{ buildPresenceLabel(miniSession.contact) }}</span>
            </button>
          </div>

          <div class="chat-widget__mini-header-actions">
            <button
              class="chat-widget__header-btn"
              type="button"
              :title="miniSession.contact.type === 'group' ? $t('pages.messagesPage.groupAudioCall') : $t('pages.messagesPage.callLogAudio')"
              :disabled="isCallActionPending"
              @click="startMiniCall(miniSession, 'audio')"
            >
              <Icon name="i-ph-phone-duotone" class="h-3.5 w-3.5" />
            </button>
            <button
              class="chat-widget__header-btn"
              type="button"
              :title="miniSession.contact.type === 'group' ? $t('pages.messagesPage.groupVideoCall') : $t('pages.messagesPage.callLogVideo')"
              :disabled="isCallActionPending"
              @click="startMiniCall(miniSession, 'video')"
            >
              <Icon name="i-ph-video-camera-duotone" class="h-3.5 w-3.5" />
            </button>
            <button
              class="chat-widget__header-btn"
              type="button"
              :title="$t('navigation.chatWidget.minimizeChat')"
              @click="minimizeMiniSession(miniSession)"
            >
              <Icon name="i-ph-minus-bold" class="h-3.5 w-3.5" />
            </button>
            <button
              class="chat-widget__header-btn"
              type="button"
              :title="$t('navigation.chatWidget.actionOpenMessages')"
              @click="openFullMessages(miniSession.contact)"
            >
              <Icon name="i-ph-arrows-out-simple-duotone" class="h-3.5 w-3.5" />
            </button>
            <button class="chat-widget__header-btn" type="button" @click="closeMiniSession(miniSession)">
              <Icon name="i-ph-x-bold" class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div v-if="showMiniHeaderMenuFor(miniSession)" ref="miniHeaderMenuRef" class="chat-widget__mini-menu">
          <div class="chat-widget__mini-menu-section">
            <div class="chat-widget__mini-menu-item chat-widget__mini-menu-item--muted">
              <UIcon name="i-ph-lock-key-duotone" class="h-5 w-5" />
              <span>{{ $t("navigation.chatWidget.endToEndEncrypted") }}</span>
            </div>
            <button
              type="button"
              class="chat-widget__mini-menu-item"
              @click="openFullMessagesFromMiniMenu(miniSession)"
            >
              <UIcon name="i-ph-chat-circle-dots-duotone" class="h-5 w-5" />
              <span>{{ $t("navigation.chatWidget.openInMessenger") }}</span>
            </button>
            <button
              v-if="miniSession.contact.profileUrl"
              type="button"
              class="chat-widget__mini-menu-item"
              @click="openMiniProfile(miniSession)"
            >
              <UIcon name="i-ph-user-circle-duotone" class="h-5 w-5" />
              <span>{{ $t("navigation.chatWidget.viewProfile") }}</span>
            </button>
          </div>

          <div class="chat-widget__mini-menu-section">
            <button type="button" class="chat-widget__mini-menu-item" @click="closeMiniHeaderMenu">
              <UIcon name="i-ph-circle-fill" class="h-5 w-5 text-[#5b5cff]" />
              <span>{{ $t("navigation.chatWidget.changeTheme") }}</span>
            </button>
            <button type="button" class="chat-widget__mini-menu-item" @click="closeMiniHeaderMenu">
              <UIcon name="i-ph-thumbs-up-fill" class="h-5 w-5 text-[#5b5cff]" />
              <span>{{ $t("navigation.chatWidget.changeReaction") }}</span>
            </button>
            <button type="button" class="chat-widget__mini-menu-item" @click="closeMiniHeaderMenu">
              <UIcon name="i-ph-pencil-simple-duotone" class="h-5 w-5" />
              <span>{{ $t("navigation.chatWidget.nickname") }}</span>
            </button>
          </div>

          <div class="chat-widget__mini-menu-section">
            <button type="button" class="chat-widget__mini-menu-item" @click="openMessagesTabFromMiniMenu('multi')">
              <UIcon name="i-ph-users-three-duotone" class="h-5 w-5" />
              <span>{{ $t("navigation.chatWidget.createGroup") }}</span>
            </button>
            <button type="button" class="chat-widget__mini-menu-item" @click="closeMiniHeaderMenu">
              <UIcon name="i-ph-bell-slash-duotone" class="h-5 w-5" />
              <span>{{ $t("navigation.chatWidget.muteNotifications") }}</span>
            </button>
            <button type="button" class="chat-widget__mini-menu-item chat-widget__mini-menu-item--danger" @click="closeMiniHeaderMenu">
              <UIcon name="i-ph-user-minus-duotone" class="h-5 w-5" />
              <span>{{ $t("navigation.chatWidget.blockUser") }}</span>
            </button>
          </div>
        </div>

        <div
          :ref="element => setMiniMessagesViewport(miniSession.contactId, element)"
          class="chat-widget__mini-messages"
          @scroll="handleMiniScroll($event, miniSession)"
        >
          <div v-if="miniSession.isLoading" class="space-y-3">
            <USkeleton v-for="index in 3" :key="index" class="h-12 rounded-2xl" />
          </div>

          <div v-else-if="miniSession.messages.length === 0" class="chat-widget__empty chat-widget__empty--mini">
            <Icon name="i-ph-chat-teardrop-text-duotone" class="chat-widget__empty-icon" />
            <p>{{ $t("navigation.chatWidget.emptyMessages") }}</p>
          </div>

          <div v-else class="chat-widget__mini-thread">
            <div v-if="miniSession.isLoadingMore" class="flex justify-center py-2">
              <UIcon name="i-ph-circle-notch-bold" class="h-4 w-4 animate-spin text-primary-500" />
            </div>
            <div
              v-for="message in miniSession.messages"
              :key="message.id"
              class="chat-widget__mini-message"
              :class="{ 'chat-widget__mini-message--mine': message.isMine }"
            >
              <ChatBubble
                :text="getMiniBubbleText(message)"
                :is-mine="message.isMine"
                :is-last="message.isLast"
                :show-author="miniSession.contact.type === 'group' && message.showAuthor"
                :time="message.time"
                :show-time="message.showTime"
                :avatar="message.avatar || miniSession.contact.avatarUrl"
                :sender-is-online="getMiniMessageSenderOnline(miniSession, message)"
                :author-name="message.authorName"
                :timeline-title="getMiniMessageTimelineTitle(message)"
                :reply-title="!message.isDeleted && getMiniReplyMeta(message) ? getMiniReplyTitle(message) : undefined"
                :reply-quote="!message.isDeleted && !getMiniReplyMeta(message)?.mediaUrl && !isMiniImageFileQuote(getMiniReplyMeta(message)?.quote) ? getMiniReplyMeta(message)?.quote : undefined"
                :reply-media-url="!message.isDeleted ? getMiniReplyMeta(message)?.mediaUrl : undefined"
                :reaction-src="!message.isDeleted ? getMiniMessageReaction(message)?.src : undefined"
                :reaction-alt="!message.isDeleted ? $t(getMiniMessageReaction(message)?.labelKey ?? defaultMiniReaction.labelKey) : undefined"
                :show-tools="!message.isDeleted"
                :reaction-picker-open="activeMiniReactionPickerId === message.id"
                :reaction-options="miniBubbleReactionOptions"
                :can-delete="message.isMine"
                :media-url="message.isDeleted ? undefined : message.mediaUrl"
                :media-name="message.isDeleted ? undefined : message.mediaName"
                :media-type="message.isDeleted ? undefined : message.mediaType"
                :call-log="message.isDeleted ? undefined : message.callLog"
                class="chat-widget__mini-chat-bubble"
                :class="{ 'chat-widget__mini-chat-bubble--deleted': message.isDeleted }"
                @avatar-click="openMiniMessageAvatarMenu(miniSession, message, $event)"
                @retry-call="openFullMessages(miniSession.contact)"
                @toggle-reaction-picker="toggleMiniReactionPicker(message.id)"
                @select-reaction="setMiniReactionByValue(message.id, $event.value)"
                @reply="replyToMiniMessage(message)"
                @delete="deleteMiniMessageAction(message)"
              />
            </div>
          </div>
        </div>

        <div v-if="miniReplyTarget || miniSession.attachFile || activeMiniRecordDraft || isMiniRecording" class="chat-widget__mini-draft">
          <div v-if="miniReplyTarget" class="chat-widget__mini-reply-preview">
            <div class="chat-widget__mini-reply-copy">
              <strong>{{ miniReplyTitle }}</strong>
              <NuxtImg
                v-if="miniReplyPreviewMediaUrl"
                :src="miniReplyPreviewMediaUrl"
                :alt="miniReplyPreviewText || miniReplyTitle"
                class="chat-widget__mini-reply-image"
              />
              <span v-if="!miniReplyPreviewMediaUrl">{{ miniReplyPreviewText }}</span>
            </div>
            <button type="button" class="chat-widget__mini-preview-clear" @click="miniReplyTarget = null">
              <Icon name="i-ph-x-bold" class="h-3 w-3" />
            </button>
          </div>
          <div v-if="miniSession.attachFile" class="chat-widget__mini-file-preview-container">
            <div v-if="miniSession.attachFilePreviewUrl" class="chat-widget__mini-image-preview-wrapper">
              <img :src="miniSession.attachFilePreviewUrl" class="chat-widget__mini-image-preview" alt="Preview" />
              <button type="button" class="chat-widget__mini-image-preview-clear" @click="clearMiniFile(miniSession.contact.id)">
                <Icon name="i-ph-x-bold" class="h-3 w-3" />
              </button>
            </div>
            <div v-else class="chat-widget__mini-file-preview">
              <Icon name="i-ph-paperclip-duotone" class="h-3.5 w-3.5" />
              <span>{{ miniSession.attachFile.name }}</span>
              <button type="button" @click="clearMiniFile(miniSession.contact.id)">
                <Icon name="i-ph-x-bold" class="h-3 w-3" />
              </button>
            </div>
          </div>
          <div v-if="activeMiniRecordDraft || isMiniRecording" class="chat-widget__mini-file-preview">
            <Icon name="i-ph-microphone-duotone" class="h-3.5 w-3.5" />
            <span>{{ isMiniRecording ? $t("pages.messagesPage.recordingInProgress") : $t("pages.messagesPage.recordReady") }}</span>
            <button type="button" @click="discardMiniRecording">
              <Icon name="i-ph-x-bold" class="h-3 w-3" />
            </button>
          </div>
        </div>

        <div class="chat-widget__mini-input-wrap">
          <div class="chat-widget__mini-input-shell">
            <UInput
              v-model="miniSession.message"
              :placeholder="$t('navigation.chatWidget.miniInputPlaceholder')"
              class="chat-widget__mini-input"
              :ui="{
                base: 'chat-widget__mini-input-control',
              }"
              @keydown.enter.exact.prevent="handleMiniEnterKey($event, miniSession)"
            />
            <button
              type="button"
              class="chat-widget__mini-send-btn"
              :disabled="!canSubmitMiniMessage(miniSession)"
              :title="$t('navigation.chatWidget.sendMessage')"
              @click="submitMiniMessage(miniSession)"
            >
              <UIcon
                :name="miniSession.isSending ? 'i-ph-circle-notch-bold' : 'i-ph-paper-plane-right-fill'"
                class="chat-widget__mini-send-icon btn-primary"
                :class="{ 'animate-spin': miniSession.isSending }"
              />
            </button>
          </div>
          <input :id="`mini-image-input-${miniSession.contact.id}`" type="file" accept="image/*" class="hidden" @change="handleMiniFileChange(miniSession, $event)">
          <input :id="`mini-file-input-${miniSession.contact.id}`" type="file" class="hidden" @change="handleMiniFileChange(miniSession, $event)">
          <button
            type="button"
            class="chat-widget__mini-tool-btn"
            :class="{ 'chat-widget__mini-tool-btn--active': isMiniRecording }"
            :title="$t('pages.messagesPage.startRecording')"
            :disabled="!isMiniRecordSupported"
            @click="handleMiniRecordButton(miniSession)"
          >
            <Icon :name="isMiniRecording ? 'i-ph-stop-circle-duotone' : 'i-ph-microphone-duotone'" class="h-4 w-4" />
          </button>
          <button type="button" class="chat-widget__mini-tool-btn" :title="$t('pages.messagesPage.attachmentLabel')" @click="triggerMiniFileInput('image', miniSession.contact.id)">
            <Icon name="i-ph-image-duotone" class="h-4 w-4" />
          </button>
          <button type="button" class="chat-widget__mini-tool-btn" :title="$t('navigation.chatWidget.chooseFile')" @click="triggerMiniFileInput('file', miniSession.contact.id)">
            <Icon name="i-ph-paperclip-duotone" class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
    

    <button
      v-for="(launcher, launcherIndex) in miniLaunchers"
      :key="launcher.id"
      type="button"
      class="chat-widget__mini-launcher"
      :class="`chat-widget__mini-launcher--${launcherIndex + 1}`"
      :title="launcher.name"
      @click="restoreMiniLauncher(launcher)"
    >
      <UChip
        :show="Boolean(launcher.unreadCount && launcher.unreadCount > 0)"
        position="top-right"
        color="success"
        inset
        :ui="{ base: '!bg-emerald-500' }"
      >
        <UAvatar
          v-if="launcher.type === 'user'"
          :src="launcher.avatarUrl"
          :alt="launcher.name"
          size="lg"
          class="rounded-full"
        />
        <div v-else class="chat-widget__mini-launcher-group">
          <Icon name="i-ph-users-three-fill" class="h-5 w-5" />
        </div>
      </UChip>
    </button>

    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 scale-95 translate-y-1"
        enter-to-class="opacity-100 scale-100 translate-y-0"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100 scale-100 translate-y-0"
        leave-to-class="opacity-0 scale-95 translate-y-1"
      >
        <div
          v-if="messageAvatarMenuContact"
          ref="messageAvatarMenuRef"
          class="chat-widget__message-avatar-menu"
          :style="messageAvatarMenuStyle"
        >
          <button
            v-if="messageAvatarMenuContact.profileUrl"
            type="button"
            class="chat-widget__message-avatar-menu-item"
            @click="goToMessageAvatarProfile"
          >
            <UIcon name="i-ph-user-circle-duotone" class="h-5 w-5" />
            <span>{{ $t("navigation.chatWidget.viewProfile") }}</span>
          </button>
          <button type="button" class="chat-widget__message-avatar-menu-item chat-widget__message-avatar-menu-item--danger" @click="closeMessageAvatarMenu">
            <UIcon name="i-ph-user-minus-duotone" class="h-5 w-5" />
            <span>{{ $t("navigation.chatWidget.blockUser") }}</span>
          </button>
          <button type="button" class="chat-widget__message-avatar-menu-item" @click="callMessageAvatarContact('audio')">
            <UIcon name="i-ph-phone-duotone" class="h-5 w-5" />
            <span>{{ $t("navigation.chatWidget.audioCall") }}</span>
          </button>
          <button type="button" class="chat-widget__message-avatar-menu-item" @click="callMessageAvatarContact('video')">
            <UIcon name="i-ph-video-camera-duotone" class="h-5 w-5" />
            <span>{{ $t("navigation.chatWidget.videoCall") }}</span>
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { defaultFeedReactionAsset, feedReactionAssetByValue, feedReactionAssets, type FeedReactionAsset } from "../../../feed/application/constants/reaction-assets"
import { useMessageCalls } from "../../../messages/application/composables/useMessageCalls"
import { useMessageRecorder } from "../../../messages/application/composables/useMessageRecorder"
import ChatBubble from "../../../messages/presentation/components/ChatBubble.vue"
import type { MessageCallType } from "../../../messages/domain/types/calls.types"
import type { MessageContact, MessageItem } from "../../../messages/domain/types/messages.types"
import { useChatWidgetVM } from "../../application/view-models/useChatWidgetVM"

const tabs = [
  {
    value: "send",
    icon: "i-ph-paper-plane-right-duotone",
    activeIcon: "i-ph-paper-plane-tilt-fill",
    label: "navigation.chatWidget.tabSend",
  },
  {
    value: "contacts",
    icon: "i-ph-users-duotone",
    activeIcon: "i-ph-users-fill",
    label: "navigation.chatWidget.tabContacts",
  },
  {
    value: "groups",
    icon: "i-ph-users-three-duotone",
    activeIcon: "i-ph-users-three-fill",
    label: "navigation.chatWidget.tabGroups",
  },
] as const

const fileInput = ref<HTMLInputElement | null>(null)
const { t } = useI18n()
const miniMessagesViewports = new Map<string, HTMLElement>()
const miniHeaderMenuRef = ref<HTMLElement | null>(null)
const messageAvatarMenuRef = ref<HTMLElement | null>(null)
const activeMiniHeaderContactId = ref<string | null>(null)
const miniReactionOptions = feedReactionAssets
const defaultMiniReaction = defaultFeedReactionAsset

// Avatar context menu
type AvatarMenuContact = (typeof filteredContacts)['value'][number]
const avatarMenuContact = ref<AvatarMenuContact | null>(null)
const avatarMenuStyle = ref<Record<string, string>>({})
const messageAvatarMenuContact = ref<AvatarMenuContact | null>(null)
const messageAvatarMenuStyle = ref<Record<string, string>>({})
const messageAvatarMenuMessageId = ref<number | null>(null)
const activeMiniReactionPickerId = ref<number | null>(null)
const miniMessageReactions = ref<Record<number, FeedReactionAsset | undefined>>({})
const miniReplyTarget = ref<MessageItem | null>(null)
const MINI_REPLY_PREFIX = "__VNSEEA_MINI_REPLY__:"
const {
  isCallActionPending,
  startCall,
  startGroupCall,
} = useMessageCalls()
const {
  isSupported: isMiniRecordSupported,
  isRecording: isMiniRecording,
  recordDraft: miniRecordDraft,
  startRecording: startMiniRecording,
  stopRecording: stopMiniRecording,
  clearRecording: clearMiniRecording,
} = useMessageRecorder()
const {
  activeTab,
  search,
  activeSendTagFilter,
  sendTo,
  sendMessage,
  attachFile,
  attachFilePreviewUrl,
  allVisibleSendRecipientsSelected,
  sendCandidates,
  selectedSendRecipientIds,
  selectedSendRecipients,
  filteredContacts,
  filteredGroups,
  onlineCount,
  miniChatOpen,
  miniChatSessions,
  miniChatAutoOpenVersion,
  activeMiniContact,
  isLoadingInbox,
  isSendingQuick,
  canSendQuickMessage,
  buildPresenceLabel,
  buildPreviewLabel,
  messageTagLabels,
  toggleAllVisibleSendRecipients,
  toggleSendRecipient,
  openMiniChat: openMiniChatVm,
  closeMiniChat: closeMiniChatVm,
  minimizeMiniChat,
  restoreMiniChat,
  sendQuickMessage,
  sendMiniMessage,
  reactToMiniMessage,
  deleteMiniMessage,
  onMiniFile,
  clearMiniFile,
  onFile,
  clearFile,
  openFullMessages,
  openMessagesTab,
  loadOlderMiniMessages,
} = useChatWidgetVM()

type MiniChatSessionView = (typeof miniChatSessions)["value"][number]

const showSendCandidates = computed(() => {
  return sendCandidates.value.length > 0
})

const openMiniChatSessions = computed(() =>
  miniChatSessions.value.filter(session => !session.minimized),
)
const miniLaunchers = computed(() =>
  miniChatSessions.value
    .filter(session => session.minimized)
    .map(session => session.contact)
    .slice(0, 2),
)
const activeMiniRecordDraft = computed(() => miniRecordDraft.value)
const miniReplyAuthor = computed(() => {
  if (!miniReplyTarget.value) {
    return ""
  }

  if (miniReplyTarget.value.isMine) {
    return t("pages.messagesPage.you")
  }

  return miniReplyTarget.value.authorName || activeMiniContact.value?.name || ""
})
const miniReplyTitle = computed(() =>
  miniReplyAuthor.value
    ? t("navigation.chatWidget.replyingTo", { name: miniReplyAuthor.value })
    : t("navigation.chatWidget.replyingToMessage"),
)
const miniReplyPreviewText = computed(() =>
  miniReplyTarget.value
    ? getMiniBubbleText(miniReplyTarget.value) || miniReplyTarget.value.mediaName || t("navigation.chatWidget.replyingToMessage")
    : t("navigation.chatWidget.replyingToMessage"),
)
const miniReplyPreviewMediaUrl = computed(() =>
  miniReplyTarget.value
  && miniReplyTarget.value.mediaUrl
  && (miniReplyTarget.value.mediaType === "image" || miniReplyTarget.value.mediaType === "gif")
    ? miniReplyTarget.value.mediaUrl
    : "",
)
const miniBubbleReactionOptions = computed(() =>
  miniReactionOptions.map(reaction => ({
    value: reaction.value,
    src: reaction.src,
    label: t(reaction.labelKey),
  })),
)
const miniSubmittingMap = ref<Record<string, boolean>>({})

function canSubmitMiniMessage(session: MiniChatSessionView) {
  if (miniSubmittingMap.value[session.contactId]) {
    return false
  }
  return !isMiniRecording.value
    && (
      session.canSend
      || Boolean(activeMiniRecordDraft.value)
      || Boolean(miniReplyTarget.value && session.message.trim())
    )
}

async function openMiniChat(contact: Parameters<typeof openMiniChatVm>[0]) {
  activeMiniHeaderContactId.value = null
  closeMessageAvatarMenu()
  miniReplyTarget.value = null
  activeMiniReactionPickerId.value = null
  clearMiniRecording()
  await openMiniChatVm(contact)
  await nextTick()
  scrollMiniMessagesToBottom(contact.id)
}

function triggerMiniFileInput(type: 'image' | 'file', contactId: string) {
  if (!import.meta.client) return
  const inputId = type === 'image' ? `mini-image-input-${contactId}` : `mini-file-input-${contactId}`
  const inputEl = document.getElementById(inputId) as HTMLInputElement | null
  if (inputEl) {
    inputEl.click()
  }
}

function closeMiniChat() {
  activeMiniHeaderContactId.value = null
  closeMessageAvatarMenu()
  miniReplyTarget.value = null
  activeMiniReactionPickerId.value = null
  clearMiniRecording()
  closeMiniChatVm()
}

function closeMiniSession(session: MiniChatSessionView) {
  activeMiniHeaderContactId.value = null
  closeMessageAvatarMenu()
  miniReplyTarget.value = null
  activeMiniReactionPickerId.value = null
  clearMiniRecording()
  closeMiniChatVm(session.contactId)
}

function minimizeMiniSession(session: MiniChatSessionView) {
  activeMiniHeaderContactId.value = null
  activeMiniReactionPickerId.value = null
  closeMessageAvatarMenu()
  minimizeMiniChat(session.contactId)
}

async function restoreMiniLauncher(contact: MessageContact) {
  activeMiniHeaderContactId.value = null
  restoreMiniChat(contact.id)
  await nextTick()
  scrollMiniMessagesToBottom(contact.id)
}

function toggleMiniHeaderMenu(session: MiniChatSessionView) {
  activeMiniHeaderContactId.value = activeMiniHeaderContactId.value === session.contact.id
    ? null
    : session.contact.id
  closeMessageAvatarMenu()
}

function showMiniHeaderMenuFor(session: MiniChatSessionView) {
  return activeMiniHeaderContactId.value === session.contact.id
}

function closeMiniHeaderMenu() {
  activeMiniHeaderContactId.value = null
}

function openAvatarMenu(contact: AvatarMenuContact, event: MouseEvent) {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const menuWidth = 300
  const menuHeight = 430
  const vw = window.innerWidth
  const vh = window.innerHeight

  let left = rect.right + 10
  let top = rect.top

  if (left + menuWidth > vw - 8) {
    left = rect.left - menuWidth - 10
  }
  if (top + menuHeight > vh - 8) {
    top = Math.max(8, vh - menuHeight - 8)
  }

  avatarMenuStyle.value = {
    position: 'fixed',
    left: `${Math.max(8, left)}px`,
    top: `${Math.max(8, top)}px`,
    zIndex: '9999',
  }
  avatarMenuContact.value = contact
}

function closeAvatarMenu() {
  avatarMenuContact.value = null
}

async function openFullMessagesFromAvatarMenu() {
  const contact = avatarMenuContact.value
  closeAvatarMenu()
  await openFullMessages(contact)
}

async function openMessagesTabFromAvatarMenu(tab: "user" | "group" | "multi") {
  closeAvatarMenu()
  await openMessagesTab(tab)
}

async function goToAvatarProfile() {
  const profileUrl = avatarMenuContact.value?.profileUrl
  closeAvatarMenu()
  if (profileUrl) {
    await navigateTo(profileUrl)
  }
}

async function chatWithAvatarContact() {
  const contact = avatarMenuContact.value
  closeAvatarMenu()
  if (contact) {
    await openMiniChat(contact)
  }
}

async function callAvatarContact(type: 'audio' | 'video') {
  const contact = avatarMenuContact.value
  closeAvatarMenu()
  if (!contact) return
  if (contact.type === 'group') {
    await startGroupCall(contact, type)
  }
  else if (contact.type === 'user') {
    await startCall(contact, type)
  }
}

function openMiniMessageAvatarMenu(session: MiniChatSessionView, message: MessageItem, event: MouseEvent) {
  const contact = session.contact

  if (!contact || message.isMine) {
    return
  }

  if (messageAvatarMenuContact.value && messageAvatarMenuMessageId.value === message.id) {
    closeMessageAvatarMenu()
    return
  }

  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const menuWidth = 270
  const menuHeight = 198
  const vw = window.innerWidth
  const vh = window.innerHeight

  let left = rect.left + 12
  let top = rect.top - menuHeight - 10

  if (left + menuWidth > vw - 8) {
    left = vw - menuWidth - 8
  }
  if (top < 8) {
    top = Math.min(vh - menuHeight - 8, rect.bottom + 10)
  }

  messageAvatarMenuStyle.value = {
    position: "fixed",
    left: `${Math.max(8, left)}px`,
    top: `${Math.max(8, top)}px`,
    zIndex: "10000",
  }
  messageAvatarMenuContact.value = {
    ...contact,
    name: message.authorName || contact.name,
    avatarUrl: message.avatar || contact.avatarUrl,
  } as AvatarMenuContact
  messageAvatarMenuMessageId.value = message.id
  activeMiniHeaderContactId.value = null
}

function closeMessageAvatarMenu() {
  messageAvatarMenuContact.value = null
  messageAvatarMenuMessageId.value = null
}

function closeFloatingMenusOnOutsideClick(event: MouseEvent) {
  const target = event.target as Node | null

  if (!target) {
    return
  }

  if (activeMiniHeaderContactId.value && !miniHeaderMenuRef.value?.contains(target)) {
    activeMiniHeaderContactId.value = null
  }

  if (messageAvatarMenuContact.value && !messageAvatarMenuRef.value?.contains(target)) {
    closeMessageAvatarMenu()
  }
}

onMounted(() => {
  document.addEventListener("click", closeFloatingMenusOnOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener("click", closeFloatingMenusOnOutsideClick)
})

async function goToMessageAvatarProfile() {
  const profileUrl = messageAvatarMenuContact.value?.profileUrl
  closeMessageAvatarMenu()

  if (profileUrl) {
    await navigateTo(profileUrl)
  }
}

async function callMessageAvatarContact(type: "audio" | "video") {
  const contact = messageAvatarMenuContact.value
  closeMessageAvatarMenu()

  if (!contact) {
    return
  }

  if (contact.type === "group") {
    await startGroupCall(contact, type)
    return
  }

  if (contact.type === "user") {
    await startCall(contact, type)
  }
}

async function openMiniProfile(session: MiniChatSessionView) {
  const profileUrl = session.contact.profileUrl
  closeMiniHeaderMenu()

  if (profileUrl) {
    await navigateTo(profileUrl)
  }
}

async function openFullMessagesFromMiniMenu(session: MiniChatSessionView) {
  const contact = session.contact
  closeMiniHeaderMenu()
  await openFullMessages(contact)
}

async function openMessagesTabFromMiniMenu(tab: "user" | "group" | "multi") {
  closeMiniHeaderMenu()
  await openMessagesTab(tab)
}

async function startMiniCall(session: MiniChatSessionView, type: MessageCallType) {
  const contact = session.contact

  if (!contact) {
    return
  }

  if (contact.type === "group") {
    await startGroupCall(contact, type)
    return
  }

  if (contact.type === "user") {
    await startCall(contact, type)
  }
}

function getMiniMessageSenderOnline(session: MiniChatSessionView, message: { isMine: boolean, senderIsOnline?: boolean }) {
  if (message.isMine) {
    return false
  }

  return message.senderIsOnline ?? session.contact.isOnline ?? false
}

function toggleMiniReactionPicker(messageId: number) {
  activeMiniReactionPickerId.value = activeMiniReactionPickerId.value === messageId
    ? null
    : messageId
}

function getMiniMessageReaction(message: MessageItem) {
  return miniMessageReactions.value[message.id]
    ?? (message.selectedReaction ? feedReactionAssetByValue[message.selectedReaction] : undefined)
}

async function setMiniReaction(messageId: number, reaction: FeedReactionAsset) {
  const previousReaction = miniMessageReactions.value[messageId]
  miniMessageReactions.value = {
    ...miniMessageReactions.value,
    [messageId]: reaction,
  }
  activeMiniReactionPickerId.value = null

  try {
    const result = await reactToMiniMessage(messageId, reaction.value)
    miniMessageReactions.value = {
      ...miniMessageReactions.value,
      [messageId]: feedReactionAssetByValue[result?.reaction ?? reaction.value],
    }
  }
  catch {
    miniMessageReactions.value = {
      ...miniMessageReactions.value,
      [messageId]: previousReaction,
    }
  }
}

async function setMiniReactionByValue(messageId: number, reactionValue: string) {
  const reaction = miniReactionOptions.find(item => item.value === reactionValue)

  if (!reaction) {
    return
  }

  await setMiniReaction(messageId, reaction)
}

async function deleteMiniMessageAction(message: MessageItem) {
  if (!message.isMine || message.isDeleted) {
    return
  }

  const previousReaction = miniMessageReactions.value[message.id]
  activeMiniReactionPickerId.value = null
  miniMessageReactions.value = {
    ...miniMessageReactions.value,
    [message.id]: undefined,
  }

  try {
    await deleteMiniMessage(message.id)
    if (miniReplyTarget.value?.id === message.id) {
      miniReplyTarget.value = null
    }
  }
  catch {
    miniMessageReactions.value = {
      ...miniMessageReactions.value,
      [message.id]: previousReaction,
    }
  }
}

function replyToMiniMessage(message: MessageItem) {
  if (message.isDeleted) {
    return
  }

  miniReplyTarget.value = message
  activeMiniReactionPickerId.value = null
}

function buildMiniReplyText(text: string) {
  if (!miniReplyTarget.value) {
    return normalizeMiniMessageText(text)
  }

  const isImageReply = Boolean(
    miniReplyTarget.value.mediaUrl
    && (miniReplyTarget.value.mediaType === "image" || miniReplyTarget.value.mediaType === "gif"),
  )
  const source = normalizeMiniMessageText(
    isImageReply
      ? "Tin nhan"
      : getMiniBubbleText(miniReplyTarget.value) || miniReplyTarget.value.mediaName || "Tin nhan",
  )
  const snippet = source.length > 72 ? `${source.slice(0, 72)}...` : source
  const author = miniReplyAuthor.value || "Tin nhan"
  const payload = encodeURIComponent(JSON.stringify({
    author,
    quote: snippet,
    mediaUrl: isImageReply ? miniReplyTarget.value.mediaUrl : "",
    mediaType: isImageReply ? miniReplyTarget.value.mediaType : "",
  }))

  return `${MINI_REPLY_PREFIX}${payload}\n${normalizeMiniMessageText(text)}`
}

function getMiniReplyMeta(message: MessageItem) {
  const normalizedText = normalizeMiniMessageText(message.text)
  const [replyLine, ...bodyLines] = normalizedText.split("\n")

  if (replyLine?.startsWith(MINI_REPLY_PREFIX)) {
    try {
      const payload = JSON.parse(decodeURIComponent(replyLine.slice(MINI_REPLY_PREFIX.length))) as {
        author?: string
        quote?: string
        mediaUrl?: string
        mediaType?: MessageItem["mediaType"]
      }

      return {
        author: normalizeMiniMessageText(payload.author || ""),
        quote: normalizeMiniMessageText(payload.quote || ""),
        mediaUrl: payload.mediaUrl || "",
        mediaType: payload.mediaType || "",
        body: normalizeMiniMessageText(bodyLines.join("\n")),
      }
    }
    catch {
      return null
    }
  }

  if (!replyLine?.startsWith("\u21AA ")) {
    return null
  }

  const rawReply = replyLine.slice(2).trim()
  const separatorIndex = rawReply.indexOf(": ")
  const author = separatorIndex > 0 ? rawReply.slice(0, separatorIndex) : ""
  const quote = separatorIndex > 0 ? rawReply.slice(separatorIndex + 2) : rawReply

  return {
    author: normalizeMiniMessageText(author),
    quote: normalizeMiniMessageText(quote),
    mediaUrl: "",
    mediaType: "",
    body: normalizeMiniMessageText(bodyLines.join("\n")),
  }
}

function getMiniBubbleText(message: MessageItem) {
  if (message.isDeleted) {
    if (message.isMine) {
      return t("navigation.chatWidget.youDeletedMessage")
    }

    return t("navigation.chatWidget.userDeletedMessage", {
      name: message.deletedByName || message.authorName || activeMiniContact.value?.name || "",
    })
  }

  const replyMeta = getMiniReplyMeta(message)

  if (replyMeta) {
    return replyMeta.body
  }

  return normalizeMiniMessageText(message.text)
}

function getMiniMessageTimelineTitle(message: MessageItem) {
  const sentTime = message.time || (message.timestamp ? formatMiniMessageClock(message.timestamp) : "")
  const deletedTime = message.deletedTime || (message.deletedAt ? formatMiniMessageClock(message.deletedAt) : "")
  const lines = []

  if (sentTime) {
    lines.push(t("navigation.chatWidget.messageSentAt", { time: sentTime }))
  }

  if (message.isDeleted && deletedTime) {
    lines.push(t("navigation.chatWidget.messageDeletedAt", { time: deletedTime }))
  }

  return lines.join("\n")
}

function formatMiniMessageClock(seconds: number) {
  return new Date(seconds * 1000).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getMiniReplyTitle(message: MessageItem) {
  const meta = getMiniReplyMeta(message)
  const author = meta?.author || activeMiniContact.value?.name || ""

  if (message.isMine) {
    return author
      ? t("navigation.chatWidget.youRepliedTo", { name: author })
      : t("navigation.chatWidget.youReplied")
  }

  return author
    ? t("navigation.chatWidget.userRepliedTo", { name: author })
    : t("navigation.chatWidget.userReplied")
}

function normalizeMiniMessageText(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&nbsp;/gi, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function isMiniImageFileQuote(value?: string) {
  return /\.(png|jpe?g|webp|bmp|gif)$/i.test(value || "")
}

function handleMiniEnterKey(event: KeyboardEvent, session: MiniChatSessionView) {
  if (event.isComposing) {
    return
  }
  submitMiniMessage(session)
}

async function submitMiniMessage(session: MiniChatSessionView) {
  const contactId = session.contactId
  if (miniSubmittingMap.value[contactId]) {
    return
  }

  const trimmed = session.message.trim()
  if (!trimmed && !activeMiniRecordDraft.value && !session.attachFile) {
    return
  }

  miniSubmittingMap.value[contactId] = true

  const text = buildMiniReplyText(trimmed)
  session.message = ""

  await sendMiniMessage({
    contactId: session.contactId,
    textOverride: text,
    record: activeMiniRecordDraft.value,
  })
  miniReplyTarget.value = null
  clearMiniRecording()

  setTimeout(() => {
    miniSubmittingMap.value[contactId] = false
  }, 300)
}

async function sendMiniLike(session: MiniChatSessionView) {
  await sendMiniMessage({ contactId: session.contactId, textOverride: "\u{1F44D}" })
}

function handleMiniFileChange(session: MiniChatSessionView, event: Event) {
  if (miniRecordDraft.value || isMiniRecording.value) {
    clearMiniRecording()
  }

  onMiniFile(event, session.contactId)
}

async function handleMiniRecordButton(session: MiniChatSessionView) {
  if (isMiniRecording.value) {
    await stopMiniRecording()
    return
  }

  clearMiniFile(session.contactId)
  await startMiniRecording()
}

function discardMiniRecording() {
  clearMiniRecording()
}

function setMiniMessagesViewport(contactId: string, element: unknown) {
  if (element instanceof HTMLElement) {
    miniMessagesViewports.set(contactId, element)
    return
  }

  miniMessagesViewports.delete(contactId)
}

async function handleMiniScroll(event: Event, session: MiniChatSessionView) {
  const target = event.target as HTMLElement
  if (target.scrollTop === 0 && !session.isLoadingMore) {
    const previousScrollHeight = target.scrollHeight
    await loadOlderMiniMessages(session.contactId)
    await nextTick()
    target.scrollTop = target.scrollHeight - previousScrollHeight
  }
}

function scrollMiniMessagesToBottom(contactId?: string) {
  const viewports = contactId
    ? miniMessagesViewports.get(contactId)
      ? [miniMessagesViewports.get(contactId) as HTMLElement]
      : []
    : [...miniMessagesViewports.values()]

  for (const viewport of viewports) {
    viewport.scrollTop = viewport.scrollHeight
  }
}

watch(
  () => [miniChatOpen.value, miniChatSessions.value.map(session => session.messages.length).join(",")] as const,
  async ([open]) => {
    if (!open) {
      return
    }

    await nextTick()
    scrollMiniMessagesToBottom()
  },
  { flush: "post" },
)

watch(miniChatAutoOpenVersion, (version) => {
  if (version > 0) {
    activeMiniHeaderContactId.value = null
  }
})
</script>

<style scoped>
.chat-widget {
  position: relative;
  z-index: 0;
  display: flex;
  height: 100%;
  max-height: 100%;
  min-height: 0;
  width: 100%;
  flex-direction: column;
  overflow: visible;
}

.chat-widget__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 12px;
  border-bottom: 1px solid #f1f5f9;
  flex-shrink: 0;
}

.chat-widget__title {
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.01em;
}

.chat-widget__online {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 2px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
}

.chat-widget__online-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #0ea5e9;
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.chat-widget__header-actions,
.chat-widget__mini-header-actions {
  display: flex;
  gap: 4px;
}

.chat-widget__mini-header-actions {
  flex-shrink: 0;
}

.chat-widget__header-btn {
  display: flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: none;
  background: #f1f5f9;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s ease;
}

.chat-widget__header-btn:hover {
  background: rgba(0, 0, 255, 0.06);
  color: #0000ff;
}

.chat-widget__header-btn:disabled {
  cursor: default;
  opacity: 0.55;
}

.chat-widget__mini-header-actions .chat-widget__header-btn {
  width: 30px;
  height: 30px;
  border-radius: 9px;
}

.chat-widget__tabs {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  border-bottom: 1px solid #f1f5f9;
  flex-shrink: 0;
  background: #ffffff;
}

.chat-widget__tab {
  flex: 1;
  min-width: 0;
  min-height: 36px;
  justify-content: center;
  gap: 6px;
  border-radius: 10px;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.chat-widget__tab--active {
  background: rgba(0, 0, 255, 0.06);
  color: #0000ff;
}

.chat-widget__content {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
}

.chat-widget__content--send {
  display: flex;
  overflow: hidden;
  flex-direction: column;
  background: #f8fafc;
}

.chat-widget__send-scroll {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 12px;
  scrollbar-width: thin;
}

.chat-widget__send-scroll::-webkit-scrollbar,
.chat-widget__content::-webkit-scrollbar {
  width: 6px;
}

.chat-widget__send-scroll::-webkit-scrollbar-thumb,
.chat-widget__content::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: #cbd5e1;
}

.chat-widget__send-card {
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #ffffff;
  padding: 12px;
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.04);
}

.chat-widget__send-card + .chat-widget__send-card {
  margin-top: 12px;
}

.chat-widget__field + .chat-widget__field,
.chat-widget__field + .chat-widget__composer-tools,
.chat-widget__composer-tools + .chat-widget__send-btn,
.chat-widget__suggestions + .chat-widget__field,
.chat-widget__selected-target + .chat-widget__suggestions,
.chat-widget__field + .chat-widget__hint {
  margin-top: 14px;
}

.chat-widget__field-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.chat-widget__field-label--inline {
  margin-bottom: 0;
}

.chat-widget__recipient-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;
  margin-bottom: 8px;
}

.chat-widget__select-all {
  display: inline-flex;
  flex-shrink: 0;
  cursor: pointer;
  align-items: center;
  gap: 6px;
  color: #334155;
  font-size: 11px;
  font-weight: 650;
}

.chat-widget__select-all:has(input:disabled) {
  cursor: default;
  opacity: 0.45;
}

.chat-widget__recipient-box {
  min-height: 44px;
  margin-top: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  padding: 7px;
}

.chat-widget__recipient-box--empty {
  display: flex;
  align-items: center;
  border-style: dashed;
  background: #fafbfe;
  padding: 10px 12px;
}

.chat-widget__recipient-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chat-widget__recipient-chip {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(0, 0, 255, 0.08);
  border-radius: 999px;
  background: rgba(0, 0, 255, 0.04);
  padding: 3px 4px 3px 3px;
  color: #334155;
  font-size: 12px;
  font-weight: 700;
}

.chat-widget__recipient-chip span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-widget__recipient-remove {
  display: inline-flex;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.08);
  color: #64748b;
  transition: all 0.15s ease;
}

.chat-widget__recipient-remove:hover {
  background: #fee2e2;
  color: #dc2626;
}

.chat-widget__recipient-empty {
  color: #94a3b8;
  font-size: 12px;
}

.chat-widget__select {
  width: 100%;
  height: 38px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fafbfe;
  padding: 0 12px;
  color: #0f172a;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.chat-widget__select:focus {
  border-color: rgba(0, 0, 255, 0.25);
  background: #ffffff;
}

.chat-widget__selected-target {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 10px;
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 255, 0.08);
  background: rgba(0, 0, 255, 0.04);
  padding: 9px 10px;
}

.chat-widget__selected-target-main {
  flex: 1;
  min-width: 0;
}

.chat-widget__selected-target-name,
.chat-widget__suggestion-name {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: #0f172a;
}

.chat-widget__selected-target-meta,
.chat-widget__suggestion-meta {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: #64748b;
}

.chat-widget__suggestions {
  display: flex;
  max-height: 218px;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
  overflow-y: auto;
  padding-right: 2px;
}

.chat-widget__suggestion {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 12px;
  padding: 9px 10px;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.chat-widget__suggestion:hover {
  background: #f8fafc;
  border-color: rgba(0, 0, 255, 0.12);
}

.chat-widget__suggestion--selected {
  border-color: rgba(0, 0, 255, 0.18);
  background: rgba(0, 0, 255, 0.05);
}

.chat-widget__composer-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.chat-widget__attach-btn {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  gap: 7px;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: #f8fafc;
  padding: 7px 12px;
  color: #334155;
  font-size: 12px;
  font-weight: 700;
  transition: all 0.15s ease;
}

.chat-widget__attach-btn:hover {
  border-color: rgba(0, 0, 255, 0.14);
  background: rgba(0, 0, 255, 0.04);
  color: #0000ff;
}

.chat-widget__file-name {
  min-width: 0;
  flex: 1;
  font-size: 11px;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-widget__clear-btn {
  display: inline-flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: none;
  background: #e2e8f0;
  color: #475569;
  cursor: pointer;
}

.chat-widget__send-btn {
  width: 100%;
  justify-content: center;
  border-radius: 12px;
  padding-block: 11px;
}

.chat-widget__send-actions {
  flex-shrink: 0;
  border-top: 1px solid #e2e8f0;
  background: #ffffff;
  padding: 10px 12px 12px;
}

:deep(.chat-widget__textarea) {
  max-height: 132px;
  overflow-y: auto !important;
  resize: none;
}

.chat-widget__hint,
.chat-widget__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 22px 16px;
  font-size: 12px;
  text-align: center;
  color: #94a3b8;
}

.chat-widget__empty--mini {
  min-height: 180px;
}

.chat-widget__empty-icon {
  width: 28px;
  height: 28px;
}

.chat-widget__list {
  display: flex;
  flex-direction: column;
  padding: 6px 0;
}

.chat-widget__list--loading {
  gap: 14px;
  padding: 14px 16px;
}

.chat-widget__skeleton-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-widget__contact {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  border: none;
  background: transparent;
  padding: 10px 16px;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;
}

.chat-widget__contact:hover {
  background: #f8fafc;
}

.chat-widget__contact-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.chat-widget__contact-status {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 11px;
  height: 11px;
  border-radius: 999px;
  border: 2px solid #ffffff;
  background: #94a3b8;
}

.chat-widget__contact-status--online {
  background: #22c55e;
}

.chat-widget__contact-info {
  min-width: 0;
  flex: 1;
}

.chat-widget__contact-top,
.chat-widget__contact-middle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.chat-widget__contact-name {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-widget__contact-time {
  flex-shrink: 0;
  font-size: 11px;
  color: #94a3b8;
}

.chat-widget__contact-presence {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #64748b;
}

.chat-widget__contact-presence--online {
  color: #16a34a;
  font-weight: 700;
}

.chat-widget__contact-badge {
  display: inline-flex;
  min-width: 18px;
  height: 18px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #0000ff;
  padding: 0 5px;
  font-size: 10px;
  font-weight: 700;
  color: #ffffff;
}

.chat-widget__contact-preview {
  margin: 3px 0 0;
  font-size: 11.5px;
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-widget__group-icon {
  display: flex;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(0, 0, 255, 0.06);
  color: #0000ff;
}

.chat-widget__group-icon--large {
  width: 40px;
  height: 40px;
  border-radius: 12px;
}

.chat-widget__group-icon--selected {
  width: 32px;
  height: 32px;
  border-radius: 12px;
}

.chat-widget__group-icon--chip {
  width: 24px;
  height: 24px;
  border-radius: 999px;
}

.chat-widget__footer {
  position: sticky;
  top: 0;
  z-index: 6;
  flex-shrink: 0;
  border-bottom: 1px solid #f1f5f9;
  background: #ffffff;
  padding: 10px 12px;
}

.chat-widget__footer-input {
  width: 100%;
}

:deep(.chat-widget__footer-input-control) {
  width: 100%;
  height: 42px;
  border: 1px solid #dbe3f2 !important;
  border-radius: 14px !important;
  background: #f8fafc !important;
  color: #0f172a;
  font-size: 14px;
  box-shadow: none !important;
}

:deep(.chat-widget__footer-input-control:focus) {
  border-color: rgba(0, 0, 255, 0.26) !important;
  background: #ffffff !important;
  box-shadow: 0 0 0 3px rgba(0, 0, 255, 0.06) !important;
}

:deep(.chat-widget__footer-input-control::placeholder) {
  color: #94a3b8;
}

.chat-widget__mini {
  position: absolute;
  right: calc(100% + 12px);
  bottom: 0;
  z-index: 60;
  display: flex;
  width: min(350px, calc(100vw - 32px));
  max-height: min(560px, calc(100dvh - 112px));
  min-height: 0;
  flex-direction: column;
  overflow: visible;
  border-radius: 18px;
  border: 1px solid rgba(0, 0, 255, 0.08);
  background: #ffffff;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.16);
}

.chat-widget__mini--2 {
  right: calc(100% + 374px);
  z-index: 59;
}

.chat-widget__mini-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid #f1f5f9;
  border-radius: 18px 18px 0 0;
  background: #fafbfe;
}

.chat-widget__mini-identity {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  align-items: center;
  gap: 10px;
}

.chat-widget__mini-avatar-link {
  display: inline-flex;
  flex-shrink: 0;
  border: none;
  border-radius: 999px;
  background: transparent;
  padding: 0;
  cursor: pointer;
}

.chat-widget__mini-name-btn {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  border: none;
  background: transparent;
  padding: 0;
  text-align: left;
  cursor: pointer;
}

.chat-widget__mini-title {
  display: block;
  max-width: 100%;
  overflow: hidden;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-widget__mini-status {
  display: block;
  max-width: 100%;
  margin-top: 2px;
  overflow: hidden;
  font-size: 11px;
  color: #64748b;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-widget__mini-menu {
  position: absolute;
  top: 26px;
  right: calc(100% - 50px);
  z-index: 70;
  width: min(390px, calc(100vw - 24px));
  max-height: min(520px, calc(100dvh - 88px));
  overflow: visible;
  border-radius: 14px 0 14px 14px;
  border: 1px solid rgba(226, 232, 240, 0.85);
  background: #ffffff;
  padding: 9px 16px 11px;
  box-shadow: 0 18px 46px rgba(15, 23, 42, 0.22), 0 2px 10px rgba(15, 23, 42, 0.1);
}

.chat-widget__mini-menu::before {
  position: absolute;
  top: 0;
  right: -17px;
  display: block;
  width: 0;
  height: 0;
  border-top: 18px solid #ffffff;
  border-right: 18px solid transparent;
  content: "";
  filter: drop-shadow(5px 1px 4px rgba(15, 23, 42, 0.08));
  pointer-events: none;
}

.chat-widget__mini-menu-section {
  position: relative;
  display: grid;
  gap: 2px;
  padding: 5px 0;
}

.chat-widget__mini-menu-section + .chat-widget__mini-menu-section {
  border-top: 1px solid #d9dde3;
  margin-top: 6px;
  padding-top: 10px;
}

.chat-widget__mini-menu-item {
  display: flex;
  width: 100%;
  min-height: 40px;
  align-items: center;
  gap: 15px;
  border: none;
  border-radius: 8px;
  background: transparent;
  padding: 8px 10px;
  color: #1f2933;
  font-size: 14px;
  font-weight: 750;
  text-align: left;
  transition: background 0.15s ease, color 0.15s ease;
}

.chat-widget__mini-menu-item > .iconify {
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  color: #20242a;
}

.chat-widget__mini-menu-item:hover {
  background: #f2f3f5;
  color: #0000ff;
}

.chat-widget__mini-menu-item--muted {
  cursor: default;
  background: #f2f3f5;
  color: #1f2933;
}

.chat-widget__mini-menu-item--muted:hover {
  background: #f2f3f5;
  color: #1f2933;
}

.chat-widget__mini-menu-item--danger {
  color: #dc2626;
}

.chat-widget__mini-menu-item--danger:hover {
  background: #fee2e2;
  color: #b91c1c;
}

.chat-widget__mini-messages {
  min-height: 0;
  flex: 1;
  max-height: none;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior-y: contain;
  padding: 14px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.55) 0%, rgba(255, 255, 255, 1) 100%);
}

.chat-widget__mini-thread {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chat-widget__mini-message {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: flex-start;
  padding-inline-end: 38px;
}

.chat-widget__mini-message--mine {
  align-items: flex-end;
  padding-inline: 38px 0;
}

.chat-widget__mini-chat-bubble--deleted :deep(.chat-bubble) {
  background: #f1f5f9 !important;
  color: #64748b !important;
  font-style: italic;
}

.chat-widget__mini-chat-bubble--deleted :deep(.chat-bubble__text) {
  color: inherit !important;
}

.chat-widget__mini-chat-bubble :deep(.chat-bubble__wrapper) {
  max-width: 100%;
}

.chat-widget__mini-chat-bubble :deep(.chat-bubble) {
  padding: 10px 12px;
  font-size: 12px;
  line-height: 1.5;
}

.chat-widget__mini-chat-bubble :deep(.chat-bubble__call-card) {
  width: min(190px, 72vw);
  border-radius: 14px;
  padding: 10px;
}

.chat-widget__mini-chat-bubble :deep(.chat-bubble__call-head) {
  grid-template-columns: 36px 1fr;
  gap: 8px;
}

.chat-widget__mini-chat-bubble :deep(.chat-bubble__call-icon-btn) {
  width: 34px !important;
  height: 34px !important;
  min-width: 34px !important;
  min-height: 34px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 !important;
  line-height: 1 !important;
}

.chat-widget__mini-chat-bubble :deep(.chat-bubble__call-icon-btn .iconify) {
  width: 18px !important;
  height: 18px !important;
  flex-shrink: 0;
}

.chat-widget__mini-chat-bubble :deep(.chat-bubble__call-title) {
  font-size: 13px;
  line-height: 1.12;
}

.chat-widget__mini-chat-bubble :deep(.chat-bubble__call-subtitle) {
  font-size: 12px;
  padding: 3px 0 0;
}

.chat-widget__mini-chat-bubble :deep(.chat-bubble__call-again) {
  margin-top: 8px;
  min-height: 34px;
  border-radius: 7px !important;
  font-size: 13px !important;
}

.chat-widget__mini-row {
  display: flex;
}

.chat-widget__mini-row + .chat-widget__mini-row {
  margin-top: 10px;
}

.chat-widget__mini-row--sent {
  justify-content: flex-end;
}

.chat-widget__mini-row--received {
  justify-content: flex-start;
}

.chat-widget__mini-bubble {
  max-width: 86%;
  border-radius: 16px;
  padding: 10px 12px;
  font-size: 12px;
  line-height: 1.5;
}

.chat-widget__mini-author {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: #64748b;
}

.chat-widget__mini-bubble--sent {
  background: #0000ff;
  color: #ffffff;
  border-bottom-right-radius: 5px;
}

.chat-widget__mini-bubble--received {
  background: #f1f5f9;
  color: #1e293b;
  border-bottom-left-radius: 5px;
}

.chat-widget__mini-media {
  display: block;
  width: 100%;
  max-height: 180px;
  margin-top: 8px;
  border-radius: 12px;
  object-fit: cover;
}

.chat-widget__mini-audio {
  width: 100%;
  min-width: 210px;
  margin-top: 8px;
}

.chat-widget__mini-file {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 11px;
  text-decoration: none;
  color: inherit;
}

.chat-widget__mini-time {
  margin: 6px 0 0;
  font-size: 10px;
  opacity: 0.7;
}

.chat-widget__mini-input-wrap {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 6px;
  border-radius:0 0 18px 18px;
  border-top: 1px solid #f1f5f9;
  background: #ffffff;
  padding: 10px 12px 12px;
}

.chat-widget__mini-draft {
  display: grid;
  flex-shrink: 0;
  gap: 6px;
  border-top: 1px solid #f1f5f9;
  background: #ffffff;
  padding: 8px 12px 0;
}

.chat-widget__mini-reply-preview,
.chat-widget__mini-file-preview {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
  border-radius: 14px;
  background: #f8fafc;
  padding: 9px 10px;
  color: #475569;
  font-size: 12px;
  font-weight: 700;
}

.chat-widget__mini-reply-preview {
  min-height: 54px;
  align-items: center;
  justify-content: space-between;
  border-radius: 0;
  background: #ffffff;
  padding: 8px 4px;
  text-align: left;
}

.chat-widget__mini-reply-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}

.chat-widget__mini-reply-copy strong {
  overflow: hidden;
  color: #111827;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-widget__mini-reply-image {
  width: 46px;
  height: 46px;
  margin-top: 2px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  object-fit: cover;
}

.chat-widget__mini-reply-copy span,
.chat-widget__mini-file-preview span {
  min-width: 0;
  overflow: hidden;
  color: #6b7280;
  font-size: 12px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-widget__mini-preview-clear {
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: #64748b;
}

.chat-widget__mini-preview-clear:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.chat-widget__mini-tool-btn,
.chat-widget__mini-like-btn {
  display: inline-flex;
  width: 34px !important;
  height: 34px !important;
  min-width: 34px !important;
  align-items: center;
  justify-content: center;
  border-radius: 999px !important;
  background: #f1f5f9;
  color: #64748b;
  transition: all 0.15s ease;
}

.chat-widget__mini-tool-btn:hover,
.chat-widget__mini-like-btn:hover {
  background: rgba(0, 0, 255, 0.06);
  color: #0000ff;
}

.chat-widget__mini-like-btn img {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.chat-widget__mini-like-btn:disabled {
  cursor: default;
  opacity: 0.55;
}

.chat-widget__mini-tool-btn--active {
  background: #fee2e2;
  color: #dc2626;
}

.chat-widget__mini-input {
  min-width: 0;
  flex: 1;
}

.chat-widget__mini-input-shell {
  position: relative;
  min-width: 0;
  flex: 1;
}

:deep(.chat-widget__mini-input-control) {
  width: 100%;
  height: 42px;
  border: 1px solid #dbe3f2 !important;
  border-radius: 999px !important;
  background: #f8fafc !important;
  padding: 0 46px 0 16px !important;
  color: #0f172a;
  font-size: 14px;
  font-weight: 500;
  box-shadow: none !important;
  outline: none;
}

:deep(.chat-widget__mini-input-control:focus) {
  border-color: rgba(0, 0, 255, 0.28) !important;
  background: #ffffff !important;
  box-shadow: 0 0 0 3px rgba(0, 0, 255, 0.06) !important;
}

:deep(.chat-widget__mini-input-control::placeholder) {
  color: #94a3b8;
  font-weight: 600;
}

.chat-widget__mini-send-btn {
  position: absolute;
  top: 50%;
  right: 4px;
  display: inline-flex;
  width: 34px !important;
  height: 34px !important;
  min-width: 34px !important;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 999px !important;
  background: transparent !important;
  color: var(--ui-primary) !important;
  cursor: pointer;
  box-shadow: none !important;
  transform: translateY(-50%);
}

.chat-widget__mini-send-icon {
  width: 19px;
  height: 19px;
}

.chat-widget__mini-send-btn:disabled {
  color: color-mix(in srgb, var(--ui-primary) 42%, transparent) !important;
  cursor: default;
  opacity: 1;
}

.chat-widget__mini-launcher {
  position: absolute;
  right: 14px;
  bottom: 72px;
  z-index: 60;
  display: inline-flex;
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #ffffff;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.18);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.chat-widget__mini-launcher:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.22);
}

.chat-widget__mini-launcher-group {
  display: flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(0, 0, 255, 0.08);
  color: #0000ff;
}

/* ── Avatar contact button ── */
.chat-widget__contact-wrapper {
  position: relative;
}

.chat-widget__contact-avatar-btn {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  border-radius: 999px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.chat-widget__contact-avatar-btn:hover {
  transform: scale(1.07);
  box-shadow: 0 0 0 2.5px rgba(0, 0, 255, 0.22);
}

/* ── Avatar context menu ── */
.chat-widget__avatar-menu {
  width: min(320px, calc(100vw - 16px));
  max-height: min(470px, calc(100dvh - 16px));
  overflow-x: hidden;
  overflow-y: auto;
  border-radius: 12px;
  border: 1px solid rgba(226, 232, 240, 0.85);
  background: #ffffff;
  padding: 8px;
  box-shadow: 0 18px 46px rgba(15, 23, 42, 0.22), 0 2px 8px rgba(15, 23, 42, 0.12);
  transform-origin: top left;
}

.chat-widget__avatar-menu-section {
  display: grid;
  gap: 2px;
  padding: 4px 0;
}

.chat-widget__avatar-menu-section + .chat-widget__avatar-menu-section {
  border-top: 1px solid #e5e7eb;
  margin-top: 4px;
  padding-top: 7px;
}

.chat-widget__avatar-menu-item {
  display: flex;
  width: 100%;
  min-height: 42px;
  align-items: center;
  gap: 13px;
  border: none;
  border-radius: 8px;
  background: transparent;
  padding: 8px 10px;
  color: #1f2933;
  font-size: 14px;
  font-weight: 750;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}

.chat-widget__avatar-menu-item > .iconify {
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  color: #20242a;
}

.chat-widget__avatar-menu-item:hover {
  background: #f2f3f5;
  color: #0000ff;
}

.chat-widget__avatar-menu-item--muted {
  cursor: default;
  background: #f2f3f5;
  color: #1f2933;
}

.chat-widget__avatar-menu-item--muted:hover {
  background: #f2f3f5;
  color: #1f2933;
}

.chat-widget__avatar-menu-item--danger {
  color: #dc2626;
}

.chat-widget__avatar-menu-item--danger:hover {
  background: #fee2e2;
  color: #b91c1c;
}

.chat-widget__avatar-menu-icon {
  display: inline-flex;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #f1f5f9;
  color: inherit;
  transition: background 0.12s ease;
}
  /* height: 42px;
  border: 1px solid #dbe3f2 !important;
  border-radius: 999px !important;
  background: #f8fafc !important;
  padding: 0 16px !important;
  color: #0f172a;
  font-size: 14px;
  font-weight: 500;
  box-shadow: none !important;
  outline: none;
} */

:deep(.chat-widget__mini-input-control:focus) {
  border-color: rgba(0, 0, 255, 0.28) !important;
  background: #ffffff !important;
  box-shadow: 0 0 0 3px rgba(0, 0, 255, 0.06) !important;
}

:deep(.chat-widget__mini-input-control::placeholder) {
  color: #94a3b8;
  font-weight: 600;
}

.chat-widget__mini-send-btn {
  position: absolute !important;
  top: 50% !important;
  right: 4px !important;
  display: inline-flex;
  width: 34px !important;
  height: 34px !important;
  min-width: 34px !important;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 999px !important;
  background: transparent !important;
  color: var(--ui-primary) !important;
  cursor: pointer;
  box-shadow: none !important;
  transform: translateY(-50%);
}

.chat-widget__mini-send-icon {
  width: 19px;
  height: 19px;
}

.chat-widget__mini-send-btn:disabled {
  color: color-mix(in srgb, var(--ui-primary) 42%, transparent) !important;
  cursor: default;
  opacity: 1;
}

.chat-widget__mini-launcher {
  position: absolute;
  right: 14px;
  bottom: 72px;
  z-index: 60;
  display: inline-flex;
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #ffffff;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.18);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.chat-widget__mini-launcher--2 {
  bottom: 128px;
}

.chat-widget__mini-launcher:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.22);
}

.chat-widget__mini-launcher-group {
  display: flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(0, 0, 255, 0.08);
  color: #0000ff;
}

/* ── Avatar contact button ── */
.chat-widget__contact-wrapper {
  position: relative;
}

.chat-widget__contact-avatar-btn {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  border-radius: 999px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.chat-widget__contact-avatar-btn:hover {
  transform: scale(1.07);
  box-shadow: 0 0 0 2.5px rgba(0, 0, 255, 0.22);
}

/* ── Avatar context menu ── */
.chat-widget__avatar-menu {
  min-width: 224px;
  border-radius: 16px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  background: #ffffff;
  padding: 6px 0;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.18), 0 4px 14px rgba(15, 23, 42, 0.08);
  transform-origin: top left;
}

.chat-widget__avatar-menu-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px 12px;
}

.chat-widget__avatar-menu-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 3px;
}

.chat-widget__avatar-menu-name {
  font-size: 13px;
  font-weight: 800;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-widget__avatar-menu-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #64748b;
  font-weight: 600;
}

.chat-widget__avatar-menu-status--online {
  color: #16a34a;
}

.chat-widget__avatar-menu-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: currentColor;
  flex-shrink: 0;
}

.chat-widget__avatar-menu-divider {
  height: 1px;
  background: #f1f5f9;
  margin: 4px 0;
}

.chat-widget__avatar-menu-item {
  display: flex;
  width: 100%;
  min-height: 42px;
  align-items: center;
  gap: 11px;
  border: none;
  background: transparent;
  padding: 8px 14px;
  color: #111827;
  font-size: 13.5px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}

.chat-widget__avatar-menu-item:hover {
  background: #f1f5f9;
  color: #0000ff;
}

.chat-widget__avatar-menu-item--danger {
  color: #dc2626;
}

.chat-widget__avatar-menu-item--danger:hover {
  background: #fee2e2;
  color: #b91c1c;
}

.chat-widget__message-avatar-menu {
  width: min(270px, calc(100vw - 24px));
  border: 1px solid rgba(226, 232, 240, 0.85);
  border-radius: 13px 13px 13px 0;
  background: #ffffff;
  padding: 8px;
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.2), 0 2px 8px rgba(15, 23, 42, 0.1);
  transform-origin: top left;
}

.chat-widget__message-avatar-menu::after {
  position: absolute;
  left: 0;
  bottom: -12px;
  width: 0;
  height: 0;
  border-top: 13px solid #ffffff;
  border-right: 18px solid transparent;
  content: "";
}

.chat-widget__message-avatar-menu-item {
  display: flex;
  width: 100%;
  min-height: 40px;
  align-items: center;
  gap: 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  padding: 8px 10px;
  color: #1f2933;
  font-size: 14px;
  font-weight: 750;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}

.chat-widget__message-avatar-menu-item > .iconify {
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  color: #111827;
}

.chat-widget__message-avatar-menu-item:hover {
  background: #f2f3f5;
}

.chat-widget__message-avatar-menu-item--danger:hover {
  color: #dc2626;
}

.chat-widget__image-preview-container {
  position: relative;
  display: inline-flex;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  overflow: visible;
  padding: 4px;
  background: #ffffff;
  margin-left: 8px;
}

.chat-widget__image-preview {
  max-width: 60px;
  max-height: 60px;
  object-fit: cover;
  border-radius: 6px;
}

.chat-widget__image-preview-clear {
  position: absolute;
  top: -8px;
  right: -8px;
  display: inline-flex;
  width: 18px;
  height: 18px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #ef4444;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.15s ease;
}

.chat-widget__image-preview-clear:hover {
  background: #fef2f2;
  color: #dc2626;
}

.chat-widget__mini-file-preview-container {
  display: flex;
  width: 100%;
}

.chat-widget__mini-image-preview-wrapper {
  position: relative;
  display: inline-flex;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  overflow: visible;
  padding: 4px;
  background: #ffffff;
}

.chat-widget__mini-image-preview {
  max-width: 50px;
  max-height: 50px;
  object-fit: cover;
  border-radius: 6px;
}

.chat-widget__mini-image-preview-clear {
  position: absolute;
  top: -8px;
  right: -8px;
  display: inline-flex;
  width: 18px;
  height: 18px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #ef4444;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.15s ease;
}

.chat-widget__mini-image-preview-clear:hover {
  background: #fef2f2;
  color: #dc2626;
}

</style>
