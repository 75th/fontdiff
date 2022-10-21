# Font Compare

Ranks given characters by how different they are in two given fonts.

Give it a string and two fonts installed on your system, and it will show you which characters have the most differences. Click a table row to get a visual preview.

## What do the numbers mean?

It's the number of pixels in the difference. Draw one letter, draw the other letter with the Difference blend mode, count the white pixels. Gray antialiasing pixels count for less than a full pixel based on their lightness. (This is calculated linearly; it probably shouldn't be, but it seems to work well enough.)

## TODO

- UI for font names and string
- Better layout/appearance
- Calculate differences by percentage rather than absolute quantity of pixels. Plan is to calculate it as

    ```[pixels in the diff] / [pixels in the union of the two characters]```

- Normalize by width/height of a given character
- Customizable preview colors
- Trim images instead of always using the entire canvas
	- Option to ignore sidebearings
- Set up as GitHub Pages thingy
- Migrate to some NodeJS build abomination instead of the wonderful CodeKit if this gets sufficient attention to warrant it (unlikely)
