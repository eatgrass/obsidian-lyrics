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
        let target = e.currentTarget as HTMLElement
        let time = target?.dataset?.time
        if (time) {
            this.player?.seek(time)
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
        this.source.split(/\r?\n/).forEach(async (line, i) => {
            if (i == 0) {
                const playerEl = fragment.createDiv()
                fragment.append(playerEl)
                let audio = line.match(LyricsMarkdownRender.AUDIO_FILE_REGEX)
                if (audio) {
                    this.audioPath = audio.groups?.audio
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
                    }
                }
            } else {
                let lrc = line.match(LyricsMarkdownRender.LYRICS_PARSE_REGEX)

                const span = fragment.createDiv()
                fragment.append(span)
                if (lrc) {
                    let time = lrc?.groups?.time || ''
                    if (time) {
                        let timeparts = time.split(':')
                        span.dataset.time = (
                            parseInt(timeparts[0]) * 60 +
                            parseInt(timeparts[1])
                        ).toString()

                        span.addEventListener('click', this.seekHandler)
                    }

                    MarkdownRenderer.render(
                        this.app,
                        `\\[${time}\\] ${lrc.groups?.text || ''}` || '',
                        span,
                        '',
                        this,
                    )
                } else {
                    MarkdownRenderer.render(this.app, line, span, '', this)
                }
            }
        })
        this.container.append(fragment)
    }
}
