class FontCompare {
  constructor() {
    // Settings common to most CanvasRenderingContext2d objects we'll deal with.
    const contextSettings = {
      alpha: false,
      desynchronized: true,
      willReadFrequently: true
    };

    // Default things that don't change.
    this.font1input = document.querySelector('input[name=font1]');
    this.font2input = document.querySelector('input[name=font2]');
    this.backgroundColor = '#fff';
    this.fillColor = '#000';
    this.fontSize = 500;

    // List of canvas elements in use.
    this.canvases = new Map([
      ['working', document.createElement('canvas')],
      ['preview', document.querySelector('.preview canvas')],
      ['transparent', document.createElement('canvas')]
    ]);

    // Get 2D rendering contexts for each canvas. Can't just loop over canvases
    // because some have different settings.
    this.contexts = new Map([
      ['working', this.canvases.get('working').getContext('2d', contextSettings)],
      ['preview', this.canvases.get('preview').getContext('2d', contextSettings)],
      ['transparent', this.canvases.get('transparent').getContext('2d', {
        ...contextSettings,
        alpha: true
      })]
    ])

    // Need a custom event to break out of async hell.
    this.event = new Event('fontcompare');

    // This could be more mathematically rigorous but it will do for now.
    this.canvasSize = this.fontSize * 2;

    // For debouncing text field change events.
    this.timeout = 0;

    // Button to swap the fonts.
    this.swapButton = document.querySelector('.fonts-and-colors button');

    // Set all canvases to common width/height.
    this.canvases.forEach(
      c => {
        c.width = this.canvasSize;
        c.height = this.canvasSize;
      },
      this
    );

    // Set all contexts to common settings, then wipe them clean for their
    // individual definitions of "clean".
    this.contexts.forEach(
      c => {
        c.textAlign = 'center';
        c.textRendering = 'geometricPrecision';
        this.resetContext(c);
      },
      this
    );

    // Display the results once all the calculations are finished.
    window.addEventListener('fontcompare', this.displayResults.bind(this));

    // Delegated click handler on results table rows.
    document.querySelector('.results').addEventListener('click', this.resultsRowClick.bind(this));

    // Startup tasks for every run.
    this.init();

    const onFontChange = this.onFontChange.bind(this);

    // Attach change events to text inputs, and click event to swap button.
    this.font1input.addEventListener('change', onFontChange);
    this.font2input.addEventListener('change', onFontChange);
    this.swapButton.addEventListener('click', this.swapFonts.bind(this));
  }

  /**
   * Startup tasks for every run.
   */
  init() {
    this.font1 = this.font1input.value;
    this.font2 = this.font2input.value;

    this.rankDifferences(
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890'
    ).then(() => {
      this.restorePreview();
      document.querySelector(`[data-rank='1']`).click();
    });
  }

  /**
   * Display a preview of the currently selected glyph.
   */
  restorePreview() {
    if (this.canvases.get('preview').dataset.currentIndex) {
      this.displayPreview(this.canvases.get('preview').dataset.currentIndex);
    }
  }

  /**
   * Event handler for font selection.
   */
  onFontChange() {
    window.clearTimeout(this.timeout);

    this.timeout = window.setTimeout(this.init.bind(this), 1000);
  }

  /**
   * Swap the selected fonts.
   *
   * @todo Does not work!
   */
  swapFonts() {
    const originalFont1 = this.font1input.value;
    const originalFont2 = this.font2input.value;
    const length = this.results.length;
    this.font1input.value = originalFont2;
    this.font2input.value = originalFont1;

    for (let i = 0; i < length; i++) {
      this.results[i].images.reverse();
    }

    this.restorePreview();
  }

  /**
   * Wipes a canvas rendering context.
   *
   * @param {CanvasRenderingContext2D} context
   *   The rendering context to clear.
   */
  resetContext(context = this.contexts.get('working')) {
    context.fillStyle = this.backgroundColor;
    context.fillRect(0, 0, this.canvases.get('working').width, this.canvases.get('working').height);
    context.fillStyle = this.fillColor;
  }

  /**
   * Renders a string to a CanvasRenderingContext2D in a given font.
   *
   * @param {string} str String to render.
   * @param {string} font Font name for rendering context's `font` property.
   * @param {CanvasRenderingContext2D} context Context onto which to render the string.
   * @param {boolean} reset Reset context after rendering string? False when rendering previews.
   * @returns {ImageBitmap} Bitmap of rendered string.
   */
  renderString(str, font, context = this.contexts.get('working'), reset = true) {
    const posX = Math.floor(this.fontSize);
    const posY = Math.floor(this.fontSize * 1.5);
    context.font = `${this.fontSize}px ${font}`;
    context.fillText(str, posX, posY);
    const bitmap = createImageBitmap(this.canvases.get('working'));

    if (reset) {
      this.resetContext();
    }

    return bitmap;
  }

