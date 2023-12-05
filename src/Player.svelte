<script lang="ts">
export let src: string
export let timeupdate: (time: number) => void
let player: HTMLAudioElement
export let time: number
export function seek(t: number) {
    time = t
}
const _timeupdate = () => {
    if (timeupdate) {
        timeupdate(time)
    }
}
</script>

<div class="audio-wrapper">
    <audio
        controlslist="nodownload"
        {src}
        controls
        bind:currentTime={time}
        on:timeupdate={_timeupdate}
    ></audio>
</div>

<style>
</style>
