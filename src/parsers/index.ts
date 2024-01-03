import { type App, type Component } from 'obsidian'
import { Parser } from 'parsers/parser'
import { LrcParser } from './lrc'
import SrtParser from './srt'

export default class LyricsParser extends Parser {
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
