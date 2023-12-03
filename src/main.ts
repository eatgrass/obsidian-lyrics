import LyricsMarkdownRender from 'LyricsMarkdownRender'
import { Plugin, type MarkdownPostProcessorContext } from 'obsidian'

export default class PomodoroTimerPlugin extends Plugin {
    async onload() {
        this.registerMarkdownCodeBlockProcessor(
            'lyrics',
            (
                source: string,
                element: HTMLElement,
                context: MarkdownPostProcessorContext,
            ) => {
                context.addChild(
                    new LyricsMarkdownRender(this.app, source, element),
                )
            },
        )
    }
}
