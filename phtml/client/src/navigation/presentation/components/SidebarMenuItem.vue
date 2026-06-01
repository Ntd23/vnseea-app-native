<template>
  <NuxtLink
    :to="to"
    class="sidebar-item"
    :class="{ 'sidebar-item--active': isActive }"
  >
    <span class="sidebar-item__icon" :class="{ 'sidebar-item__icon--active': isActive }">
      <Icon :name="isActive ? icon : icon.replace('-fill', '-duotone')" class="h-4.5 w-4.5" />
    </span>
    
    <span class="sidebar-item__label">{{ label }}</span>
    
    <span
      v-if="badge"
      class="sidebar-item__badge"
      :class="{ 'sidebar-item__badge--active': isActive }"
    >
      {{ badge }}
    </span>
  </NuxtLink>
</template>

<script setup lang="ts">
const route = useRoute()

const props = defineProps<{
  label: string
  icon: string
  to: string
  badge?: number
  active?: boolean
}>()

const isActive = computed(() => {
  if (props.active !== undefined) return props.active
  
  if (props.to === "/") {
    return route.path === "/" || route.path === "/home"
  }

  return route.path === props.to
})
</script>

<style scoped>
.sidebar-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.15s ease;
  position: relative;
}

.sidebar-item:hover {
  background: rgba(0, 0, 255, 0.03);
}

.sidebar-item--active {
  background: rgba(0, 0, 255, 0.05);
}

/* Active left accent bar */
.sidebar-item--active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: #0000ff;
}

.sidebar-item__icon {
  display: flex;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #f1f5f9;
  color: #475569;
  transition: all 0.15s ease;
}

.sidebar-item:hover .sidebar-item__icon {
  background: rgba(0, 0, 255, 0.06);
  color: #0000ff;
}

.sidebar-item__icon--active {
  background: #0000ff !important;
  color: #ffffff !important;
  box-shadow: 0 4px 12px rgba(0, 0, 255, 0.2);
}

.sidebar-item__label {
  font-size: 16px;
  font-weight: 600;
  color: #334155;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-item--active .sidebar-item__label {
  color: #0000ff;
  font-weight: 700;
}

.sidebar-item:hover .sidebar-item__label {
  color: #0000ff;
}

.sidebar-item__badge {
  margin-left: auto;
  display: inline-flex;
  min-width: 20px;
  height: 20px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  padding: 0 6px;
  font-size: 10px;
  font-weight: 700;
  background: rgba(0, 0, 255, 0.08);
  color: #0000ff;
}

.sidebar-item__badge--active {
  background: #0000ff;
  color: #ffffff;
}
</style>
