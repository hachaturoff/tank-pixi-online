<script setup>
import Example from './components/Example.vue'
</script>

<template>
  <div class="container">
    <header>
      <h1>Simple Field with Vue 3 and PixiJS</h1>
    </header>

    <main>
      <Example />
    </main>
  </div>
</template>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

header {
  text-align: center;
  margin-bottom: 20px;
}

header h1 {
  color: #333;
  margin: 0;
}
</style>