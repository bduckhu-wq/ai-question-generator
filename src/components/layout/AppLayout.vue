<template>
  <div class="app-layout">
    <!-- 侧边栏 -->
    <SideBar :collapsed="sidebarCollapsed" />

    <!-- 主内容区 -->
    <div class="main-area">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SideBar from './SideBar.vue'

const props = withDefaults(defineProps<{
  showPreview?: boolean
}>(), {
  showPreview: false
})

const sidebarCollapsed = computed(() => props.showPreview)
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.main-area {
  flex: 1;
  background-color: var(--bg-secondary);
  min-width: 0;
}
</style>
