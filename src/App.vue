<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Tabbar, TabbarItem } from 'vant'

const route = useRoute()
const router = useRouter()

// 仅在带 tabbar meta 的路由显示底部导航
const showTabbar = computed(() => !!route.meta.tabbar)
const activeTab = computed(() => route.name as string)

const tabs = computed(() =>
  router
    .getRoutes()
    .filter((r) => r.meta?.tabbar)
    .map((r) => ({
      name: r.name as string,
      label: r.meta?.tabLabel as string,
      icon: r.meta?.tabIcon as string
    }))
)

function onSelect(name: string | number) {
  router.push({ name: String(name) })
}
</script>

<template>
  <div class="app-shell">
    <main class="app-content">
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </main>

    <Tabbar
      v-if="showTabbar"
      v-model="activeTab"
      route
      active-color="#E55D8C"
      inactive-color="#9AA0A6"
      @change="onSelect"
      class="app-tabbar"
    >
      <TabbarItem v-for="t in tabs" :key="t.name" :name="t.name" :icon="t.icon">
        {{ t.label }}
      </TabbarItem>
    </Tabbar>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #fff7f9;
}
.app-content {
  flex: 1;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  padding-bottom: 64px;
  box-sizing: border-box;
}
.app-tabbar {
  max-width: 480px;
  left: 50%;
  transform: translateX(-50%);
}
</style>
