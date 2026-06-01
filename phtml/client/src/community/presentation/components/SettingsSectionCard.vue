<!-- Description: Provides a light-theme settings section shell shared by community settings screens. -->
<template>
  <section class="settings-section-card" role="region">
    <div class="settings-section-card__header">
      <div class="settings-section-card__title-row">
        <div class="settings-section-card__icon">
          <Icon :name="icon" class="h-5 w-5" />
        </div>

        <div class="min-w-0">
          <p class="settings-section-card__eyebrow">
            {{ eyebrow ? $t(eyebrow) : '' }}
          </p>
          <h2 class="settings-section-card__title">
            {{ $t(title) }}
          </h2>
          <p
            v-if="description"
            class="settings-section-card__desc"
          >
            {{ $t(description) }}
          </p>
        </div>
      </div>

      <div v-if="$slots.trailing" class="settings-section-card__trailing">
        <slot name="trailing" />
      </div>
    </div>

    <div class="settings-section-card__body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  eyebrow?: string
  title: string
  description?: string
  icon?: string
}>(), {
  eyebrow: "community.settings.defaultEyebrow",
  description: "",
  icon: "i-ph-gear-six-bold",
})
</script>

<style scoped>
.settings-section-card {
  border: 1px solid #e2e8f0;
  border-radius: 32px;
  background: #ffffff;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.settings-section-card__header {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-section-card__title-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.settings-section-card__icon {
  display: flex;
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background: #f1f5f9;
  color: #64748b;
}

.settings-section-card__eyebrow {
  margin: 0;
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.settings-section-card__title {
  margin: 4px 0 0;
  color: #0f172a;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.2;
}

.settings-section-card__desc {
  margin: 4px 0 0;
  color: #94a3b8;
  font-size: 13.5px;
  line-height: 1.5;
}

.settings-section-card__trailing {
  flex-shrink: 0;
}

.settings-section-card__body {
  margin-top: 20px;
}

@media (min-width: 640px) {
  .settings-section-card {
    padding: 24px;
  }

  .settings-section-card__header {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
  }
}
</style>
