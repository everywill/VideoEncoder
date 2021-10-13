#include <stdint.h>
#include <x264.h>
#include <stdlib.h>
#include <emscripten/bind.h>
#include <emscripten.h>

using namespace emscripten;

extern "C" {
  extern void h264_write_polyfill(int val, int size);
  EMSCRIPTEN_KEEPALIVE
  void h264_write(uint8_t* payload, int size) {
    h264_write_polyfill((int) payload, size);
  }
}

class X264Encoder {
    public:
        X264Encoder() {}

        int configure(int w, int heig) {
            width = w;
            height = heig;

            if( x264_param_default_preset( &param, "ultrafast", NULL ) < 0 ) {
                return -1;
            }
            
            /* Configure non-default params */
            param.i_bitdepth = 8;
            
            // yuv420p
            param.i_csp = X264_CSP_I420;
            param.i_width  = width;
            param.i_height = height;
            param.b_vfr_input = 0;
            param.b_repeat_headers = 1;
            param.b_annexb = 1;

            if( x264_param_apply_profile( &param, "high" ) < 0 ) {
                return -1;
            }

            if( x264_picture_alloc( &pic, param.i_csp, param.i_width, param.i_height ) < 0 ) {
                return -1;
            }

            h = x264_encoder_open( &param );
            if( !h ) {
                return -1;
            }
            return 0;
        }

        int encode(int yuv) {
            uint8_t* yuvp = (uint8_t*) yuv;
            int size = width * height;

            pic.i_pts = i_frame++;
            memcpy(pic.img.plane[0], yuvp, size);
            memcpy(pic.img.plane[1], yuvp + size, size >> 2);
            memcpy(pic.img.plane[2], yuvp + size + (size >> 2), size >> 2);

            i_frame_size = x264_encoder_encode( h, &nal, &i_nal, &pic, &pic_out );
            if( i_frame_size < 0 ) {
                return -1;
            } else if( i_frame_size ) {
                h264_write(nal->p_payload, i_frame_size);
            }
            return 0;
        }

        int flush() {
            while( x264_encoder_delayed_frames( h ) )
            {
                i_frame_size = x264_encoder_encode( h, &nal, &i_nal, NULL, &pic_out );
                if( i_frame_size < 0 )
                    return -1;
                else if( i_frame_size )
                {
                    h264_write(nal->p_payload, i_frame_size);
                }
            }

            return 0;
        }

        int close() {
            x264_encoder_close( h );
            x264_picture_clean( &pic );
            return 0;
        }

    private:
        x264_t *h;
        int width;
        int height;
        x264_param_t param;
        x264_picture_t pic;
        x264_picture_t pic_out;
        int i_frame = 0;
        int i_frame_size;
        x264_nal_t *nal;
        int i_nal;
};

EMSCRIPTEN_BINDINGS(encoder_module) {
     class_<X264Encoder>("X264Encoder")
        .constructor<>()
        .function("configure", &X264Encoder::configure)
        .function("encode", &X264Encoder::encode)
        .function("flush", &X264Encoder::flush)
        .function("close", &X264Encoder::close)
        ;
}