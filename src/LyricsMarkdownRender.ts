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
    private currentHL: number = 0

    private seek = (e: MouseEvent) => {
        let target = e.target as HTMLElement
        let time = target?.dataset?.time || 0
        this.player?.seek(time)
    }

    constructor(app: App, source: string, container: HTMLElement) {
        super(container)
        this.app = app
        this.source = source
        this.container = container
    }

    private parseTime(time?: string): number {
        if (time) {
            let parts = time.split(':')
            return parseInt(parts[0]) * 60 + parseFloat(parts[1])
        } else {
            return 0
        }
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
                            timeupdate: (timestamp: number) => {
                                const lyrics = this.container.querySelectorAll(
                                    '.lyrics-wrapper[data-time]',
                                )
                                console.log(lyrics)

                                let find = false
                                for (let i = 0; i < lyrics.length; i++) {
                                    let ele = lyrics.item(i) as HTMLElement
                                    if (
                                        parseFloat(ele.dataset.time!) >
                                            timestamp &&
                                        !find
                                    ) {
                                        let index = i - 1 >= 0 ? i - 1 : 0
                                        lyrics
                                            .item(index)
                                            ?.addClass('lyrics-highlighted')
                                        this.currentHL = index
                                        find = true
                                    }
                                    if (i !== this.currentHL) {
                                        ele.classList.remove(
                                            'lyrics-highlighted',
                                        )
                                    }
                                }
                            },
                        },
                    })
                    fragment.append(playerEl)
                }
            }

            const div = fragment.createDiv()
            div.addEventListener('click', this.seek)
            // render lyrcis
            let markdown = lines
                .slice(1)
                .map((line) => {
                    let lrc = line.match(
                        LyricsMarkdownRender.LYRICS_PARSE_REGEX,
                    )
                    let time = lrc?.groups?.time
                    let text = lrc?.groups?.text
                    let timestamp = this.parseTime(time)
                    let timetag = time
                        ? `<span class="lyrics-timestamp" data-time="${timestamp}">\\[${time}\\]</span>`
                        : ``
                    let texttag = text
                        ? `<span class="lyrics-text">${text}</span>`
                        : ''
                    let mdLine = lrc
                        ? `<span class="lyrics-wrapper" data-time="${timestamp}">${timetag} ${texttag}</span>`
                        : line
                    return mdLine
                })
                .join('\n')

            MarkdownRenderer.render(this.app, markdown, div, '', this)
            fragment.append(div)
        }

        this.container.append(fragment)
    }
}
