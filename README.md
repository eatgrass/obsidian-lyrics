## Screenshot

![Screen Recording 2023-12-05 at 14 29 53](https://github.com/eatgrass/obsidian-lyric/assets/2351076/264918e6-ef45-483a-8f7b-98bc1f897f24)

## Description

Enhance your audio player by adding a interactive lyrics display feature.  
Now you can navigate through the player using the lyrics for a more engaging and organized listening experience.
It allows you to seamlessly review your audio notes and highlights.

## Usage

### Installation

Obsidian Community Plugins

`obsidian://show-plugin?id=lyrics`

### Basic

Include an audio source and [.lrc format](<https://en.wikipedia.org/wiki/LRC_(file_format)>) lyrics in the `lrc` code block.  
You can specify the source of the audio file either as a filepath or as an internal link.

1. Using an internal link source:

<pre>
```lrc
source [[audio_file.mp3]]
[00:01.00] your .lrc format contents
[00:02.00] ....
```
</pre>

2. Using a filepath source:

<pre>
```lrc
source path/to/your_audio_file.mp3
[00:01.00] your .lrc format contents
[00:02.00] ....
```
</pre>

### Context Menu

In the `Reading View`, right-click on the area where lyrics are displayed to use context menu.

-   play/pause audio player
-   toggle auto-scroll
-   toggle sentence mode
-   seek
-   edit

## Styling

Customize your own styles by utilizing the CSS classes provided below.

```html
<span class="lyrics-line" data-lyid="36" data-time="84160">
	<span class="lyrics-timestamp" data-lyid="36" data-time="84160">01:24</span>
	<p>Happy birthday.</p>
</span>
```

-   `.lyrics-line`: the entire lyrics line.
-   `.lyrics-line .lyrics-timestamp`: timestamp of the lyrics.
-   `.lyrics-line p`: text content of the lyrics.
-   `.lyrics-highlighted`: mark the current highlighted lyrics.

---

[<img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="BuyMeACoffee" width="100">](https://www.buymeacoffee.com/eatgrass)
