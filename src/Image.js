// Image represents a standard image stored in the data unit of a FITS file
import {DataUnit} from "./DataUnit";

export class Image extends DataUnit {

    //Image.include(ImageUtils);


    // When reading from a File object, only needed portions of file are placed into memory.
    // When large heaps are required, they are requested in 16 MB increments.
    allocationSize = 16777216;

    constructor(header, data) {
        let begin, frame, i, j, n, naxis, ref, ref1;
        super(header, data);

        // Get parameters from header
        naxis = header.get("NAXIS");
        this.bitpix = header.get("BITPIX");
        this.naxis = [];
        for (i = j = 1, ref = naxis; (1 <= ref ? j <= ref : j >= ref); i = 1 <= ref ? ++j : --j) {
            this.naxis.push(header.get(`NAXIS${i}`));
        }
        this.width = header.get("NAXIS1");
        this.height = header.get("NAXIS2") || 1;
        this.depth = header.get("NAXIS3") || 1;
        this.bzero = header.get("BZERO") || 0;
        this.bscale = header.get("BSCALE") || 1;
        this.bytes = Math.abs(this.bitpix) / 8;
        this.length = this.naxis.reduce(function(a, b) {
            return a * b;
        }) * Math.abs(this.bitpix) / 8;
        this.frame = 0; // Needed for data cubes

        // Create a look up table to store byte offsets for each frame
        // in the image.  This is mostly relevant to data cubes.  Each entry stores
        // the beginning offset of a frame.  A frame length parameter stores the byte
        // length of a single frame.
        this.frameOffsets = [];
        this.frameLength = this.bytes * this.width * this.height;

        // Set number of buffers per frame
        this.nBuffers = this.buffer != null ? 1 : 2;
        for (i = n = 0, ref1 = this.depth - 1; (0 <= ref1 ? n <= ref1 : n >= ref1); i = 0 <= ref1 ? ++n : --n) {
            begin = i * this.frameLength;
            frame = {
                begin: begin
            };
            if (this.buffer != null) {
                frame.buffers = [this.buffer.slice(begin, begin + this.frameLength)];
            }
            this.frameOffsets.push(frame);
        }
    }


    // Shared method for Image class and also for Web Worker.  Cannot reference any instance letiables
    // This is an internal function that converts bytes to pixel values.  There is no reference to instance
    // letiables in this function because it is executed on a Web Worker, which always exists outside the
    // scope of this function (class).
    _getFrame(buffer, bitpix, bzero, bscale) {
        let arr, bytes, dataType, i, nPixels, swapEndian, tmp, value;

        // Get the number of pixels represented in buffer
        bytes = Math.abs(bitpix) / 8;
        nPixels = i = buffer.byteLength / bytes;
        dataType = Math.abs(bitpix);
        if (bitpix > 0) {
            switch (bitpix) {
                case 8:
                    tmp = new Uint8Array(buffer);
                    tmp = new Uint16Array(tmp);
                    swapEndian = function(value) {
                        return value;
                    };
                    break;
                case 16:
                    tmp = new Int16Array(buffer);
                    swapEndian = function(value) {
                        return ((value & 0xFF) << 8) | ((value >> 8) & 0xFF);
                    };
                    break;
                case 32:
                    tmp = new Int32Array(buffer);
                    swapEndian = function(value) {
                        return ((value & 0xFF) << 24) | ((value & 0xFF00) << 8) | ((value >> 8) & 0xFF00) | ((value >> 24) & 0xFF);
                    };
            }

            // Patch for data unit with BSCALE AND BZERO ...
            if (!(parseInt(bzero) === bzero && parseInt(bscale) === bscale)) {
                arr = new Float32Array(tmp.length);
            } else {
                arr = tmp;
            }
            while (nPixels--) {

                // Swap endian and recast into typed array (needed to properly handle any overflow)
                tmp[nPixels] = swapEndian(tmp[nPixels]);
                arr[nPixels] = bzero + bscale * tmp[nPixels];
            }
        } else {
            arr = new Uint32Array(buffer);
            swapEndian = function(value) {
                return ((value & 0xFF) << 24) | ((value & 0xFF00) << 8) | ((value >> 8) & 0xFF00) | ((value >> 24) & 0xFF);
            };
            while (i--) {
                value = arr[i];
                arr[i] = swapEndian(value);
            }

            // Initialize a Float32 array using the same buffer
            arr = new Float32Array(buffer);

            // Apply BZERO and BSCALE
            while (nPixels--) {
                arr[nPixels] = bzero + bscale * arr[nPixels];
            }
        }
        return arr;
    }

