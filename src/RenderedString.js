export default class RenderedString {
  constructor(string, font, fontSize, renderingContext) {
    this.string = string;
    this.font = font;
    const posX = Math.floor(fontSize);
    const posY = Math.floor(fontSize * 1.5);
    const canvas = renderingContext.canvas;
    renderingContext.font = `${this.fontSize}px ${font}`;
    renderingContext.fillText(str, posX, posY);
    this.fullImageData = renderingContext.getImageData(0, 0, canvas.width, canvas.height);

    this.trimImageData(this.fullImageData);

    return this;
  }

  trimImageData(fullImageData) {
    const fullImageDataByPixel = fullImageData.reduce(
      (cumulative, currentChannel) => {
        const currentPixel = cumulative[cumulative.length - 1];

        if (currentPixel.length === 0) {

        }
      },
      [[]]
    );
  }


}
