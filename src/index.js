import { loadWasm, convertToYUVPlane } from './utils.js';
import x264_encoder from '../bin/webassembly_Release/X264Encoder.js';

class WasmLoader {
    module
    h264_error
    h264_output

    async LoadWasm() {
       return loadWasm(this.wasmUrl)
            .then(wasmBinary => x264_encoder({
                instantiateWasm: (imports, successCallback) => {
                    imports.env.h264_write_polyfill = (ptr, number) => {
                        this.h264_output({
                            copyTo: (dest) => {
                                const l = dest.length;
                                for(let i = 0; i < l; i++) {
                                    dest[i] = this.module.HEAPU8[ptr + i];
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
                this.module = module;
                return this.module;
            });
    }
}
const encoderWasmLoader = new WasmLoader();

export class XVideoEncoder {
    get encodeQueueSize() {
        console.error('unimplemented!');
    }

    get state() {
        return this._state;
    }

    constructor(init) {
        const { output, error, wasmUrl } = init;
        if(!output) {
            throw `Failed to construct 'VideoEncoder': Failed to read the 'output' property from 'VideoEncoderInit'`;
        }
        if(!error) {
            throw `Failed to construct 'VideoEncoder': Failed to read the 'error' property from 'VideoEncoderInit'`;
        }
        this.wasmCtx = encoderWasmLoader;
        this.wasmCtx.wasmUrl = wasmUrl;
        this.wasmCtx.h264_error = error;
        this.wasmCtx.h264_output = output;
        this._state = 'unconfigured';
        this._n = this._initialize();
    }

    _initialize() {
        return this.wasmCtx.LoadWasm();
    }

    async configure(config) {
        this._width = config.width;
        this._height = config.height;
        await this._n;
        this.encoder = new this.wasmCtx.module.X264Encoder();
        this.encoder.configure(this._width, this._height);
        this._state = 'configured';
    }

    encode(frame, options) {
        if(this._state === 'unconfigured') {
            throw `Failed to execute 'encode' on 'VideoEncoder': Cannot call 'encode' on an unconfigured codec.`
        }
        if(!frame instanceof XVideoFrame) {
            throw ''
        }

        const yuv = convertToYUVPlane(frame);
        const yuvPtr = this.wasmCtx.module._malloc(yuv.byteLength);
        this.wasmCtx.module.HEAPU8.set(yuv, yuvPtr);
        this.encoder.encode(yuvPtr);
        this.wasmCtx.module._free(yuvPtr);
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
