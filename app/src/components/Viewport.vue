<template>
  <div class="flex flex-1">
    <div class="w-64 flex items-center text-2xl ml-8 -mr-64">Result</div>
  <div class="max-w-5xl w-full mx-auto bg-gray-800 flex-1 relative m-8 border border-gray-700 rounded">
    <CViewportContainer class="absolute inset-0">
      <CSvg2dViewport
        ref="viewport"
        :extents="extents"
        class="fill-none stroke-gray-200"

      >
        <path ref="pathRef" :stroke-width="store.radius * 2" :d="path"/>
      </CSvg2dViewport>
    </CViewportContainer>
  </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import store from '../store.js';

const pathRef = ref(null);
const extents = ref();
const viewport = ref(null);
const path = computed(() => store.path);

function zoomToExtents() {
  const { x, y, width, height } = pathRef.value.getBBox();

  extents.value = {
    xmin: x - store.radius,
    xmax: x + width + store.radius * 3,
    ymin: y - store.radius * 3,
    ymax: y + height + store.radius * 2,
  }
  setTimeout(() => {
    viewport.value?.zoomToExtents();
  });
}

watch(path, () => {
  setTimeout(zoomToExtents);
});

onMounted(() => {
  setTimeout(zoomToExtents);
});

</script>
