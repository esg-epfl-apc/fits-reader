import BinaryTable from "./BinaryTable";

export class CompressedImage extends BinaryTable {

    //CompressedImage.include(ImageUtils);

    //CompressedImage.extend(Decompress);


    // Store random look up table on class.
    randomSequence = CompressedImage.randomGenerator();

    // Predefined random number generator from http://arxiv.org/pdf/1201.1336v1.pdf
    // This is the same method used by fpack when dithering images during compression.
    static randomGenerator() {
        let a, i, j, m, random, seed, temp;
        a = 16807;
        m = 2147483647;
        seed = 1;
        random = new Float32Array(10000);
        for (i = j = 0; j <= 9999; i = ++j) {
            temp = a * seed;
            seed = temp - m * parseInt(temp / m);
            random[i] = seed / m;
        }
        return random;
    }

    constructor(header, data) {
        let i, j, key, ref, value, ztile;
        super(header, data);

        // Get compression values
        this.zcmptype = header.get("ZCMPTYPE");
        this.zbitpix = header.get("ZBITPIX");
        this.znaxis = header.get("ZNAXIS");
        this.zblank = header.get("ZBLANK");
        this.blank = header.get("BLANK");
        this.zdither = header.get('ZDITHER0') || 0;
        this.ztile = [];

        /*
        for (i = j = 1, ref = this.znaxis; (1 <= ref ? j <= ref : j >= ref); i = 1 <= ref ? ++j : --j) {
            ztile = header.contains(`ZTILE${i}`) ? header.get(`ZTILE${i}`) : i === 1 ? header.get("ZNAXIS1") : 1;
            this.ztile.push(ztile);
        }
        */

        i = 1;
        j = 1;
        ref = this.znaxis;

        while (1 <= ref ? j <= ref : j >= ref) {
            let ztile;
            if (header.contains(`ZTILE${i}`)) {
                ztile = header.get(`ZTILE${i}`);
            } else if (i === 1) {
                ztile = header.get("ZNAXIS1");
            } else {
                ztile = 1;
            }

            this.ztile.push(ztile);

            if (1 <= ref) {
                j++;
            } else {
                j--;
            }

            i = (1 <= ref) ? j : j;
        }

        this.width = header.get("ZNAXIS1");
        this.height = header.get("ZNAXIS2") || 1;

        // Storage for compression algorithm parameters
        this.algorithmParameters = {};

        // Set default parameters
        if (this.zcmptype === 'RICE_1') {
            this.algorithmParameters["BLOCKSIZE"] = 32;
            this.algorithmParameters["BYTEPIX"] = 4;
        }

        // Get compression algorithm parameters (override defaults when keys present)
        i = 1;
        while (true) {
            key = `ZNAME${i}`;
            if (!header.contains(key)) {
                break;
            }
            value = `ZVAL${i}`;
            this.algorithmParameters[header.get(key)] = header.get(value);
            i += 1;
        }
        this.zmaskcmp = header.get("ZMASKCMP");
        this.zquantiz = header.get("ZQUANTIZ") || "LINEAR_SCALING";
        this.bzero = header.get("BZERO") || 0;
        this.bscale = header.get("BSCALE") || 1;
    }

    _getRows(buffer, nRows) {
        let accessor, arr, blank, data, i, index, j, len, len1, n, nTile, offset, r, rIndex, ref, row, scale, seed0, seed1, value, view, zero;

        // Set up view and offset
        view = new DataView(buffer);
        offset = 0;

        // Set up storage for frame
        arr = new Float32Array(this.width * this.height);

        // Read each row (tile)
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

            // Get array from column with returned values
            // TODO: Check that data is returned correctly when UNCOMPRESSED_DATA or GZIP_COMPRESSED_DATA present
            data = row['COMPRESSED_DATA'] || row['UNCOMPRESSED_DATA'] || row['GZIP_COMPRESSED_DATA'];
            blank = row['ZBLANK'] || this.zblank;
            scale = row['ZSCALE'] || this.bscale;
            zero = row['ZZERO'] || this.bzero;

            // Set initial seeds using tile number and ZDITHER0 (assuming row by row tiling)
            nTile = this.height - nRows;
            seed0 = nTile + this.zdither - 1;
            seed1 = (seed0 - 1) % 10000;

            // Set initial index in random sequence
            rIndex = parseInt(this.constructor.randomSequence[seed1] * 500);
            for (index = n = 0, len1 = data.length; n < len1; index = ++n) {
                value = data[index];

                // Get the pixel index
                i = (nTile - 1) * this.width + index;
                if (value === -2147483647) {
                    arr[i] = 0/0;
                } else if (value === -2147483646) {
                    arr[i] = 0;
                } else {
                    r = this.constructor.randomSequence[rIndex];
                    arr[i] = (value - r + 0.5) * scale + zero;
                }

                // Update the random index
                rIndex += 1;
                if (rIndex === 10000) {
                    seed1 = (seed1 + 1) % 10000;
                    rIndex = parseInt(this.randomSequence[seed1] * 500);
                }
            }
        }
        return arr;
    }


    // Even though compressed images are represented as a binary table
    // the API should expose the same method as images.
    // TODO: Support compressed data cubes
    getFrame(nFrame, callback, opts) {
        let heapBlob, reader;

        // Check if heap in memory
        if (this.heap) {
            this.frame = nFrame || this.frame;

            // TODO: Row parameters should be adjusted when working with data cubes
            return this.getRows(0, this.rows, callback, opts);
        } else {
            // Get blob representing heap
            heapBlob = this.blob.slice(this.length, this.length + this.heapLength);

            // Create file reader
            reader = new FileReader();
            reader.onloadend = (e) => {
                this.heap = e.target.result;

                // Call function again
                return this.getFrame(nFrame, callback, opts);
            };
            return reader.readAsArrayBuffer(heapBlob);
        }
    }

}