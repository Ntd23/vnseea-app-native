<template>
  <CommunitySettingsSectionCard
    :eyebrow="$t('community.pageSettings.sidebar.analytics.eyebrow')"
    :title="$t('community.pageSettings.sidebar.analytics.title')"
    :description="$t('community.pageSettings.sidebar.analytics.desc')"
    icon="i-ph-chart-line-up-bold"
  >
    <div class="analytics-grid mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="stat in stats" :key="stat.label" class="stat-card">
        <div class="flex items-center justify-between mb-2">
          <div class="stat-icon-wrap" :class="stat.color">
            <Icon :name="stat.icon" class="h-5 w-5" />
          </div>
          <span class="stat-trend" :class="stat.trend > 0 ? 'trend-up' : 'trend-down'">
            <Icon :name="stat.trend > 0 ? 'i-ph-trend-up-bold' : 'i-ph-trend-down-bold'" class="h-3 w-3 mr-1" />
            {{ Math.abs(stat.trend) }}%
          </span>
        </div>
        <div class="stat-value">{{ stat.value }}</div>
        <div class="stat-label">{{ stat.label }}</div>
      </div>
    </div>

    <!-- Mock Chart Area -->
    <div class="mt-6 rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
      <div class="flex items-center justify-between mb-6">
        <h4 class="text-sm font-bold text-slate-800">Tương tác 7 ngày qua</h4>
        <div class="flex gap-2">
          <div class="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
            <span class="h-2 w-2 rounded-full bg-blue-500"></span>
            Lượt xem
          </div>
          <div class="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
            <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
            Tương tác
          </div>
        </div>
      </div>
      
      <div class="h-40 flex items-end gap-2 px-2">
        <div v-for="(bar, i) in mockChartData" :key="i" class="flex-1 flex flex-col gap-1 items-center group">
          <div class="w-full flex gap-1 items-end h-full">
            <div 
              class="flex-1 bg-blue-500/20 group-hover:bg-blue-500 transition-all duration-300 rounded-t-sm"
              :style="{ height: bar.v1 + '%' }"
            ></div>
            <div 
              class="flex-1 bg-emerald-500/20 group-hover:bg-emerald-500 transition-all duration-300 rounded-t-sm"
              :style="{ height: bar.v2 + '%' }"
            ></div>
          </div>
          <span class="text-[10px] font-bold text-slate-400">{{ bar.label }}</span>
        </div>
      </div>
    </div>
  </CommunitySettingsSectionCard>
</template>

<script setup lang="ts">
import CommunitySettingsSectionCard from "./SettingsSectionCard.vue"

const stats = [
  { label: "Tổng lượt xem", value: "12,480", trend: 12, icon: "i-ph-eye-bold", color: "bg-blue-50 text-blue-600" },
  { label: "Người theo dõi mới", value: "842", trend: 5, icon: "i-ph-users-bold", color: "bg-emerald-50 text-emerald-600" },
  { label: "Tỷ lệ tương tác", value: "4.2%", trend: -2, icon: "i-ph-chat-circle-bold", color: "bg-purple-50 text-purple-600" },
]

const mockChartData = [
  { label: "T2", v1: 45, v2: 30 },
  { label: "T3", v1: 55, v2: 45 },
  { label: "T4", v1: 40, v2: 35 },
  { label: "T5", v1: 70, v2: 60 },
  { label: "T6", v1: 85, v2: 50 },
  { label: "T7", v1: 60, v2: 40 },
  { label: "CN", v1: 50, v2: 30 },
]
</script>

<style scoped>
.stat-card {
  padding: 20px;
  background: #ffffff;
  border: 1px solid #f1f5f9;
  border-radius: 16px;
  transition: all 0.2s ease;
}

.stat-card:hover {
  border-color: #e2e8f0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
}

.stat-icon-wrap {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
}

.stat-value {
  font-size: 20px;
  font-weight: 900;
  color: #0f172a;
  margin-top: 8px;
}

.stat-label {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  margin-top: 2px;
}

.stat-trend {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 800;
}

.trend-up {
  background: #f0fdf4;
  color: #16a34a;
}

.trend-down {
  background: #fef2f2;
  color: #dc2626;
}
</style>