    _getFrameAsync(buffers, callback, opts) {
        let URL, blobGetFrame, blobOnMessage, fn1, fn2, i, mime, msg, onmessage, pixels, start, urlGetFrame, urlOnMessage, worker;

        // Define function to be executed on the worker thread
        onmessage = function(e) {
            let arr, bitpix, bscale, buffer, bzero, data, url;
            // Get letiables sent from main thread
            data = e.data;
            buffer = data.buffer;
            bitpix = data.bitpix;
            bzero = data.bzero;
            bscale = data.bscale;
            url = data.url;

            // Import getFrame function
            importScripts(url);
            arr = _getFrame(buffer, bitpix, bzero, bscale);
            return postMessage(arr);
        };

        // Trick to format function for worker
        fn1 = onmessage.toString().replace('return postMessage', 'postMessage');
        fn1 = `onmessage = ${fn1}`;

        // Functions passed to worker via url cannot be anonymous
        fn2 = this._getFrame.toString();
        fn2 = fn2.replace('function', 'function _getFrame');

        // Construct blob for an inline worker and _getFrame function
        mime = "application/javascript";
        blobOnMessage = new Blob([fn1], {
            type: mime
        });
        blobGetFrame = new Blob([fn2], {
            type: mime
        });

        // Create URLs to onmessage and _getFrame scripts
        URL = window.URL || window.webkitURL; // to appease Safari
        urlOnMessage = URL.createObjectURL(blobOnMessage);
        urlGetFrame = URL.createObjectURL(blobGetFrame);

        // Initialize worker
        worker = new Worker(urlOnMessage);

        // Define object containing parameters to be passed to worker beginning with first buffer
        msg = {
            buffer: buffers[0],
            bitpix: this.bitpix,
            bzero: this.bzero,
            bscale: this.bscale,
            url: urlGetFrame
        };

        // Define function for when worker job is complete
        i = 0;
        pixels = null;
        start = 0;
        worker.onmessage = (e) => {
            let arr;
            arr = e.data;

            // Initialize storage for all pixels
            if (pixels == null) {
                pixels = new arr.constructor(this.width * this.height);
            }
            pixels.set(arr, start);

            // Set start index for next iteration
            start += arr.length;
            i += 1;
            if (i === this.nBuffers) {
                this.invoke(callback, opts, pixels);

                // Clean up urls and worker
                URL.revokeObjectURL(urlOnMessage);
                URL.revokeObjectURL(urlGetFrame);
                return worker.terminate();
            } else {
                msg.buffer = buffers[i];
                return worker.postMessage(msg, [buffers[i]]);
            }
        };
        worker.postMessage(msg, [buffers[0]]);
    }


    // Read frames from image.  Frames are read sequentially unless nFrame is set.
    // A callback must be provided since there are 1 or more asynchronous processes happening
    // to convert bytes to flux. This is a case where a partially synchronous and
    // completely asynchronous process are abstracted by a single function.
    getFrame(frame, callback, opts) {
        let begin, blobFrame, blobs, buffers, bytesPerBuffer, frameInfo, i, j, nRowsPerBuffer, reader, ref, start;
        this.frame = frame || this.frame;
        frameInfo = this.frameOffsets[this.frame];
        buffers = frameInfo.buffers;

        // Check if bytes are in memory
        if ((buffers != null ? buffers.length : void 0) === this.nBuffers) {
            return this._getFrameAsync(buffers, callback, opts);
        } else {

            // Read frame bytes into memory incrementally
            this.frameOffsets[this.frame].buffers = [];

            // Slice blob for only current frame bytes
            begin = frameInfo.begin;
            blobFrame = this.blob.slice(begin, begin + this.frameLength);

            // Slice blob into chunks to prevent reading too much data in single operation
            blobs = [];
            nRowsPerBuffer = Math.floor(this.height / this.nBuffers);
            bytesPerBuffer = nRowsPerBuffer * this.bytes * this.width;
            for (i = j = 0, ref = this.nBuffers - 1; (0 <= ref ? j <= ref : j >= ref); i = 0 <= ref ? ++j : --j) {
                start = i * bytesPerBuffer;
                if (i === this.nBuffers - 1) {
                    blobs.push(blobFrame.slice(start));
                } else {
                    blobs.push(blobFrame.slice(start, start + bytesPerBuffer));
                }
            }

            // Create array for buffers
            buffers = [];

            // Create file reader and store frame number on object for later reference
            reader = new FileReader();
            reader.frame = this.frame;
            i = 0;
            reader.onloadend = (e) => {
                let buffer;
                frame = e.target.frame;
                buffer = e.target.result;

                // Store the buffer for later access
                this.frameOffsets[frame].buffers.push(buffer);
                i += 1;
                if (i === this.nBuffers) {
                    // Call function again
                    return this.getFrame(frame, callback, opts);
                } else {
                    return reader.readAsArrayBuffer(blobs[i]);
                }
            };
            return reader.readAsArrayBuffer(blobs[0]);
        }
    }


    // Reads frames in a data cube in an efficient way that does not
    // overload the browser. The callback passed will be executed once for
    // each frame, in the sequential order of the cube.
    getFrames(frame, number, callback, opts) {
        let cb;

        // Define callback to pass to getFrame
        cb = (arr, opts) => {
            this.invoke(callback, opts, arr);

            // Update counters
            number -= 1;
            frame += 1;
            if (!number) {
                return;
            }

            // Request another frame
            return this.getFrame(frame, cb, opts);
        };

        // Start reading frames
        return this.getFrame(frame, cb, opts);
    }


    // Checks if the image is a data cube
    isDataCube() {
        if (this.naxis.length > 2) {
            return true;
        } else {
            return false;
        }
    }

}