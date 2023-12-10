## Screenshot

![Screen Recording 2023-12-05 at 14 29 53](https://github.com/eatgrass/obsidian-lyric/assets/2351076/264918e6-ef45-483a-8f7b-98bc1f897f24)

## Description

Enhance your audio player by adding a interactive lyrics display feature.  
Now you can navigate through the player using the lyrics for a more engaging and organized listening experience.
It allows you to seamlessly review your audio notes and highlights.

## Usage

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

- play/pause audio player
- toggle auto-scroll 
- toggle sentence mode
- seek
- edit

## Styling

Customize your own styles by utilizing the CSS classes provided below.
```html
<span class="lyrics-wrapper lyrics-highlighted" >
    <span data-lyid="35" data-time="538120" class="lyrics-timestamp">08:58</span>
    <span class="lyrics-text">
        Lyrics Text ...
    </span >
</span>
```
-  `lyrics-wrapper`: the entire lyrics line.
- `lyrics-timestamp`: timestamp of the lyrics.
- `lyrics-text`: text content of the lyrics.
- `lyrics-highlighted`: mark the current highlighted lyrics.

---

[![coffee](https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=%E2%98%95&slug=eatgrass&button_colour=FFDD00&font_colour=000000&font_family=Comic&outline_colour=000000&coffee_colour=ffffff)](https://www.buymeacoffee.com/eatgrass)
