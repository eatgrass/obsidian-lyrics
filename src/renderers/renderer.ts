import { MarkdownRenderer, type App, type Component } from 'obsidian'
import chunk from 'lodash/chunk'

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

export abstract class AbstractLyricsRenderer {
    protected app: App

    protected chunk = chunk

    constructor(app: App) {
        this.app = app
    }

    public abstract match(content: string): number

    protected async renderLine(
        container: HTMLDivElement,
        line: LyricsLine,
        from: number,
        to: number,
        path: string,
        component: Component,
    ): Promise<HTMLElement> {
        const lineEl = container.createSpan()

        if (line) {
            lineEl.addClass('lyrics-line')
            lineEl.dataset.offset = `${from},${to}`
            const timeEl = lineEl.createSpan()
            timeEl.setText(line.timestr || '')
            timeEl.addClass('lyrics-timestamp')
            timeEl.dataset.offset = `${from},${to}`
            if (line.timestamp !== undefined) {
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

            const mark = lineEl.find('mark')
            lineEl.dataset.mark = mark ? 'true' : 'false'
        }

        return lineEl
    }

    public abstract render(
        content: string,
        container: HTMLDivElement,
        path: string,
        component: Component,
    ): Promise<void>
}
