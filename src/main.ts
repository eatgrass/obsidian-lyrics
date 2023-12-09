import LyricsMarkdownRender from 'LyricsMarkdownRender'
import LyricsSettings, { DEFAULT_SETTINGS, type Settings } from 'Settings'
import { Plugin, type MarkdownPostProcessorContext, EditorSuggest } from 'obsidian'

export default class LyricsPlugin extends Plugin {
    private settings?: LyricsSettings

    public getSettings(): Settings {
        return this.settings?.getSettings() || DEFAULT_SETTINGS
    }

    async onload() {
        const settings = await this.loadData()
        this.settings = new LyricsSettings(this, settings)
        this.addSettingTab(this.settings)

        this.registerMarkdownCodeBlockProcessor(
            'lrc',
            (
                source: string,
                element: HTMLElement,
                context: MarkdownPostProcessorContext,
            ) => {
                context.addChild(
                    new LyricsMarkdownRender(this, source, element, context),
                )
            },
        )
    }
}
