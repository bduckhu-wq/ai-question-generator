<template>
  <div class="app-layout">
    <!-- 侧边栏 -->
    <SideBar :collapsed="sidebarCollapsed" @toggle="sidebarCollapsed = !sidebarCollapsed" />

    <!-- 主内容区 -->
    <div class="main-area">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SideBar from './SideBar.vue'

const sidebarCollapsed = ref(false)
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
