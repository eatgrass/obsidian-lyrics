import { chunk } from "lodash"
import { MarkdownRenderer, type App, type Component } from "obsidian"
import { DEFAULT_LRC, type LyricsLine, Parser } from "parsers/parser"

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
