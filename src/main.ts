import LyricsMarkdownRender from 'LyricsMarkdownRender'
import LyricsSettings, { DEFAULT_SETTINGS, type Settings } from 'Settings'
import { Plugin, type MarkdownPostProcessorContext } from 'obsidian'

export default class LyricsPlugin extends Plugin {
    private settings?: LyricsSettings

    public getSettings(): Settings {
        return this.settings?.getSettings() || DEFAULT_SETTINGS
    }

    public updateSettings(newSettings: Partial<Settings>) {
        this.settings?.updateSettings(newSettings)
    }

    async onload() {
        const settings = { ...DEFAULT_SETTINGS, ...(await this.loadData()) }
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
        ).sortOrder = -1000
    }
}
