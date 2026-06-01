<template>
  <section class="settings-hero" aria-labelledby="settings-hero-title">
    <div class="settings-hero__orb settings-hero__orb--right" aria-hidden="true" />
    <div class="settings-hero__orb settings-hero__orb--left" aria-hidden="true" />

    <div class="settings-hero__inner">
      <div class="settings-hero__copy">
        <p class="settings-hero__eyebrow">{{ $t("settings.hero.auditLabel") }}</p>
        <h1 id="settings-hero-title" class="settings-hero__title">
          {{ $t("settings.hero.title") }}
        </h1>
        <p class="settings-hero__description">
          {{ $t("settings.hero.description") }}
        </p>
      </div>

      <div class="settings-hero__badge">
        <Icon name="i-ph-shield-check-fill" class="h-3.5 w-3.5 shrink-0" />
        <span>{{ $t("settings.hero.stats.api.value") }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  stats?: ReadonlyArray<{ label: string; value: string | number; description: string }>
}>()
</script>

<style scoped>
.settings-hero {
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  background: linear-gradient(135deg, #f8faff 0%, #eef3ff 60%, #f0f4ff 100%);
  border: 1px solid rgba(0, 0, 255, 0.07);
  padding: 28px 32px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.settings-hero__orb {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(50px);
}
.settings-hero__orb--right {
  top: -48px;
  right: -48px;
  width: 200px;
  height: 200px;
  background: rgba(0, 0, 255, 0.06);
}
.settings-hero__orb--left {
  bottom: -24px;
  left: 25%;
  width: 140px;
  height: 140px;
  background: rgba(0, 0, 255, 0.04);
}

.settings-hero__inner {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}

.settings-hero__copy {
  min-width: 0;
}

.settings-hero__eyebrow {
  font-size: 10px;
  font-weight: 700;
  color: #0000ff;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 6px;
}

.settings-hero__title {
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.settings-hero__description {
  margin-top: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  line-height: 1.55;
  max-width: 520px;
}

.settings-hero__badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 999px;
  background: rgba(0, 0, 255, 0.07);
  color: #0000ff;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}
</style>
