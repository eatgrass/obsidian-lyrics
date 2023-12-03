import { MarkdownRenderChild, MarkdownRenderer, type App } from 'obsidian'
import Player from './Player.svelte'

export default class LyricsMarkdownRender extends MarkdownRenderChild {
    static readonly AUDIO_FILE_REGEX = /^audio (?<audio>.*)/i
    static readonly LYRICS_PARSE_REGEX =
        /^\[(?<time>\d{2}:\d{2}\.\d{2,})\](?<text>.*)/

    private audioPath?: string
    private source: string
    private app: App
    private container: HTMLElement
    private player?: Player

    private seekHandler = (e: MouseEvent) => {
        let target = e.target as HTMLElement
        let time = target?.dataset?.time
        if (time) {
            let parts = time.split(':')
            let sec = parseInt(parts[0]) * 60 + parseInt(parts[1])
            this.player?.seek(sec)
        }
    }

    constructor(app: App, source: string, container: HTMLElement) {
        super(container)
        this.app = app
        this.source = source
        this.container = container
    }

    async onload() {
        let fragment = new DocumentFragment()
        const playerEl = fragment.createDiv()
        let lines = this.source.split(/r?\n/)
        if (lines.length > 0) {
            // render player
            let match = lines[0].match(LyricsMarkdownRender.AUDIO_FILE_REGEX)
            if (match) {
                this.audioPath = match.groups?.audio
                if (this.audioPath) {
                    let src = this.app.vault.adapter.getResourcePath(
                        this.audioPath!,
                    )
                    this.player = new Player({
                        target: playerEl,
                        props: {
                            src,
                        },
                    })
                    fragment.append(playerEl)
                }
            }

            const div = fragment.createDiv()
            div.addEventListener('click', this.seekHandler)
            // render lyrcis
            let markdown = lines
                .slice(1)
                .map((line) => {
                    let lrc = line.match(
                        LyricsMarkdownRender.LYRICS_PARSE_REGEX,
                    )
                    let time = lrc?.groups?.time
                    let text = lrc?.groups?.text || ''
                    let timemark = time
                        ? `<span data-time="${time}" class="lyric-timestamp">\\[${time}\\]</span>`
                        : ``
                    let mdLine = lrc ? `${timemark} ${text}` : line
                    return mdLine
                })
                .join('\n')

            MarkdownRenderer.render(this.app, markdown, div, '', this)
            fragment.append(div)
        }

        this.container.append(fragment)
    }
}
