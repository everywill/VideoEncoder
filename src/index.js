import { loadWasm } from "../loadwasm.js";
import x264 from '../x264.js';

const convertToYUVPlane = (frame) => {
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

export class XVideoEncoder {
    get encodeQueueSize() {
        console.error('unimplemented!');
    }

    get state() {
        return this._state;
    }

    constructor(init) {
        const { output, error } = init;
        if(!output) {
            throw `Failed to construct 'VideoEncoder': Failed to read the 'output' property from 'VideoEncoderInit'`;
        }
        if(!error) {
            throw `Failed to construct 'VideoEncoder': Failed to read the 'error' property from 'VideoEncoderInit'`;
        }
        this.h264_error = error;
        this._state = 'unconfigured';
        this._n = loadWasm('/X264.wasm')
            .then(wasmBinary => x264({
                instantiateWasm: (imports, successCallback) => {
                    imports.env.h264_write_polyfill = (ptr, number) => {
                        output({
                            copyTo: (dest) => {
                                const l = dest.length;
                                for(let i = 0; i < l; i++) {
                                    dest[i] = this._m.HEAPU8[ptr + i];
                                }
                            },
                            byteLength: number,
                        }, {});
                    };
                    WebAssembly.instantiate(new Uint8Array(wasmBinary), imports)
                        .then(function(output) {
                            successCallback(output.instance);
                        });
                }
            })).then(module => {
                this._m = module;
                this.encoder = new this._m.X264Encoder();
            })
    }

    configure(config) {
        this._state = 'configured';
        this._width = config.width;
        this._height = config.height;
        return this._n.then(() => {
            this.encoder.configure(this._width, this._height);
        });
    }

    encode(frame, options) {
        if(this._state === 'unconfigured') {
            throw `Failed to execute 'encode' on 'VideoEncoder': Cannot call 'encode' on an unconfigured codec.`
        }
        if(!frame instanceof XVideoFrame) {

        }

        const yuv = convertToYUVPlane(frame);
        const yuvPtr = this._m._malloc(yuv.byteLength);
        this._m.HEAPU8.set(yuv, yuvPtr);
        this.encoder.encode(yuvPtr);
        this._m._free(yuvPtr);
    }

    flush() {
        this.encoder.flush();
    }

    close() {
        this._state = 'closed';
        this.encoder.close();
    }
}

export class XVideoFrame {
    constructor(data, init) {
        this._convert(data, init);
        if(!this.data) {
            throw `Failed to construct 'VideoFrame': The provided value is not of type '(HTMLCanvasElement or VideoFrame)`;
        }
    }

    _convert(data, init) {
        if(data instanceof ArrayBuffer) {
            this.data = data;
            this.width = init.codedWidth;
            this.height = init.codedHeight;
        } else if(data instanceof HTMLCanvasElement) {
            const ctx = data.getContext("2d", {});
            const imagedata = ctx.getImageData(0, 0, data.width, data.height);
            this.data = imagedata.data;
            this.width = imagedata.width;
            this.height = imagedata.height;
        }
    }
    close() {}
}
