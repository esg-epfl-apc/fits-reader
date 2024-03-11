import {HeaderVerify} from "./HeaderVerify";
import {Header} from "./Header";
import {HDU} from "./HDU";
import {Table} from "./Table";
import BinaryTable from "./BinaryTable";

export default class Parser {


     LINEWIDTH = 80;

     BLOCKLENGTH = 2880;

     // Storage for header dataunits
     hdus = [];

     // FITS objects are constructed using either
    // 1) Path to a remote FITS file
    // 2) Native File object

     constructor(arrayBuffer, fitsFile) {
        this.arrayBuffer = arrayBuffer;
        this.fitsFile = fitsFile;

        this.file = null;
        this.length = null;

         // Number of 2880 blocks read.  This is reset every time an entire header is extracted.
         this.blockCount = 0;

         // Byte offsets relative to the current header
         this.begin = 0;
         this.end = this.BLOCKLENGTH;

         // Byte offset relative to the file
         this.offset = 0;

         // Initial storage for storing header while parsing.
         this.headerStorage = new Uint8Array();
     }

     parseFileFromBuffer() {
         this.file = this.arrayBuffer;
         this.length = this.file.byteLength;

         let block;

         // Get first 2880 block
         block = this.file.slice(this.begin + this.offset, this.end + this.offset);

         // Begin parsing for headers
         let parsing_result = this.readBlock(block);

         console.log("aaaaa");

         if(parsing_result) {
             return this.fitsFile;
         } else {
             throw new Error("Error parsing the file");
         }
     }

     /*
    constructor(file_path, callback) {

        let xhr;

        this.file_path = file_path;
        this.callback = callback;

        // Set initial state for parsing buffer
        // Blocks of 2880 will be read until an entire header is read.
        // The process will be repeated until all headers have been parsed from file.

        // Number of 2880 blocks read.  This is reset every time an entire header is extracted.
        this.blockCount = 0;

        // Byte offsets relative to the current header
        this.begin = 0;
        this.end = this.BLOCKLENGTH;

        // Byte offset relative to the file
        this.offset = 0;

        // Initial storage for storing header while parsing.
        this.headerStorage = new Uint8Array();

        // Check the input type for either
        // 1) Path to remote file
        // 2) Native File object
        if (typeof this.file_path === 'string') {

            // Define function at runtime for getting next block
            this.readNextBlock = this._readBlockFromBuffer;

            // Get the remote file as an arraybuffer

            this.getFileAsync();

            //
            try {
                fetch(this.file_path, {})
                    .then( res => this.parseFile(res));

            } catch (error) {
                this.callback(null);
            }
            //

            //
            xhr = new XMLHttpRequest();
            xhr.open('GET', this.file_path);
            xhr.responseType = 'arraybuffer';
            xhr.onload = () => {

                // Error handling on the response status
                if (xhr.status !== 200) {

                    // Execute callback returning a null object on failure
                    this.invoke(this.callback, this.opts);
                    return;
                }

                // Get buffer from response
                this.arg = xhr.response;

                // Store the buffer byte length
                this.length = this.arg.byteLength;

                // Begin reading buffer
                return this.readFromBuffer();
            };

            // Send the request
            xhr.send();
            //

        } else {
            // Store the file byte length
            this.length = this.arg.size;

            // Define function at runtime for getting next block
            this.readNextBlock = this._readBlockFromFile;

            // Get the local file as an arraybuffer
            this.readFromFile();
        }
    }
    */

     async getFileAsync() {
         try {
             const response = await fetch(this.file_path);
             const arrayBuffer = await response.arrayBuffer();

             await this.getFile(arrayBuffer);

         } catch (error) {
             console.error(error);
         }
     }

    getFile() {

        return fetch(this.file_path)
         .then((response) => {
             if (!response.ok) {
                 throw new Error(`HTTP error, status = ${response.status}`);
             }
             return response.arrayBuffer();
         })
         .then((buffer) => this.parseFile(buffer));
     }

    parseFile(fileArrayBuffer) {
        this.file = fileArrayBuffer;

        console.log(this.file)

        this.length = this.file.byteLength;
        this.readFromBuffer();
    }

    // Interpret an array buffer that is already copied in memory.  Usually
    // used for remote files, though this can be used for local files if
    // the arraybuffer is already in memory.
    readFromBuffer() {
        let block;

        // Get first 2880 block
        block = this.file.slice(this.begin + this.offset, this.end + this.offset);

        // Begin parsing for headers
        return this.readBlock(block);
    }


