<template>
  <div class="sidebar" :class="{ collapsed }">
    <!-- Logo 区域 -->
    <div class="sidebar-logo">
      <span class="logo-text">AI出题助手</span>
      <span class="collapse-btn" @click="$emit('toggle')" :title="collapsed ? '展开' : '收起'">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline v-if="collapsed" points="9 18 15 12 9 6"></polyline>
          <polyline v-else points="15 18 9 12 15 6"></polyline>
        </svg>
      </span>
    </div>

    <!-- 功能菜单 -->
    <nav class="sidebar-menu">
      <div
        v-for="item in menuItems"
        :key="item.route"
        class="menu-item"
        :class="{ active: activeRoute === item.route }"
        @click="$router.push(item.route)"
      >
        <span class="menu-label">{{ collapsed ? item.name.charAt(0) : item.name }}</span>
      </div>
    </nav>

    <!-- 最近编辑 -->
    <div class="sidebar-recent" :class="{ collapsed }">
      <template v-if="!collapsed">
        <div class="recent-header">
          <span class="recent-title">最近编辑</span>
        </div>
        <div
          v-for="item in recentEdits"
          :key="item.id"
          class="recent-item"
        >
          <span class="recent-dot"></span>
          <div class="recent-info">
            <span class="recent-name">{{ item.name }}</span>
            <span class="recent-time">{{ item.updatedAt }}</span>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="recent-collapsed-list">
          <div
            v-for="item in recentEdits"
            :key="item.id"
            class="recent-collapsed-dot"
            :title="item.name"
          ></div>
        </div>
      </template>
    </div>

    <!-- 底部设置 -->
    <div class="sidebar-footer">
      <div class="footer-item" @click="handleSettings">
        <span class="footer-label">{{ collapsed ? '设' : '设置' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { recentEdits } from '../../mock'

defineProps<{
  collapsed: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle'): void
}>()

const route = useRoute()

const activeRoute = computed(() => route.path)

const menuItems = [
  { name: 'AI 组卷', route: '/ai-exam' },
  { name: '智能导入', route: '/smart-import' },
  { name: '原创出题', route: '/original-create' },
  { name: '我的题库', route: '/question-bank' }
]

const handleSettings = () => {
  // TODO: 打开设置面板
}
</script>

<style scoped>
.sidebar {
  height: 100%;
  background-color: var(--sidebar-bg);
  display: flex;
  flex-direction: column;
  width: 220px;
  flex-shrink: 0;
  overflow: hidden;
  border-right: 1px solid var(--sidebar-border);
  transition: width var(--transition-normal);
}

.sidebar.collapsed {
  width: 52px;
}

/* Logo */
.sidebar-logo {
  display: flex;
  align-items: center;
  padding: 0 16px;
  height: 48px;
  border-bottom: 1px solid var(--sidebar-border);
  white-space: nowrap;
  overflow: hidden;
  flex-shrink: 0;
}

.logo-text {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  flex: 1;
  overflow: hidden;
}

.collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--sidebar-text);
  flex-shrink: 0;
  transition: background-color var(--transition-fast);
}

.collapse-btn:hover {
  background-color: var(--sidebar-hover);
}

.sidebar.collapsed .collapse-btn {
  margin: 0 auto;
}

/* Menu */
.sidebar-menu {
  flex-shrink: 0;
  padding: 8px 0;
}

.menu-item {
  position: relative;
  display: flex;
  align-items: center;
  height: 36px;
  line-height: 36px;
  padding: 0 16px;
  cursor: pointer;
  font-size: 13px;
  color: var(--sidebar-text);
  white-space: nowrap;
  overflow: hidden;
  transition: background-color var(--transition-fast);
}

.menu-item:hover {
  background-color: var(--sidebar-hover);
}

.menu-item.active {
  background-color: var(--sidebar-active);
  color: #fff;
}

.menu-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 2px;
  height: 16px;
  background-color: #fff;
  border-radius: 0 1px 1px 0;
}

.sidebar.collapsed .menu-item {
  justify-content: center;
  padding: 0;
  text-align: center;
}

/* Recent edits */
.sidebar-recent {
  flex: 1;
  overflow-y: auto;
  border-top: 1px solid var(--sidebar-border);
  margin-top: 4px;
}

.sidebar-recent:not(.collapsed) {
  padding: 12px 12px 0;
}

.sidebar-recent::-webkit-scrollbar {
  width: 3px;
}

.sidebar-recent::-webkit-scrollbar-thumb {
  background-color: #ffffff33;
  border-radius: 3px;
}

.recent-header {
  padding: 0 4px 8px;
}

.recent-title {
  font-size: 11px;
  color: var(--sidebar-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.recent-item {
  display: flex;
  align-items: center;
  padding: 6px 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.recent-item:hover {
  background-color: var(--sidebar-hover);
}

.recent-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--sidebar-text-muted);
  flex-shrink: 0;
}

.recent-info {
  margin-left: 10px;
  overflow: hidden;
}

.recent-name {
  display: block;
  font-size: 13px;
  color: var(--sidebar-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-time {
  display: block;
  font-size: 11px;
  color: var(--sidebar-text-muted);
  margin-top: 2px;
}

/* Collapsed recent */
.recent-collapsed-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
  gap: 6px;
}

.recent-collapsed-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--sidebar-text-muted);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.recent-collapsed-dot:hover {
  background-color: var(--sidebar-text);
}

/* Footer */
.sidebar-footer {
  flex-shrink: 0;
  border-top: 1px solid var(--sidebar-border);
  padding: 4px 0;
}

.footer-item {
  display: flex;
  align-items: center;
  height: 36px;
  line-height: 36px;
  padding: 0 16px;
  cursor: pointer;
  font-size: 13px;
  color: var(--sidebar-text);
  transition: background-color var(--transition-fast);
}

.footer-item:hover {
  background-color: var(--sidebar-hover);
}

.sidebar.collapsed .footer-item {
  justify-content: center;
  padding: 0;
  text-align: center;
}
</style>
