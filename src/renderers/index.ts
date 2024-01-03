import { type App, type Component } from 'obsidian'
import { AbstractLyricsRenderer } from 'renderers/renderer'
import LrcRenderer from './lrc'
import SrtRenderer from './srt'

export default class LyricsRenderer extends AbstractLyricsRenderer {
    private PARSERS: AbstractLyricsRenderer[]

    public match(content: string): number {
        let parser = this.resolveParser(content)
        return parser[1]
    }

    constructor(app: App) {
        super(app)
        this.PARSERS = [new LrcRenderer(app), new SrtRenderer(app)]
    }

    public async render(
        content: string,
        container: HTMLDivElement,
        path: string,
        component: Component,
    ) {
        let parser = this.resolveParser(content)
        if (parser[0]) {
            parser[0].render(content, container, path, component)
        }
    }

    private resolveParser(
        content: string,
    ): [AbstractLyricsRenderer | undefined, number] {
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
