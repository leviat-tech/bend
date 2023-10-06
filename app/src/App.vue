<script setup>
import Viewport from './components/Viewport.vue'
import InputPanel from './components/InputPanel.vue';</script>

<template>
  <div class="min-h-screen flex flex-col bg-gray-900 text-white">
    <div class="text-center text-3xl mt-8">Bend Test App</div>
    <InputPanel/>
    <hr class="w-full">
    <Viewport/>
  </div>
</template>
