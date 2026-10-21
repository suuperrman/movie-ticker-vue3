<script setup>
import { ref } from 'vue';

const msg = ref('第一阶段基础架构已就绪');
</script>

<template>
  <section class="page-heading">
    <h1>🎬 Movie Ticker</h1>
    <p>{{ msg }}</p>
    <p>开发步骤详见 <code>doc/</code> 目录</p>
  </section>
</template>
