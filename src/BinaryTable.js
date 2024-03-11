import Tabular from "./Tabular";

export default class BinaryTable extends Tabular {

    // Look up table for matching appropriate typed array
    typedArray = {
        B: Uint8Array,
        I: Uint16Array,
        J: Uint32Array,
        E: Float32Array,
        D: Float64Array,
        1: Uint8Array,
        2: Uint16Array,
        4: Uint32Array
    };

    static offsets = {
        L: 1,
        B: 1,
        I: 2,
        J: 4,
        K: 8,
        A: 1,
        E: 4,
        D: 8,
        C: 8,
        M: 16
    };


    // Define functions for parsing binary tables.
    // NOTE: Accessor function for bit array is better implemented in another function below
    dataAccessors = {
        L: function(view, offset) {
            let val, x;
            x = view.getInt8(offset);
            offset += 1;
            val = x === 84;
            return [val, offset];
        },
        B: function(view, offset) {
            let val;
            val = view.getUint8(offset);
            offset += 1;
            return [val, offset];
        },
        I: function(view, offset) {
            let val;
            val = view.getInt16(offset);
            offset += 2;
            return [val, offset];
        },
        J: function(view, offset) {
            let val;
            val = view.getInt32(offset);
            offset += 4;
            return [val, offset];
        },
        K: function(view, offset) {
            let factor, highByte, lowByte, mod, val;
            highByte = Math.abs(view.getInt32(offset));
            offset += 4;
            lowByte = Math.abs(view.getInt32(offset));
            offset += 4;
            mod = highByte % 10;
            factor = mod ? -1 : 1;
            highByte -= mod;
            val = factor * ((highByte << 32) | lowByte);
            return [val, offset];
        },
        A: function(view, offset) {
            let val;
            val = view.getUint8(offset);
            val = String.fromCharCode(val);
            offset += 1;
            return [val, offset];
        },
        E: function(view, offset) {
            let val;
            val = view.getFloat32(offset);
            offset += 4;
            return [val, offset];
        },
        D: function(view, offset) {
            let val;
            val = view.getFloat64(offset);
            offset += 8;
            return [val, offset];
        },
        C: function(view, offset) {
            let val, val1, val2;
            val1 = view.getFloat32(offset);
            offset += 4;
            val2 = view.getFloat32(offset);
            offset += 4;
            val = [val1, val2];
            return [val, offset];
        },
        M: function(view, offset) {
            let val, val1, val2;
            val1 = view.getFloat64(offset);
            offset += 8;
            val2 = view.getFloat64(offset);
            offset += 8;
            val = [val1, val2];
            return [val, offset];
    }};

    toBits(byte) {
        let arr, i;
        arr = [];
        i = 128;
        while (i >= 1) {
            arr.push((byte & i ? 1 : 0));
            i /= 2;
        }
        return arr;
    }


    // Get bytes from the heap that follows the main data structure.  Often used
    // for binary tables and compressed images.
    getFromHeap(view, offset, descriptor) {
        let arr, heapOffset, heapSlice, i, length;

        // Get length and offset of the heap
        length = view.getInt32(offset);
        offset += 4;
        heapOffset = view.getInt32(offset);
        offset += 4;

        // Read from the buffer
        heapSlice = this.heap.slice(heapOffset, heapOffset + length);
        arr = new this.typedArray[descriptor](heapSlice);

        // TODO: Make conditional on array type (e.g. byte arrays do not need endian swap)
        // Swap endian
        i = arr.length;
        while (i--) {
            arr[i] = this.constructor.swapEndian[descriptor](arr[i]);
        }
        return [arr, offset];
    }

