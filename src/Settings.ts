import { PluginSettingTab, Setting } from 'obsidian'
import LyrcisPlugin from 'main'

export interface Settings {
    autoScroll: boolean
}
export const DEFAULT_SETTINGS: Settings = {
    autoScroll: true,
}

export default class LyricsSettings extends PluginSettingTab {
    private settings: Settings
    private plugin: LyrcisPlugin

    // private plugin: LyrcisPlugin

    constructor(plugin: LyrcisPlugin, settings: Settings) {
        super(plugin.app, plugin)
        this.plugin = plugin
        this.settings = settings
    }

    public updateSettings(newSettings: Partial<Settings>) {
        this.settings = { ...DEFAULT_SETTINGS, ...newSettings }
        this.plugin.saveData(this.settings)
    }

    public display() {
        const { containerEl } = this
        new Setting(containerEl).setName('Auto scroll').addToggle((toggle) => {
            toggle.setValue(this.settings.autoScroll)
            toggle.onChange((value) => {
                this.updateSettings({ autoScroll: value })
            })
        })
    }

    public getSettings(): Settings {
        return this.settings
    }
}