  /**
   *
   * @param {array<ImageBitmap>} images Two bitmaps to compare.
   * @returns {Uint8ClampedArray} Diff of images.
   */
  getDiff(images) {
    const c = this.contexts.get('working');
    // Draw one image.
    c.drawImage(images[0], 0, 0);

    // Draw the other image with the difference blend mode.
    c.globalCompositeOperation = 'difference';
    c.drawImage(images[1], 0, 0);

    // Unset the difference blend mode.
    c.globalCompositeOperation = 'source-over';

    // Get pixel data from the diff image.
    const data = c.getImageData(
      0,
      0,
      this.canvases.get('working').width,
      this.canvases.get('working').height
    );

    // Return a copy of the pixel data.
    return new Uint8ClampedArray(data.data);
  }

  /**
   * Get a union of the string in two fonts, instead of the difference, for
   * percentage-based ranking.
   *
   * @param {array<ImageBitmap>} images Two bitmaps to combine.
   * @todo Implement.
   */
  getUnion(images) {
    const c = this.contexts.get('working');
  }

  /**
   * Calculate a string's difference between two fonts.
   * @param {string} char String whose difference to calculate.
   * @returns
   */
  async calculateDifference(char) {
    this.resetContext();
    const images = await Promise.all([
      this.renderString(char, this.font1),
      this.renderString(char, this.font2)
    ]);
    // Get a Uint8ClampedArray representing the pixel data.
    const imageData = this.getDiff(images);
    const length = imageData.length;
    let difference = 0;
    // Every four elements of the Uint8ClampedArray represent the R, G, B, and
    // A channels of a pixel.
    for (let i = 0; i < length; i += 4) {
      // We're rendering black text, so we need only read the values of one of
      // the channels, but we multiply by the alpha channel so we don't give
      // too much credit to antialiasing pixels.
      difference += (imageData[i] / 255) * (imageData[i + 3] / 255);
    }
    return {
      char: char,
      diffImage: imageData,
      difference: difference,
      images: images // The individual images for rendering
    };
  }

  // FIXME
  getImageInColor(image, color) {
    this.resetContext();
  }

  /**
   * Rank the differences between the two fonts for every character to be
   * compared.
   *
   * @param {string} chars String containing all individual characters to
   * compare.
   */
  async rankDifferences(chars) {
    // Calculate the font differences for every character...
    const results = await Promise.all(
      chars.split('').map((char) => this.calculateDifference(char))
    );

    // ...then sort them by difference level from highest to lowest, and
    // trigger the custom event.
    this.results = results.sort((a, b) => b.difference - a.difference);
    window.dispatchEvent(this.event);
  }

  /**
   * Display the results table.
   */
  displayResults() {
    // Short variable name for template strings later.
    const r = this.results;
    const resultsEl = document.querySelector('.results');

    // Reset the results element to a new table with header only.
    resultsEl.innerHTML =
      '<table><thead><tr><th>Character</th><th>Difference</th></tr></thead><tbody></tbody></table>';
    const tbody = resultsEl.querySelector('tbody');
    const length = this.results.length;

    // Write a new table row for each result.
    for (let i = 0; i < length; i++) {
      const row = document.createElement('tr');
      row.dataset.rank = i + 1;
      row.innerHTML = `<td>${r[i].char}</td><td>${r[i].difference
        }</td>`;
      tbody.appendChild(row);
    }
  }

  /**
   * Render the preview of a character.
   *
   * @param {int} i Index of the result to display.
   */
  displayPreview(i) {
    const result = this.results[i];
    const previewContext = this.contexts.get('preview');
    this.resetContext(previewContext);
    previewContext.fillStyle = 'rgba(255, 0, 0, 0.5)';
    this.renderString(result.char, this.font1, previewContext, false);
    previewContext.fillStyle = 'rgba(0, 0, 255, 0.25)';
    this.renderString(result.char, this.font2, previewContext, false);
    this.canvases.get('preview').dataset.currentIndex = i;
  }

  /**
   *
   * @param {MouseEvent} e Click event being handled.
   * @returns {void}
   */
  resultsRowClick(e) {
    const row = e.target.closest('tr');

    if (!row || !row.dataset.rank) {
      return;
    }

    this.displayPreview(row.dataset.rank - 1);
  }
}

new FontCompare();
