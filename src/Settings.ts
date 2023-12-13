import { PluginSettingTab, Setting } from 'obsidian'
import LyrcisPlugin from 'main'

export interface Settings {
    autoScroll: boolean
    sentenceMode: boolean
}
export const DEFAULT_SETTINGS: Settings = {
    autoScroll: true,
    sentenceMode: false,
}

export default class LyricsSettings extends PluginSettingTab {
    private settings: Settings
    private plugin: LyrcisPlugin

    constructor(plugin: LyrcisPlugin, settings: Settings) {
        super(plugin.app, plugin)
        this.plugin = plugin
        this.settings = settings
    }

    public async updateSettings(newSettings: Partial<Settings>) {
        this.settings = { ...this.settings, ...newSettings }
        await this.plugin.saveData(this.settings)
    }

    public display() {
        const { containerEl } = this
        containerEl.empty()

        new Setting(containerEl)
            .setName('Auto scroll')
            .setDesc('Whether enable auto-scroll by default')
            .addToggle((toggle) => {
                toggle.setValue(this.settings.autoScroll)
                toggle.onChange((value) => {
                    this.updateSettings({ autoScroll: value })
                })
            })

        new Setting(containerEl)
            .setName('Sentence mode')
            .setDesc('Whether enable sentence mode by default')
            .addToggle((toggle) => {
                toggle.setValue(this.settings.sentenceMode)
                toggle.onChange((value) => {
                    this.updateSettings({ sentenceMode: value })
                })
            })
    }

    public getSettings(): Settings {
        return this.settings
    }
}
