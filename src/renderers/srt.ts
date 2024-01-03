import { MarkdownRenderer, type Component } from 'obsidian'
import { AbstractLyricsRenderer, type LyricsLine } from 'renderers/renderer'

export default class SrtRenderer extends AbstractLyricsRenderer {
    static readonly SRT_SPLITTER =
        /(\d+)\r?\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/g

    public match(content: string): number {
        const match = content.split(SrtRenderer.SRT_SPLITTER)
        match.shift()
        return this.chunk(match, 4).length
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

        return t
    }

    public async render(
        content: string,
        container: HTMLDivElement,
        path: string,
        component: Component,
    ) {
        if (content.length > 0) {
            let blocks = content.split(SrtRenderer.SRT_SPLITTER)
            let from = 0
            let head = blocks.shift()
            if (head) {
                from += head.split(/\r?\n/g).length - 1
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
                    this.chunk(blocks, 4).map((parts) => {
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
                        // from += 2
                        let to = from + line.rows + 1
                        let r = this.renderLine(
                            container,
                            line,
                            from,
                            to,
                            path,
                            component,
                        )
                        from = to + 1
                        return r
                    }),
                )
                container.append(...mdEl)
            }
        }
    }
}
