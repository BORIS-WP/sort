<template>
  <div id="app">
    <router-view /> 
  </div>
</template>

<script setup>
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
body {
  font-family: "Microsoft YaHei", sans-serif;
  background-color: #1e1e1e;
  color: #ffffff;
  min-height: 100vh;
}
#app {
  width: 100%;
  min-height: 100vh;
  padding: 20px;
  margin: 0 auto;
}
.cursor-pointer {
  cursor: pointer;
}
</style>