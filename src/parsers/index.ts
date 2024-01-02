import { MarkdownRenderer, type App, type Component } from 'obsidian'
import { chunk } from 'lodash'

export type LyricsLine = {
    timestamp?: number // milliseconds
    timestr?: string
    text: string
    rows: number
}

export const DEFAULT_LRC: LyricsLine = {
    text: '',
    timestr: '',
    rows: 1,
}

export abstract class Parser {
    protected app: App

    constructor(app: App) {
        this.app = app
    }

    public abstract match(content: string): number

    protected async renderLine(
        container: HTMLDivElement,
        line: LyricsLine,
        index: number,
        path: string,
        component: Component,
    ): Promise<HTMLElement> {
        const lineEl = container.createSpan()

        if (line) {
            lineEl.addClass('lyrics-line')
            lineEl.dataset.lyid = `${index}`
            const timeEl = lineEl.createSpan()
            timeEl.setText(line.timestr || '')
            timeEl.addClass('lyrics-timestamp')
            timeEl.dataset.lyid = `${index}`
            if (line.timestamp) {
                const millis = Math.floor(line.timestamp)
                timeEl.dataset.time = `${millis}`
                lineEl.dataset.time = `${millis}`
            }
            const text = lineEl.createDiv()
            text.addClass('lyrics-text')
            await MarkdownRenderer.render(
                this.app,
                line.text,
                text,
                path,
                component,
            )
        }

        return lineEl
    }

    public abstract parse(
        content: string,
        container: HTMLDivElement,
        path: string,
        component: Component,
    ): Promise<void>
}

export class LyricsParser extends Parser {
    private PARSERS: Parser[]

    public match(content: string): number {
        let parser = this.resolveParser(content)
        return parser[1]
    }

    constructor(app: App) {
        super(app)
        this.PARSERS = [new LrcParser(app), new SrtParser(app)]
    }

    public async parse(
        content: string,
        container: HTMLDivElement,
        path: string,
        component: Component,
    ) {
        let parser = this.resolveParser(content)
        if (parser[0]) {
            parser[0].parse(content, container, path, component)
        }
    }

    private resolveParser(content: string): [Parser | undefined, number] {
        let max = 0
        let parser
        for (let p of this.PARSERS) {
            let m = p.match(content)
            if (m > max) {
                max = m
                parser = p
            }
        }

        return [parser, max]
    }
}

export class LrcParser extends Parser {
    static readonly LRC_SPLITTER = /\[(((\d+):)?(\d+):(\d+(\.\d+)?))\]/g

    constructor(app: App) {
        super(app)
    }

    public match(content: string): number {
        const s = content.split(LrcParser.LRC_SPLITTER)
        s.shift()
        return chunk(s, 7).length
    }

    public async parse(
        content: string,
        container: HTMLDivElement,
        path: string,
        component: Component,
    ) {
        let s = content.split(LrcParser.LRC_SPLITTER)
        if (s.length > 0) {
            let rowCount = 2
            let head = s.shift()
            if (head) {
                rowCount += head.split(/\r?\n/g).length - 1
                await MarkdownRenderer.render(
                    this.app,
                    head,
                    container,
                    path,
                    component,
                )
            }
            let lines = chunk(s, 7)

            let mdEl: HTMLSpanElement[] = await Promise.all(
                lines.map(async (parts, index) => {
                    let lrcLine = this.parseLrc(parts)
                    let r = this.renderLine(
                        container,
                        lrcLine,
                        rowCount,
                        path,
                        component,
                    )
                    rowCount += lrcLine.rows
                    return r
                }),
            )

            container.append(...mdEl)
        }
    }

    private parseLrc(parts: string[]): LyricsLine {
        const lrc: LyricsLine = { ...DEFAULT_LRC }

        try {
            let hours = parts[2] ? parseInt(parts[2], 10) : 0
            let minutes = parts[3] ? parseInt(parts[3], 10) : 0
            let seconds = parts[4] ? parseFloat(parts[4]) : 0

            const timestamp = hours * 3600 + minutes * 60 + seconds

            const inMin = Math.floor(timestamp / 60)
            const inSec = Math.floor(timestamp % 60)

            const minStr = inMin < 10 ? `0${inMin}` : `${inMin}`
            const secStr = inSec < 10 ? `0${inSec}` : `${inSec}`
            const text = parts[6] ? parts[6].trim() : ''
            let rows = parts[6].split(/\r?\n/g).length - 1
            return {
                timestamp: timestamp * 1000,
                timestr: `${minStr}:${secStr}`, //normalize the time string
                text,
                rows,
            }
        } catch {
            return lrc
        }
    }
}

export default class SrtParser extends Parser {
    static readonly SRT_SPLITTER =
        /(\d+)\r?\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/g

    constructor(app: App) {
        super(app)
    }

    public match(content: string): number {
        const match = content.split(SrtParser.SRT_SPLITTER)
        match.shift()
        return chunk(match, 4).length
    }

    private parseTime(timestamp: string): number[] {
        const regex = /(\d+):(\d{2}):(\d{2}),(\d{3})/
        const parts = regex.exec(timestamp)
        const t: number[] = []

        if (parts === null) {
            return [0, 0, 0, 0]
        }

        for (var i = 1; i < 5; i++) {
            let p = parseInt(parts[i], 10)
            t.push(p ? p : 0)
        }

        // hours + minutes + seconds + ms
        return t
    }

    public async parse(
        content: string,
        container: HTMLDivElement,
        path: string,
        component: Component,
    ) {
        if (content.length > 0) {
            let blocks = content.split(SrtParser.SRT_SPLITTER)

            let rowCount = 2
            let head = blocks.shift()
            if (head) {
                rowCount += head.split(/\r?\n/g).length - 1
                await MarkdownRenderer.render(
                    this.app,
                    head,
                    container,
                    path,
                    component,
                )
            }

            if (blocks.length > 0) {
                let mdEl = await Promise.all(
                    chunk(blocks, 4).map((parts, index) => {
                        let t = this.parseTime(parts[1].trim())
                        let min = t[0] * 60 + t[1]
                        let sec = t[2]
                        let minStr = min < 10 ? `0${min}` : `${min}`
                        let secStr = sec < 10 ? `0${sec}` : `${sec}`
                        let line: LyricsLine = {
                            timestamp:
                                t[0] * 3600000 +
                                t[1] * 60000 +
                                t[2] * 1000 +
                                t[3],
                            timestr: `${minStr}:${secStr}`,
                            text: parts[3] ? parts[3].trim() : '',
                            rows: parts[3].split(/\r?\n/g).length - 2,
                        } as LyricsLine
                        rowCount += 2
                        let r = this.renderLine(
                            container,
                            line,
                            rowCount,
                            path,
                            component,
                        )
                        rowCount += line.rows

                        return r
                    }),
                )
                container.append(...mdEl)
            }
        }
    }
}
