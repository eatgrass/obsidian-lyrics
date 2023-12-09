import {
    MarkdownRenderChild,
    MarkdownRenderer,
    type App,
    type MarkdownPostProcessorContext,
    Menu,
    MarkdownView,
} from 'obsidian'
import Player from './Player.svelte'
import type LyricsPlugin from 'main'

export default class LyricsMarkdownRender extends MarkdownRenderChild {
    static readonly AUDIO_FILE_REGEX = /^source (?<audio>.*)/i
    static readonly LYRICS_PARSE_REGEX =
        /^\[(?<time>\d{2,}:\d{2}(\.\d{2,})?)\](?<text>.*)/
    static readonly INTERNAL_LINK_REGEX = /\[\[(?<link>.*)\]\]/

    private audioPath?: string
    private source: string
    private app: App
    private container: HTMLElement
    private player?: Player
    private currentHL: number = -1
    private path: string
    private plugin: LyricsPlugin

    private seek = (e: MouseEvent) => {
        let target = e.target as HTMLElement
        let time = target?.dataset?.time
        if (time) {
            this.player?.seek(parseInt(time) / 1000)
        }
    }

    private contextMenu = (e: MouseEvent) => {
        let target = e.target as HTMLElement
        let time = target?.dataset?.time || target.parentElement?.dataset?.time
        let lyid = target?.dataset?.lyid || target.parentElement?.dataset?.lyid
        const menu = new Menu()

        menu.addItem((item) => {
            item.setTitle('Play')
                .setIcon('play')
                .onClick(async () => {
                    this.player?.play()
                })
        })

        menu.addItem((item) => {
            item.setTitle('Pause')
                .setIcon('pause')
                .onClick(async () => {
                    this.player?.pause()
                })
        })

        menu.addItem((item) =>
            item
                .setTitle('Seek')
                .setIcon('seek')
                .onClick(() => {
                    if (time) {
                        this.player?.seek(parseInt(time) / 1000)
                    }
                }),
        )

        menu.addItem((item) =>
            item
                .setTitle('Edit')
                .setIcon('edit')
                .onClick(async () => {
                    const view =
                        this.plugin.app.workspace.getActiveViewOfType(
                            MarkdownView,
                        )
                    if (view && lyid) {
                        const state = view.getState()
                        state.mode = 'source'
                        await view.leaf.setViewState({
                            type: 'markdown',
                            state: state,
                        })
                        const lineCount = view.editor.lineCount()
                        let start = 0
                        for (let i = 0; i < lineCount; i++) {
                            const lineText = view.editor.getLine(i)
                            if (lineText.includes('```lrc')) {
                                start = i
                                break
                            }
                        }
                        let lineNumber = parseInt(lyid) + start + 2
                        let lineContent = view.editor.getLine(lineNumber)
                        view.editor.focus()
                        view.editor.setCursor(lineNumber, 0)
                        view.editor.setSelection(
                            {
                                line: lineNumber,
                                ch: 0,
                            },
                            {
                                line: lineNumber,
                                ch: lineContent.length,
                            },
                        )
                    }
                }),
        )

        menu.addItem((item) => {
            item.setTitle('Copy current timestamp')
                .setIcon('copy')
                .onClick(async () => {
                    const timestamp = this.player?.getTimeStamp() || 0
                    const min = Math.floor(timestamp / 60)
                    const minStr = min < 10 ? `0${min}` : `${min}`
                    const sec = timestamp % 60
                    const secStr =
                        sec < 10 ? `0${sec.toFixed(2)}` : `${sec.toFixed(2)}`
                    navigator.clipboard.writeText(`[${minStr}:${secStr}]`)
                })
        })

        menu.showAtMouseEvent(e)
    }

    constructor(
        plugin: LyricsPlugin,
        source: string,
        container: HTMLElement,
        ctx: MarkdownPostProcessorContext,
    ) {
        super(container)
        this.plugin = plugin
        this.app = plugin.app
        this.source = source
        this.container = container
        this.path = ctx.sourcePath
    }

    private parseTime(time?: string): number {
        if (time) {
            let parts = time.split(':')
            return (
                parseInt(parts[0]) * 60000 +
                parseInt((parseFloat(parts[1]) * 1000).toFixed(3))
            )
        } else {
            return 0
        }
    }

