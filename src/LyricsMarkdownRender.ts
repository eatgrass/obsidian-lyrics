import {
    MarkdownRenderChild,
    type App,
    type MarkdownPostProcessorContext,
    Menu,
    MarkdownView,
} from 'obsidian'
import Player from './Player.svelte'
import LyricsPlugin from 'main'
import LyricsRenderer from 'renderers'

export default class LyricsMarkdownRender extends MarkdownRenderChild {
    static readonly AUDIO_FILE_REGEX = /^source (?<audio>.*)/i
    static readonly INTERNAL_LINK_REGEX = /\[\[(?<link>.*)\]\]/

    private audioPath?: string
    private source: string
    private app: App
    private container: HTMLElement
    private player?: Player
    private currentHL: number = -1
    private path: string
    private plugin: LyricsPlugin
    private autoScroll: boolean
    private sentenceMode: boolean
    private lyricsRenderer: LyricsRenderer
    private pauseHl: boolean = false

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
        this.autoScroll = this.plugin.getSettings().autoScroll
        this.sentenceMode = this.plugin.getSettings().sentenceMode
        this.lyricsRenderer = new LyricsRenderer(plugin.app)
    }

    private seek = (e: MouseEvent) => {
        let target = e.target as HTMLElement
        let time = target?.dataset?.time
        if (time !== undefined) {
            const sec = parseInt(time) / 1000
            this.updateTimestamp(sec, true)
            this.player?.seek(sec)
        }
    }

    private updateTimestamp = (sec: number, seek: boolean = false) => {
        const lyrics = this.container.querySelectorAll(
            '.lyrics-line[data-time]',
        ) as NodeListOf<HTMLElement>

        let hl = this.binarySearch(lyrics, Math.round(sec * 1000))

        if (hl !== this.currentHL) {
            if (this.player) {
                if (
                    this.sentenceMode &&
                    !this.player.paused() &&
                    this.currentHL != -1 &&
                    !seek
                ) {
                    this.player.pause()
                    this.pauseHl = true
                }
            }
            this.currentHL = hl
        }

        if (!this.pauseHl) {
            if (this.currentHL >= 0) {
                let hlels = this.container.findAll('.lyrics-highlighted')
                hlels.forEach((el) => {
                    el.removeClass('lyrics-highlighted')
                })
            }

            if (hl >= 0) {
                const hlel = lyrics.item(hl)
                if (hlel) {
                    hlel.addClass('lyrics-highlighted')
                    if (this.autoScroll) {
                        hlel.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                        })
                    }
                }
            }
        }
    }

    private findParentData(element: HTMLElement | null) {
        while (element && element.className !== 'lyrics-wrapper') {
            if (element.dataset && element.dataset['offset']) {
                return {
                    time: element.dataset['time'],
                    offset: element.dataset['offset'],
                }
            }
            element = element.parentElement
        }
        return null
    }

    private contextMenu = (e: MouseEvent) => {
        let target = e.target as HTMLElement
        let data = this.findParentData(target)
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
                .setIcon('fast-forward')
                .onClick(() => {
                    if (data?.time) {
                        this.player?.seek(parseInt(data.time) / 1000)
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
                    if (view && data?.offset) {
                        const state = view.getState()
                        let [from, to] = data.offset.split(',')
                        state.mode = 'source'
                        await view.leaf.setViewState({
                            type: 'markdown',
                            state: state,
                        })
                        const lineCount = view.editor.lineCount()
                        let start = 0
                        for (let i = 0; i < lineCount; i++) {
                            const lineText = view.editor.getLine(i)
                            // NOTE: can only calculate the first lrc code block position
                            if (lineText.includes('```lrc')) {
                                start = i
                                break
                            }
                        }
                        let head = this.player ? 2 : 1
                        let lineFrom = head + parseInt(from) + start
                        let lineTo = head + parseInt(to) + start
                        let lineContent = view.editor.getLine(lineTo)
                        view.editor.focus()
                        view.editor.setCursor(lineFrom, 0)
                        view.editor.setSelection(
                            {
                                line: lineFrom,
                                ch: 0,
                            },
                            {
                                line: lineTo,
                                ch: lineContent.length,
                            },
                        )
                        view.editor.scrollIntoView(
                            {
                                from: {
                                    line: lineFrom,
                                    ch: 0,
                                },
                                to: {
                                    line: lineTo,
                                    ch: lineContent.length,
                                },
                            },
                            true,
                        )
                    }
                }),
        )

        menu.addItem((item) => {
            item.setTitle('Copy current timestamp')
                .setIcon('copy')
                .onClick(async () => {
                    const timestamp = this.player?.getTimeStamp() || 0
                    const hours = Math.floor(timestamp / 3600)
                    const hourStr =
                        hours == 0
                            ? ''
                            : hours < 10
                              ? `0${hours}:`
                              : `${hours}:`
                    const secmode = timestamp % 3600
                    const minutes = Math.floor(secmode / 60)
                    const minStr = minutes < 10 ? `0${minutes}` : `${minutes}`
                    const seconds = secmode % 60
                    const secStr =
                        seconds < 10
                            ? `0${seconds.toFixed(2)}`
                            : `${seconds.toFixed(2)}`
                    navigator.clipboard.writeText(
                        `[${hourStr}${minStr}:${secStr}]`,
                    )
                })
        })

        menu.addItem((item) => {
            item.setTitle('Auto-scroll')
                .setChecked(this.autoScroll)
                .onClick(async () => {
                    const lyrics = this.container.querySelectorAll(
                        '.lyrics-line[data-time]',
                    ) as NodeListOf<HTMLElement>

                    if (lyrics.length > 0 && this.currentHL >= 0) {
                        lyrics.item(this.currentHL).scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                        })
                    }
                    this.autoScroll = !this.autoScroll
                })
        })

        menu.addItem((item) => {
            item.setTitle('Sentence mode')
                .setChecked(this.sentenceMode)
                .onClick(async () => {
                    this.sentenceMode = !this.sentenceMode
                })
        })

        menu.showAtMouseEvent(e)
    }

    async onload() {
        let eol = this.source.indexOf('\n')

        // first line: audio source
        if (this.source.length > 0 && eol >= 0) {
            let sourceLine = this.source.substring(0, eol)
            // render player
            let fragment = new DocumentFragment()
            const playerEl = fragment.createDiv()
            playerEl.addClass('player-wrapper')

            let match = sourceLine.match(LyricsMarkdownRender.AUDIO_FILE_REGEX)
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
                            timeupdate: this.updateTimestamp,
                            onPlay: () => {
                                this.pauseHl = false
                            },
                        },
                    })
                    fragment.append(playerEl)
                }
            }

            const div = fragment.createDiv()
            div.addEventListener('click', this.seek)
            div.addEventListener('contextmenu', this.contextMenu)
            div.className = 'lyrics-wrapper'
            // render lyrcis
            if (this.source.length > eol) {
                this.lyricsRenderer.render(
                    this.source.substring(eol + 1),
                    div,
                    this.path,
                    this,
                )
            }

            this.container.append(fragment)
        }
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
                    return arr.length - 1
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