    setAccessors(header) {
        let count, descriptor, form, i, isArray, j, match, pattern, ref, results, type;
        pattern = /(\d*)([P|Q]*)([L|X|B|I|J|K|A|E|D|C|M]{1})/;
        results = [];
        for (i = j = 1, ref = this.cols; (1 <= ref ? j <= ref : j >= ref); i = 1 <= ref ? ++j : --j) {
            form = header.get(`TFORM${i}`);
            type = header.get(`TTYPE${i}`);
            match = pattern.exec(form);
            count = parseInt(match[1]) || 1;
            isArray = match[2];
            descriptor = match[3];
            results.push(((descriptor, count) => {
                let accessor, nBytes;

                // Store the descriptor for each column
                this.descriptors.push(descriptor);

                // Store the offset for each column
                this.elementByteLengths.push(BinaryTable.offsets[descriptor] * count);
                if (isArray) {

                    // Handle array descriptors
                    switch (type) {
                        case "COMPRESSED_DATA":
                            accessor = (view, offset) => {
                                let arr, pixels;
                                [arr, offset] = this.getFromHeap(view, offset, descriptor);

                                // Assuming Rice compression
                                pixels = new this.typedArray[this.algorithmParameters["BYTEPIX"]](this.ztile[0]);
                                Decompress.Rice(arr, this.algorithmParameters["BLOCKSIZE"], this.algorithmParameters["BYTEPIX"], pixels, this.ztile[0], Decompress.RiceSetup);
                                return [pixels, offset];
                            };
                            break;
                        case "GZIP_COMPRESSED_DATA":

                            // TODO: Implement GZIP using https://github.com/imaya/zlib.js
                            accessor = (view, offset) => {
                                let arr;
                                // [arr, offset] = @getFromHeap(view, offset, descriptor)

                                // Temporarily padding with NaNs until GZIP is implemented
                                arr = new Float32Array(this.width);
                                i = arr.length;
                                while (i--) {
                                    arr[i] = 0/0;
                                }
                                return [arr, offset];
                            };
                            break;
                        default:
                            accessor = (view, offset) => {
                                return this.getFromHeap(view, offset, descriptor);
                            };
                    }
                } else {
                    if (count === 1) {

                        // Handle single element
                        accessor = (view, offset) => {
                            let value;
                            [value, offset] = this.dataAccessors[descriptor](view, offset);
                            return [value, offset];
                        };
                    } else {

                        // Handle bit arrays
                        if (descriptor === 'X') {
                            nBytes = Math.log(count) / Math.log(2);
                            accessor = (view, offset) => {
                                let arr, bits, buffer, byte, bytes, len, n;

                                // Read from buffer
                                buffer = view.buffer.slice(offset, offset + nBytes);
                                bytes = new Uint8Array(buffer);

                                // Get bit representation
                                bits = [];
                                for (n = 0, len = bytes.length; n < len; n++) {
                                    byte = bytes[n];
                                    arr = this.toBits(byte);
                                    bits = bits.concat(arr);
                                }

                                // Increment the offset
                                offset += nBytes;
                                return [bits.slice(0, +(count - 1) + 1 || 9e9), offset];
                            };

                            // Handle character arrays
                        } else if (descriptor === 'A') {
                            accessor = (view, offset) => {
                                let arr, buffer, len, n, s, value;

                                // Read from buffer
                                buffer = view.buffer.slice(offset, offset + count);
                                arr = new Uint8Array(buffer);
                                s = '';
                                for (n = 0, len = arr.length; n < len; n++) {
                                    value = arr[n];
                                    s += String.fromCharCode(value);
                                }
                                s = s.trim();

                                // Increment offset
                                offset += count;
                                return [s, offset];
                            };
                        } else {

                            // Handle all other data types
                            accessor = (view, offset) => {
                                let data, value;
                                i = count;
                                data = [];
                                while (i--) {
                                    [value, offset] = this.dataAccessors[descriptor](view, offset);
                                    data.push(value);
                                }
                                return [data, offset];
                            };
                        }
                    }
                }

                // Push accessor function to array
                return this.accessors.push(accessor);
            })(descriptor, count));
        }
        return results;
    }

    _getRows(buffer, nRows) {
        let accessor, index, j, len, offset, ref, row, rows, value, view;

        // Set up view and offset
        view = new DataView(buffer);
        offset = 0;

        // Storage for rows
        rows = [];

        // Read each row
        while (nRows--) {

            // Storage for current row
            row = {};
            ref = this.accessors;
            for (index = j = 0, len = ref.length; j < len; index = ++j) {
                accessor = ref[index];

                // Read value from each column in current row
                [value, offset] = accessor(view, offset);
                row[this.columns[index]] = value;
            }

            // Store row on array
            rows.push(row);
        }
        return rows;
    }

}