    // Read a file by copying only the headers into memory.  This is needed
    // to handle large files efficiently.
    readFromFile() {
        let block;

        // Initialize a new FileReader
        this.reader = new FileReader();

        // Set reader handler
        this.reader.onloadend = (e) => {
            return this.readBlock(e.target.result);
        };

        // Get first 2880 block
        block = this.file.slice(this.begin + this.offset, this.end + this.offset);

        // Begin parsing for headers
        return this.reader.readAsArrayBuffer(block);
    }


    // Read a 2880 size block. Function is responsible for storing block,
    // searching for END marker, initializing an HDU, and clearing storage.
    readBlock(block) {
        let arr, dataLength, dataunit, header, j, len, ref, rowIndex, rows, s, slice, tmp, value;

        // Read block as integers
        arr = new Uint8Array(block);

        // Temporary storage for header
        tmp = new Uint8Array(this.headerStorage);

        // Reallocate header storage
        this.headerStorage = new Uint8Array(this.end);

        // Copy contents from temporary storage
        this.headerStorage.set(tmp, 0);

        // Copy contents from current iteration
        this.headerStorage.set(arr, this.begin);

        // Check current array one row at a time starting from
        // bottom of the block.

        rows = this.BLOCKLENGTH / this.LINEWIDTH;
        while (rows--) {

            // Get index of first element in row
            rowIndex = rows * this.LINEWIDTH;

            if (arr[rowIndex] === 32) {

                // Go to next row if whitespace found
                continue;
            }

            // Check for END keyword with trailing space (69, 78, 68, 32)
            if (arr[rowIndex] === 69 && arr[rowIndex + 1] === 78 && arr[rowIndex + 2] === 68 && arr[rowIndex + 3] === 32) {

                // Interpret as string
                s = '';
                ref = this.headerStorage;
                for (j = 0, len = ref.length; j < len; j++) {
                    value = ref[j];
                    s += String.fromCharCode(value);
                }

                header = new Header(s, new HeaderVerify());

                // Get data unit start and length
                this.start = this.end + this.offset;
                dataLength = header.getDataLength();

                // Create data unit instance
                slice = this.file.slice(this.start, this.start + dataLength);
                if (header.hasDataUnit()) {
                    dataunit = this.createDataUnit(header, slice);
                }

                // Store HDU on instance
                this.hdus.push(new HDU(header, dataunit));
                this.fitsFile.addHDU(new HDU(header, dataunit));

                // Update byte offset
                this.offset += this.end + dataLength + this.excessBytes(dataLength);

                // Return if at the end of file
                if (this.offset === this.length) {

                    console.log("parsing complete parser")

                    this.headerStorage = null;

                    //let fits_file = new FITSFile(this);

                    //this.callback(fits_file, this);
                    if(this.fitsFile.isValid()) {
                        console.log("fits file");
                        return true;
                    } else {
                        return false;
                    }
                }

                // Reset letiables for next header
                this.blockCount = 0;
                this.begin = this.blockCount * this.BLOCKLENGTH;
                this.end = this.begin + this.BLOCKLENGTH;
                this.headerStorage = new Uint8Array();

                // Get next block
                block = this.file.slice(this.begin + this.offset, this.end + this.offset);

                // Begin parsing for next header
                console.log("block");
                return this.readBlock(block);
            }

            break;
        }

        // Read next block since END not found
        this.blockCount += 1;
        this.begin = this.blockCount * this.BLOCKLENGTH;
        this.end = this.begin + this.BLOCKLENGTH;
        block = this.file.slice(this.begin + this.offset, this.end + this.offset);
        return this.readBlock(block);
    }


    // Use one of these depending on the initialization parameter (File or ArrayBuffer)
    _readBlockFromBuffer(block) {
        return this.readBlock(block);
    }

    _readBlockFromFile(block) {
        return this.reader.readAsArrayBuffer(block);
    }


    // Create the appropriate data unit based on info from header
    createDataUnit(header, blob) {
        let type;
        let data_unit = null;

        console.log("Creating data unit")

        type = header.getDataType();

        console.log(type);

        //return new astro.FITS[type](header, blob);

        switch(type) {

            case 'BinaryTable' :
                data_unit = new BinaryTable(header, blob);
                break;

            case 'Table' :
                data_unit = new Table(header, blob);
                break;

            case 'Image' :
                data_unit = new Image(header, blob);
                break;

            default :
                data_unit = new Image(header, blob);
                break;
        }

        return data_unit;
    }


    // Determine the number of characters following a header or data unit
    excessBytes(length) {
        return (this.BLOCKLENGTH - (length % this.BLOCKLENGTH)) % this.BLOCKLENGTH;
    }


    // Check for the end of file
    isEOF() {
        if (this.offset === this.length) {
            return true;
        } else {
            return false;
        }
    }

}
