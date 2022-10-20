const font1 = 'Rodenh Bold';
const font2 = 'Rodenh Interpolated Bold';

class FontCompare {
  constructor(font1, font2) {
    this.font1 = font1;
    this.font2 = font2;
    this.backgroundColor = '#fff';
    this.fillColor = '#000';
    this.fontSize = 500;
    this.workingCanvas = document.getElementById('canvas');
    this.previewCanvas = document.querySelector('canvas.preview');
    this.event = new Event('fontcompare');
    this.canvasSize = this.fontSize * 2;

    const contextSettings = {
      alpha: false,
      desynchronized: true,
      willReadFrequently: true
    };

    [this.workingCanvas, this.previewCanvas].forEach(c => {
      c.width = this.canvasSize;
      c.height = this.canvasSize;
    });

    this.workingContext = this.workingCanvas.getContext('2d', contextSettings);
    this.previewContext = this.previewCanvas.getContext('2d', contextSettings);

    this.workingContext.textAlign = 'center';
    this.workingContext.textRendering = 'geometricPrecision';

    window.addEventListener('fontcompare', this.displayResults.bind(this));

    document.querySelector('.results').addEventListener('click', this.resultsRowClick.bind(this));

    this.init();
  }

  init() {
    this.rankDifferences(
      'ABCDEFGHIJKLMNOPQRSTUVWXYZBabcdefghijklmnopqrstuvwxyz1234567890'
    );
  }

  resetContext(context = this.workingContext) {
    context.fillStyle = this.backgroundColor;
    context.fillRect(0, 0, this.workingCanvas.width, this.workingCanvas.height);
    context.fillStyle = this.fillColor;
  }

  renderString(str, font, context = this.workingContext, reset = true) {
    const posX = Math.floor(this.fontSize);
    const posY = Math.floor(this.fontSize * 1.5);
    context.font = `${this.fontSize}px ${font}`;
    context.fillText(str, posX, posY);
    const bitmap = createImageBitmap(this.workingCanvas);

    if (reset) {
      this.resetContext();
    }

    return bitmap;
  }

  getDiff(images) {
    this.workingContext.drawImage(images[0], 0, 0);
    this.workingContext.globalCompositeOperation = 'difference';
    this.workingContext.drawImage(images[1], 0, 0);
    this.workingContext.globalCompositeOperation = 'source-over';
    const data = this.workingContext.getImageData(
      0,
      0,
      this.workingCanvas.width,
      this.workingCanvas.height
    );
    return new Uint8ClampedArray(data.data);
  }

  calculateDifference(char) {
    this.resetContext();
    return Promise.all([
      this.renderString(char, this.font1),
      this.renderString(char, this.font2)
    ]).then((images) => {
      const imageData = this.getDiff(images);
      const length = imageData.length;
      let difference = 0;

      for (let i = 0; i < length; i += 4) {
        difference += (imageData[i] / 255) * (imageData[i + 3] / 255);
      }

      return {
        char: char,
        diffImage: imageData,
        difference: difference,
        images: images
      };
    });
  }

  rankDifferences(chars) {
    return Promise.all(
      chars.split('').map((char) => this.calculateDifference(char))
    ).then((results) => {
      this.results = results.sort((a, b) => b.difference - a.difference);
      window.dispatchEvent(this.event);
    });
  }

  displayResults() {
    const r = this.results;
    const resultsEl = document.querySelector('.results');
    resultsEl.innerHTML =
      '<table><thead><tr><th>Character</th><th>Difference</th></tr></thead><tbody></tbody></table>';
    const tbody = resultsEl.querySelector('tbody');
    const length = this.results.length;
    for (let i = 0; i < length; i++) {
      const row = document.createElement('tr');
      row.dataset.rank = i + 1;
      row.innerHTML = `<td>${r[i].char}</td><td>${r[i].difference
        }</td>`;
      tbody.appendChild(row);
    }
  }

  displayPreview(i) {
    const result = this.results[i];
    const diffImage = new ImageData(result.diffImage, this.canvasSize, this.canvasSize);
    this.resetContext(this.previewContext);
    this.previewContext.fillStyle = 'rgba(255, 0, 0, 0.5)';
    this.renderString(result.char, this.font1, this.previewContext, false);
    this.previewContext.fillStyle = 'rgba(0, 0, 255, 0.25) ';
    this.renderString(result.char, this.font2, this.previewContext, false);
  }

  resultsRowClick(e) {
    const row = e.target.closest('tr');

    if (!row || !row.dataset.rank) {
      return;
    }

    this.displayPreview(row.dataset.rank - 1);
  }
}

new FontCompare(font1, font2);
