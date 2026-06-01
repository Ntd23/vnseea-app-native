<template>
  <aside class="auth-hero" aria-labelledby="auth-hero-title">
    <!-- Background effects -->
    <div class="auth-hero__bg" aria-hidden="true">
      <span class="auth-hero__orb auth-hero__orb--a" />
      <span class="auth-hero__orb auth-hero__orb--b" />
      <span class="auth-hero__orb auth-hero__orb--c" />
      <span class="auth-hero__grid" />
    </div>

    <!-- Brand -->
    <header class="auth-hero__brand">
      <div class="auth-hero__brand-icon">V</div>
      <div>
        <p class="auth-hero__brand-tag">{{ $t('navigation.headerLogo.tagline') }}</p>
        <p class="auth-hero__brand-name">VNSEEA</p>
      </div>
    </header>

    <!-- Copy -->
    <div class="auth-hero__copy">
      <h2 id="auth-hero-title" class="auth-hero__title">
        {{ resolvedTitle }}
      </h2>
      <p class="auth-hero__subtitle">{{ resolvedSubtitle }}</p>
    </div>

    <!-- Feature cards -->
    <div class="auth-hero__cards" aria-hidden="true">
      <div class="auth-hero__card auth-hero__card--main">
        <span class="auth-hero__card-pill">{{ $t('navigation.headerLogo.tagline') }}</span>
        <p class="auth-hero__card-title">{{ resolvedTitle }}</p>
        <p class="auth-hero__card-body">{{ resolvedSubtitle }}</p>
      </div>

      <div class="auth-hero__card-row">
        <div class="auth-hero__card auth-hero__card--mini">
          <span class="auth-hero__mini-icon">
            <Icon name="i-ph-users-three-fill" class="h-4 w-4" />
          </span>
          <div>
            <p class="auth-hero__mini-label">{{ $t('auth.heroPanel.communityLabel') }}</p>
            <p class="auth-hero__mini-value">{{ $t('auth.heroPanel.communityValue') }}</p>
          </div>
        </div>

        <div class="auth-hero__card auth-hero__card--mini">
          <span class="auth-hero__mini-icon">
            <Icon name="i-ph-lightning-fill" class="h-4 w-4" />
          </span>
          <div>
            <p class="auth-hero__mini-label">{{ $t('auth.heroPanel.activityLabel') }}</p>
            <p class="auth-hero__mini-value">{{ $t('auth.heroPanel.activityValue') }}</p>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  title: string
  subtitle: string
  imageSrc?: string
  imageAlt?: string
}>(), {
  imageSrc: '',
  imageAlt: '',
})

const { t } = useI18n()

const resolvedTitle = computed(() => props.title.trim() || t('auth.heroPanel.defaultTitle'))
const resolvedSubtitle = computed(() => props.subtitle.trim() || t('auth.heroPanel.defaultSubtitle'))
</script>

<style scoped>
/* ─── Hero wrapper ─────────────────────────────────────── */
.auth-hero {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 2rem;
  padding: 2.5rem;
  width: 100%;
  min-height: 100%;
  overflow: hidden;
  color: #ffffff;
}

/* ─── Background ───────────────────────────────────────── */
.auth-hero__bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.auth-hero__orb {
  position: absolute;
  border-radius: 999px;
  filter: blur(56px);
  opacity: 0.55;
}

.auth-hero__orb--a {
  top: -4%;
  left: -6%;
  width: 14rem;
  height: 14rem;
  background: rgba(255, 255, 255, 0.18);
}

.auth-hero__orb--b {
  right: -5%;
  top: 30%;
  width: 18rem;
  height: 18rem;
  background: rgba(80, 220, 255, 0.15);
}

.auth-hero__orb--c {
  left: 20%;
  bottom: -5%;
  width: 16rem;
  height: 16rem;
  background: rgba(255, 255, 255, 0.10);
}

.auth-hero__grid {
  position: absolute;
  inset: 0;
  opacity: 0.12;
  background-image:
    linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px);
  background-size: 36px 36px;
}

/* ─── Brand header ─────────────────────────────────────── */
.auth-hero__brand,
.auth-hero__copy,
.auth-hero__cards {
  position: relative;
  z-index: 1;
}

.auth-hero__brand {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.auth-hero__brand-icon {
  display: flex;
  width: 2.75rem;
  height: 2.75rem;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.12);
  font-size: 1.2rem;
  font-weight: 900;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.14);
  backdrop-filter: blur(16px);
}

.auth-hero__brand-tag {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.7);
}

.auth-hero__brand-name {
  font-size: 1.5rem;
  font-weight: 900;
  letter-spacing: -0.04em;
  margin-top: 0.05rem;
}

/* ─── Copy ─────────────────────────────────────────────── */
.auth-hero__copy {
  max-width: 32rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.auth-hero__title {
  font-size: clamp(2.2rem, 4vw, 4.2rem);
  font-weight: 900;
  line-height: 0.93;
  letter-spacing: -0.07em;
}

.auth-hero__subtitle {
  margin-top: 1.25rem;
  max-width: 28rem;
  font-size: 1rem;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.82);
}

/* ─── Feature cards ────────────────────────────────────── */
.auth-hero__cards {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.auth-hero__card-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem;
}

.auth-hero__card {
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.09);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.12);
  backdrop-filter: blur(20px);
}

.auth-hero__card--main {
  border-radius: 1.75rem;
  padding: 1.4rem 1.5rem;
}

.auth-hero__card-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  background: rgba(255, 255, 255, 0.08);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.68);
}

.auth-hero__card-title {
  margin-top: 0.9rem;
  font-size: 1.35rem;
  font-weight: 900;
  line-height: 1.08;
  letter-spacing: -0.04em;
}

.auth-hero__card-body {
  margin-top: 0.65rem;
  font-size: 0.9rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.78);
}

.auth-hero__card--mini {
  display: flex;
  gap: 0.8rem;
  align-items: flex-start;
  border-radius: 1.25rem;
  padding: 0.9rem 1rem;
}

.auth-hero__mini-icon {
  display: inline-flex;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.14);
}

.auth-hero__mini-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.68);
}

.auth-hero__mini-value {
  margin-top: 0.2rem;
  font-size: 0.92rem;
  font-weight: 700;
  line-height: 1.4;
}
</style>
