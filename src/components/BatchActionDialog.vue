<template>
  <el-dialog 
    :model-value="visible" 
    @update:model-value="$emit('update:visible', $event)"
    :title="dialogTitle" 
    width="360px" 
    append-to-body
  >
    <div v-if="actionType === 'delete'">
      <p>确定要删除选中的 <strong>{{ selectedCount }}</strong> 道题目吗？此操作不可撤销。</p>
    </div>
    <div v-else-if="actionType === 'adapt'">
      <p>将对选中的 <strong>{{ selectedCount }}</strong> 道题目执行难度轮换。</p>
    </div>
    <div v-else-if="actionType === 'score'">
      <p>将选中的 <strong>{{ selectedCount }}</strong> 道题目的分值统一设置为：</p>
      <el-input-number 
        :model-value="score" 
        @update:model-value="$emit('update:score', $event)"
        :min="1" 
        :max="20" 
        size="small" 
        style="margin-top: 8px;" 
      />
    </div>
    <template #footer>
      <el-button size="small" @click="$emit('update:visible', false)">取消</el-button>
      <el-button size="small" type="primary" @click="confirmAction">确认</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  visible: boolean
  actionType: 'delete' | 'adapt' | 'score'
  selectedCount: number
  score: number
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'update:score', value: number): void
  (e: 'confirm'): void
}>()

const dialogTitle = computed(() => {
  switch (props.actionType) {
    case 'delete': return '批量删除'
    case 'adapt': return '批量改编'
    case 'score': return '批量调整分值'
    default: return '批量操作'
  }
})

function confirmAction() {
  emit('confirm')
}
</script>

<style scoped>
/* 组件样式可以根据需要添加 */
</style>
