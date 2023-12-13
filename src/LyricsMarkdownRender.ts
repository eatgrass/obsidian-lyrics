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

type LrcLine = {
    timestamp?: number
    timestr?: string
    text: string
}

const DEFAULT_LRC: LrcLine = {
    text: '',
    timestr: '',
}

export default class LyricsMarkdownRender extends MarkdownRenderChild {
    static readonly AUDIO_FILE_REGEX = /^source (?<audio>.*)/i
    static readonly LYRICS_PARSE_REGEX =
        /^\[(((\d+):)?(\d+):(\d+(\.\d+))?)\](.*)$/
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
    }

    static parseLrc(text: string = ''): LrcLine {
        const lrc: LrcLine = { ...DEFAULT_LRC, text }

        const match = text.match(LyricsMarkdownRender.LYRICS_PARSE_REGEX)

        if (text == '' || !match) {
            return lrc
        }

        try {
            let hours = match[3] ? parseInt(match[3], 10) : 0
            let minutes = match[4] ? parseInt(match[4], 10) : 0
            let seconds = match[5]
                ? Math.round(parseFloat(match[5]) * 1000) / 1000
                : 0

            const timestamp = hours * 3600 + minutes * 60 + seconds

            const inMin = Math.floor(timestamp / 60)
            const inSec = Math.floor(timestamp % 60)

            const minStr = inMin < 10 ? `0${inMin}` : `${inMin}`
            const secStr = inSec < 10 ? `0${inSec}` : `${inSec}`
            return {
                timestamp,
                timestr: `${minStr}:${secStr}`, //normalize the time string
                text: match[7],
            }
        } catch {
            return lrc
        }
    }

    private seek = (e: MouseEvent) => {
        let target = e.target as HTMLElement
        let time = target?.dataset?.time
        if (time) {
            const sec = parseInt(time) / 1000
            this.updateTimestamp(sec, true)
            this.player?.seek(sec)
        }
    }

    private updateTimestamp = (sec: number, force: boolean = false) => {
        const lyrics = this.container.querySelectorAll(
            '.lyrics-wrapper[data-time]',
        ) as NodeListOf<HTMLElement>

        let hl = this.binarySearch(lyrics, Math.round(sec * 1000))

        if (hl !== this.currentHL) {
            if (this.sentenceMode && !force) {
                this.player?.pause()
                return
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

            if (this.currentHL >= 0) {
                lyrics.item(this.currentHL)?.removeClass('lyrics-highlighted')
            }

            this.currentHL = hl
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
                .setIcon('fast-forward')
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
                        view.editor.scrollIntoView(
                            {
                                from: {
                                    line: lineNumber,
                                    ch: 0,
                                },
                                to: {
                                    line: lineNumber,
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
                        '.lyrics-wrapper[data-time]',
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
                            timeupdate: this.updateTimestamp,
                        },
                    })
                    fragment.append(playerEl)
                }
            }

            const div = fragment.createDiv()
            div.addEventListener('click', this.seek)
            div.addEventListener('contextmenu', this.contextMenu)
            // render lyrcis
            let markdownLines: HTMLSpanElement[] = await Promise.all(
                lines.slice(1).map(async (line, index) => {
                    const lineWrapper = div.createSpan()
                    if (line) {
                        const lrc = LyricsMarkdownRender.parseLrc(line)
                        lineWrapper.className = 'lyrics-wrapper'
                        lineWrapper.dataset.lyid = `${index}`
                        const timestampSpan = lineWrapper.createSpan()
                        timestampSpan.setText(lrc.timestr || '')
                        const textWrapper = lineWrapper.createSpan()
                        textWrapper.className = 'lyrics-text'
                        timestampSpan.className = 'lyrics-timestamp'
                        timestampSpan.dataset.lyid = `${index}`
                        if (lrc.timestamp) {
                            timestampSpan.dataset.time = `${
                                lrc.timestamp * 1000
                            }`
                            lineWrapper.dataset.time = `${lrc.timestamp * 1000}`
                        }
                        lineWrapper.append(timestampSpan)
                        await MarkdownRenderer.render(
                            this.app,
                            lrc.text,
                            textWrapper,
                            this.path,
                            this,
                        )
                        lineWrapper.append(textWrapper)
                    }

                    return lineWrapper
                }),
            )

            div.append(...markdownLines)
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
