<script setup lang="ts">
import { Player } from "@rustrak/openshowcase-player-core";
import { type Demo, parseDemo } from "@rustrak/openshowcase-schema";
import { onMounted, onUnmounted, ref, watch } from "vue";
import type { InteractiveDemoProps } from "./InteractiveDemo.types";

const props = withDefaults(defineProps<InteractiveDemoProps>(), {
  aspectRatio: 16 / 9,
});

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; demo: Demo; assetBaseUrl?: string };

function dirnameOf(url: string): string {
  return url.slice(0, url.lastIndexOf("/"));
}

const state = ref<LoadState>(
  props.demo
    ? { status: "ready", demo: props.demo, assetBaseUrl: props.assetBaseUrl }
    : { status: "loading" },
);
const containerRef = ref<HTMLDivElement>();
let player: Player | undefined;

watch(
  () => [props.src, props.demo, props.assetBaseUrl] as const,
  ([src, demo, assetBaseUrl], _prev, onCleanup) => {
    if (demo) {
      state.value = { status: "ready", demo, assetBaseUrl };
      return;
    }
    if (!src) {
      state.value = {
        status: "error",
        message: 'InteractiveDemo needs either a "src" or a "demo" prop.',
      };
      return;
    }

    let cancelled = false;
    onCleanup(() => {
      cancelled = true;
    });
    state.value = { status: "loading" };

    fetch(src)
      .then((res) => {
        if (!res.ok)
          throw new Error(
            `Failed to load demo: ${res.status} ${res.statusText}`,
          );
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        state.value = {
          status: "ready",
          demo: parseDemo(json),
          assetBaseUrl: assetBaseUrl ?? dirnameOf(src),
        };
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        state.value = {
          status: "error",
          message:
            error instanceof Error ? error.message : "Failed to load demo",
        };
      });
  },
  { immediate: true },
);

function mountPlayer(): void {
  player?.destroy();
  player = undefined;
  if (state.value.status !== "ready" || !containerRef.value) return;
  player = new Player({
    container: containerRef.value,
    demo: state.value.demo,
    assetBaseUrl: state.value.assetBaseUrl,
    onStepChange: props.onStepChange,
  });
  player.mount();
}

watch(state, mountPlayer);
onMounted(mountPlayer);
onUnmounted(() => player?.destroy());

const overlayStyle = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#9ca3af",
  fontSize: "14px",
  fontFamily: "system-ui, sans-serif",
  background: "#f4f4f5",
} as const;
</script>

<template>
  <!--
    Unlike the React wrapper, `class`/`style` aren't declared as props here — Vue forwards
    them to the root element automatically (attribute fallthrough) and merges them with the
    template's own bindings, so the consumer just writes `<InteractiveDemo class="..." />`.
  -->
  <div style="position: relative; width: 100%">
    <div ref="containerRef" style="position: relative"></div>
    <div v-if="state.status !== 'ready'" :style="{ position: 'relative', width: '100%', aspectRatio: String(aspectRatio) }">
      <div v-if="state.status === 'loading'" :style="overlayStyle">Loading demo…</div>
      <div v-if="state.status === 'error'" :style="{ ...overlayStyle, color: '#f87171' }">{{ state.message }}</div>
    </div>
  </div>
</template>
