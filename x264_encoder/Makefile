ROOT_DIR:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))

BUILD_DIR=$(ROOT_DIR)/build
WASM_BUILD_DIR=$(ROOT_DIR)/build/wasm
BIN_PATH=$(ROOT_DIR)/build/bin
MAN_PATH=$(ROOT_DIR)/build/man

PATH:=$(PATH):$(BIN_PATH)

INSTALLS=--prefix=$(BUILD_DIR) --libdir=$(BUILD_DIR)/lib --includedir=$(BUILD_DIR)/include --bindir=$(BUILD_DIR)/bin
WASM_INSTALLS=--prefix=$(WASM_BUILD_DIR) --libdir=$(WASM_BUILD_DIR)/lib --includedir=$(WASM_BUILD_DIR)/include --bindir=$(WASM_BUILD_DIR)/bin 
		
SIMD_FLAGS=-msse4.1 -msimd128

encoder-wasm:
	emcc --bind -s ASSERTIONS=0 -s SUPPORT_LONGJMP=0 -s ENVIRONMENT=web -s DYNAMIC_EXECUTION=0 -s FILESYSTEM=0 -s WARN_ON_UNDEFINED_SYMBOLS=0 -s EXPORT_ES6=1 -s MODULARIZE=1 -s ALLOW_MEMORY_GROWTH=1 -I$(WASM_BUILD_DIR)/include encoder.cpp $(WASM_BUILD_DIR)/lib/libx264.a $(SIMD_FLAGS) -O2 -Wall -lm -o lib/encoder.js
