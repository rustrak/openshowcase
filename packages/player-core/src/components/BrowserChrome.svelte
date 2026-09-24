<script lang="ts">
interface Props {
  title: string;
  onReload?: () => void;
}

let { title, onReload }: Props = $props();
</script>

<div class="flex shrink-0 items-center gap-1.5 border-b border-[#e4e4e7] bg-[#f4f4f5] px-3.5 py-2.25 dark:border-[#3f3f46] dark:bg-[#27272a]">
  {#each Array.from({ length: 3 }) as _, i (i)}
    <span class="h-2.5 w-2.5 rounded-full bg-[#d4d4d8] dark:bg-[#52525b]"></span>
  {/each}
  <span
    class="mx-auto flex-[0_1_380px] self-center overflow-hidden rounded-md bg-[#e9e9eb] px-2.5 py-0.75 text-center text-[11.5px] text-ellipsis whitespace-nowrap text-[#71717a] dark:bg-[#3f3f46] dark:text-[#a1a1aa]"
  >
    {title}
  </span>
  <button
    type="button"
    title="Back to start"
    class="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-md border-0 bg-transparent p-0 text-[#71717a] hover:bg-[#e4e4e7] hover:text-[#18181b] dark:text-[#a1a1aa] dark:hover:bg-[#3f3f46] dark:hover:text-[#fafafa]"
    onclick={() => onReload?.()}
  >
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
    </svg>
  </button>
</div>
