// Abstract class for tabular FITS extensions (e.g. TABLE, BINTABLE)
import {DataUnit} from "./DataUnit";

export class Tabular extends DataUnit {

    // The maximum amount of memory to hold on object when
    // reading a local file. 8 MBs.
    // maxMemory: 8388608
    maxMemory = 1048576;

    constructor(header, data) {
        super(header, data);
        this.rowByteSize = header.get("NAXIS1");
        this.rows = header.get("NAXIS2");
        this.cols = header.get("TFIELDS");

        // Get bytes size of the data unit and column names
        this.length = this.rowByteSize * this.rows;
        this.heapLength = header.get("PCOUNT");
        this.columns = this.getColumns(header);

        // Store information about the buffer
        if (this.buffer != null) {

            // Define function at run time that checks if row is in memory
            this.rowsInMemory = this._rowsInMemoryBuffer;

            // Keep separate buffer for heap
            // NOTE: This causes a duplication of the buffer in memory. Find better solution.
            this.heap = this.buffer.slice(this.length, this.length + this.heapLength);
        } else {
            this.rowsInMemory = this._rowsInMemoryBlob;

            // No rows are in memory
            this.firstRowInBuffer = this.lastRowInBuffer = 0;

            // Use maxMemory to get the number of rows to hold in memory
            this.nRowsInBuffer = Math.floor(this.maxMemory / this.rowByteSize);
        }

        // Storage for accessor functions, descriptors and offsets for each column
        this.accessors = [];
        this.descriptors = [];
        this.elementByteLengths = [];
        this.setAccessors(header);
    }


    // Determine if the row is in memory. For tables initialized with an array buffer, all rows
    // are in memory, so there is no need to check. For tables initialized with a blob, this check
    // is needed to determine if the file needs to be read before accessing data.
    _rowsInMemoryBuffer() {
        return true;
    }

    _rowsInMemoryBlob(firstRow, lastRow) {
        if (firstRow < this.firstRowInBuffer) {
            return false;
        }
        if (lastRow > this.lastRowInBuffer) {
            return false;
        }
        return true;
    }

    // Get the column names from the header
    getColumns(header) {
        let columns, i, j, key, ref;
        columns = [];
        for (i = j = 1, ref = this.cols; (1 <= ref ? j <= ref : j >= ref); i = 1 <= ref ? ++j : --j) {
            key = `TTYPE${i}`;
            if (!header.contains(key)) {
                return null;
            }
            columns.push(header.get(key));
        }
        return columns;
    }


    // Get column of data specified by parameters.
    getColumn(name, callback, opts) {
        let accessor, cb, column, descriptor, elementByteLength, elementByteOffset, factor, i, index, iterations, rowsPerIteration;
        // Check for blob
        if (this.blob != null) {

            // Storage for column using typed array when able
            index = this.columns.indexOf(name);
            descriptor = this.descriptors[index];
            accessor = this.accessors[index];
            elementByteLength = this.elementByteLengths[index];
            elementByteOffset = this.elementByteLengths.slice(0, index);
            if (elementByteOffset.length === 0) {
                elementByteOffset = 0;
            } else {
                elementByteOffset = elementByteOffset.reduce(function(a, b) {
                    return a + b;
                });
            }
            column = this.typedArray[descriptor] != null ? new this.typedArray[descriptor](this.rows) : [];

            // Read rows in ~8 MB chunks
            rowsPerIteration = ~~(this.maxMemory / this.rowByteSize);
            rowsPerIteration = Math.min(rowsPerIteration, this.rows);

            // Get number of iterations needed to read entire file
            factor = this.rows / rowsPerIteration;
            iterations = Math.floor(factor) === factor ? factor : Math.floor(factor) + 1;
            i = 0;
            index = 0;

            // Define callback to pass to getRows
            cb = (buffer, opts) => {
                let nRows, offset, startRow, view;
                nRows = buffer.byteLength / this.rowByteSize;
                view = new DataView(buffer);
                offset = elementByteOffset;

                // Read only the column value from the buffer
                while (nRows--) {
                    column[i] = accessor(view, offset)[0];
                    i += 1;
                    offset += this.rowByteSize;
                }

                // Update counters
                iterations -= 1;
                index += 1;

                // Request another buffer of rows
                if (iterations) {
                    startRow = index * rowsPerIteration;
                    return this.getTableBuffer(startRow, rowsPerIteration, cb, opts);
                } else {
                    this.invoke(callback, opts, column);
                }
            };

            // Start reading rows
            return this.getTableBuffer(0, rowsPerIteration, cb, opts);
        } else {
            // Table already in memory.  Get column using getRows method
            cb = (rows, opts) => {
                column = rows.map(function(d) {
                    return d[name];
                });
                return this.invoke(callback, opts, column);
            };
            return this.getRows(0, this.rows, cb, opts);
        }
    }


    // Get buffer representing a number of rows. The resulting buffer
    // should be passed to another function for either row or column access.
    // NOTE: Using only for local files that are not in memory.
    getTableBuffer(row, number, callback, opts) {
        let begin, blobRows, end, reader;

        // Get the number of remaining rows
        number = Math.min(this.rows - row, number);

        // Get the offsets to slice the blob. Note the API allows for more memory to be allocated
        // by the developer if the number of rows is greater than the default heap size.
        begin = row * this.rowByteSize;
        end = begin + number * this.rowByteSize;

        // Slice blob for only relevant bytes
        blobRows = this.blob.slice(begin, end);

        // Create file reader and store row and number on object for later reference
        reader = new FileReader();
        reader.row = row;
        reader.number = number;
        reader.onloadend = (e) => {
            // Pass arraybuffer to a parser function via callback
            return this.invoke(callback, opts, e.target.result);
        };
        return reader.readAsArrayBuffer(blobRows);
    }


    // Get rows of data specified by parameters.  In the case where
    // the data is not yet in memory, a callback must be provided to
    // expose the results. This is due to the asynchonous reading of
    // the file.
    getRows(row, number, callback, opts) {
        let begin, blobRows, buffer, end, reader, rows;

        // Check if rows are in memory
        if (this.rowsInMemory(row, row + number)) {

            // Buffer needs slicing if entire file is in memory
            if (this.blob != null) {
                buffer = this.buffer;
            } else {
                begin = row * this.rowByteSize;
                end = begin + number * this.rowByteSize;
                buffer = this.buffer.slice(begin, end);
            }

            // Derived classes must implement this function
            rows = this._getRows(buffer, number);
            this.invoke(callback, opts, rows);
            return rows;
        } else {

            // Get the offsets to slice the blob. Note the API allows for more memory to be allocated
            // by the developer if the number of rows is greater than the default heap size.
            begin = row * this.rowByteSize;
            end = begin + Math.max(this.nRowsInBuffer * this.rowByteSize, number * this.rowByteSize);

            // Slice blob for only bytes
            blobRows = this.blob.slice(begin, end);

            // Create file reader and store row and number on object for later reference
            reader = new FileReader();
            reader.row = row;
            reader.number = number;
            reader.onloadend = (e) => {
                let target;
                target = e.target;

                // Store the array buffer on the object
                // TODO: Double check this as it might result in failure to GC
                this.buffer = target.result;
                this.firstRowInBuffer = this.lastRowInBuffer = target.row;
                this.lastRowInBuffer += target.number;

                // Call function again
                return this.getRows(row, number, callback, opts);
            };
            return reader.readAsArrayBuffer(blobRows);
        }
    }

}