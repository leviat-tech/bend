<template>
  <div class="flex">
    <div class="w-64 flex items-center text-2xl ml-8 -mr-64">Input</div>
    <div class="max-w-5xl w-full mx-auto flex-none text-gray-300 flex m-8">
    <textarea
      id="input__path"
      @keyup="generateBend"
      v-model="localValue"
      class="w-full h-48 p-3 border border-gray-700 focus:border-blue-400 rounded bg-gray-800 outline-0"/>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import Bend from '../../../src/bend';
import store from '../store';

const localValue = ref('6 d 6 s 40 l 45 w 30 l -90 w 30 l 90 w 30 l 90 w 30 l');


function generateBend(e) {
  const bend = Bend({ path: localValue.value });
  store.radius = bend.instructions().find(item => item.type === 'barRadius').radius || 1;
  store.path = bend.reverse().print();
}

generateBend()
</script>
