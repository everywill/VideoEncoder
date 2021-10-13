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