    // FIXME: error handling
    async onload() {
        let fragment = new DocumentFragment()
        const playerEl = fragment.createDiv()
        playerEl.addClass('player-wrapper')
        let lines = this.source.split(/r?\n/)
        if (lines.length > 0) {
            // render player
            let match = lines[0].match(LyricsMarkdownRender.AUDIO_FILE_REGEX)
            if (match) {
                this.audioPath = match.groups?.audio
                let src: string | null = null

                // resolve audio file path
                if (this.audioPath) {
                    const internalLink = this.audioPath.match(
                        LyricsMarkdownRender.INTERNAL_LINK_REGEX,
                    )
                    if (internalLink) {
                        const link = internalLink.groups?.link

                        if (link) {
                            const file =
                                this.plugin.app.metadataCache.getFirstLinkpathDest(
                                    link,
                                    '',
                                )
                            if (file) {
                                src = this.app.vault.getResourcePath(file)
                            }
                        }
                    } else {
                        src = this.app.vault.adapter.getResourcePath(
                            this.audioPath!,
                        )
                    }

                    if (!src) {
                        fragment.appendText(
                            `Error: Invalid source ${this.audioPath}.
							`,
                        )
                        this.container.append(fragment)
                        return
                    }

                    // add auto-scroll controller

                    this.player = new Player({
                        target: playerEl,
                        props: {
                            src,
                            timeupdate: (timestamp: number) => {
                                const lyrics = this.container.querySelectorAll(
                                    '.lyrics-wrapper[data-time]',
                                ) as NodeListOf<HTMLElement>

                                let hl = this.binarySearch(
                                    lyrics,
                                    Math.round(timestamp * 1000),
                                )

                                if (hl !== this.currentHL) {
                                    if (hl >= 0) {
                                        const hlel = lyrics.item(hl)
                                        if (hlel) {
                                            hlel.addClass('lyrics-highlighted')
                                            if (
                                                this.plugin.getSettings()
                                                    .autoScroll
                                            ) {
                                                hlel.scrollIntoView({
                                                    behavior: 'smooth',
                                                    block: 'center',
                                                })
                                            }
                                        }
                                    }

                                    if (this.currentHL >= 0) {
                                        lyrics
                                            .item(this.currentHL)
                                            ?.removeClass('lyrics-highlighted')
                                    }

                                    this.currentHL = hl
                                }
                            },
                        },
                    })
                    fragment.append(playerEl)
                }
            }

            const div = fragment.createDiv()
            div.addEventListener('click', this.seek)
            div.addEventListener('contextmenu', this.contextMenu)
            // render lyrcis
            let markdown = lines
                .slice(1)
                .map((line, index) => {
                    if (line) {
                        let lrc = line.match(
                            LyricsMarkdownRender.LYRICS_PARSE_REGEX,
                        )
                        let time = lrc?.groups?.time
                        let text = lrc?.groups?.text || line
                        let timestamp = this.parseTime(time)
                        let timetag = time
                            ? `<span class="lyrics-timestamp" data-time="${timestamp}" data-lyid="${index}">${
                                  time.split('.')[0]
                              }</span>`
                            : `<span class="lyrics-timestamp"> </span>`
                        let texttag = `<span class="lyrics-text">${text}</span>`
                        return `<span class="lyrics-wrapper" data-time="${timestamp}" data-lyid="${index}">${timetag} ${texttag}</span>`
                    } else {
                        return ''
                    }
                })
                .join('')

            MarkdownRenderer.render(this.app, markdown, div, this.path, this)
            fragment.append(div)
        }

        this.container.append(fragment)
    }

    private binarySearch(arr: NodeListOf<HTMLElement>, time: number): number {
        let left = 0
        let right = arr.length - 1

        while (left <= right) {
            const mid = left + Math.floor((right - left) / 2)
            let mt = Number(arr.item(mid).dataset.time!)

            if (mt == time) {
                return mid
            } else if (mt < time) {
                if (mid < arr.length - 1) {
                    let next = Number(arr.item(mid + 1).dataset.time!)
                    if (next > time) {
                        return mid
                    } else {
                        left = mid + 1
                    }
                } else {
                    return mid + 1
                }
            } else if (mt > time) {
                if (mid >= 1) {
                    let prev = Number(arr.item(mid - 1).dataset.time!)
                    if (prev <= time) {
                        return mid - 1
                    } else {
                        right = mid - 1
                    }
                } else {
                    return mid
                }
            }
        }
        return -1
    }
}
