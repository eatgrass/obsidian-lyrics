<script lang="ts">
export let src: string
let player: HTMLAudioElement
export function seek(time: number) {
    if (player) {
        player.currentTime = time
    }
}
</script>

<audio bind:this={player} controlslist="nodownload" {src} controls></audio>

<style>
</style>
