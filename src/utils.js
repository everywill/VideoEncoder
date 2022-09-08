export function loadWasm(url) {
    return new Promise(function(resolve, reject) {
        const wasmXHR = new XMLHttpRequest();
        wasmXHR.open('GET', url, true);
        wasmXHR.responseType = 'arraybuffer';
        wasmXHR.onload = function() { resolve(wasmXHR.response); }
        wasmXHR.onerror = function() { reject('error '  + wasmXHR.status); }
        wasmXHR.send(null);
    });
}

export const convertToYUVPlane = (frame) => {
    const uin8 = frame.data;
    const width = frame.width;
    const height = frame.height;
    const size = width * height;

    const yuv = new Uint8Array(size + (size >> 1));
    let r, g, b;
    let i = 0;
    let upos = size;
    let vpos = size + (size >> 2);

    for( let line = 0; line < height; ++line ) {
      if( !(line % 2) ) {
        for( let x = 0; x < width; x += 2 ) {
          r = uin8[4 * i];
          g = uin8[4 * i + 1];
          b = uin8[4 * i + 2];

          yuv[i++] = ((66*r + 129*g + 25*b) >> 8) + 16;
          yuv[upos++] = ((-38*r + -74*g + 112*b) >> 8) + 128;
          yuv[vpos++] = ((112*r + -94*g + -18*b) >> 8) + 128;

          r = uin8[4 * i];
          g = uin8[4 * i + 1];
          b = uin8[4 * i + 2];

          yuv[i++] = ((66*r + 129*g + 25*b) >> 8) + 16;
        }
      } else {
        for( let x = 0; x < width; x += 1 ) {
          r = uin8[4 * i];
          g = uin8[4 * i + 1];
          b = uin8[4 * i + 2];

          yuv[i++] = ((66*r + 129*g + 25*b) >> 8) + 16;
        }
      }
    }

    return yuv;
}