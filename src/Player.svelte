<script lang="ts">
export let src: string
export let timeupdate: (time: number) => void
let player: HTMLAudioElement
export let time: number
export let onPlay: () => void
export function seek(t: number) {
    time = t
    play()
}

export function getTimeStamp(): number {
    return time
}

export function play(): void {
    if (player.paused) {
        player.play()
    }
}

export function paused(): boolean {
    return player.paused
}

export function pause(): void {
    if (!player.paused) {
        player.pause()
    }
}

const _timeupdate = () => {
    if (timeupdate) {
        timeupdate(time)
    }
}

const _play = () => {
    if (onPlay) {
        onPlay()
    }
}
</script>

<div class="audio-wrapper">
    <audio
        bind:this={player}
        controlslist="nodownload"
        {src}
        controls
        bind:currentTime={time}
        on:timeupdate={_timeupdate}
        on:play={_play}
    ></audio>
</div>

<style>
</style>
