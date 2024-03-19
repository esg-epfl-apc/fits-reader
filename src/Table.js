// Class to read ASCII tables from FITS files.
import {Tabular} from "./Tabular";

export class Table extends Tabular {

    // Define functions for parsing ASCII entries
    dataAccessors = {
        A: function(value) {
            return value.trim();
        },
        I: function(value) {
            return parseInt(value);
        },
        F: function(value) {
            return parseFloat(value);
        },
        E: function(value) {
            return parseFloat(value);
        },
        D: function(value) {
            return parseFloat(value);
        }
    }

    setAccessors(header) {
        let descriptor, form, i, j, match, pattern, ref, results, type;
        pattern = /([AIFED])(\d+)\.*(\d+)*/;
        results = [];
        for (i = j = 1, ref = this.cols; (1 <= ref ? j <= ref : j >= ref); i = 1 <= ref ? ++j : --j) {
            form = header.get(`TFORM${i}`);
            type = header.get(`TTYPE${i}`);
            match = pattern.exec(form);
            descriptor = match[1];
            results.push(((descriptor) => {
                let accessor;
                accessor = (value) => {
                    return this.dataAccessors[descriptor](value);
                };
                return this.accessors.push(accessor);
            })(descriptor));
        }
        return results;
    }

    _getRows(buffer) {
        let accessor, arr, begin, end, i, index, j, len, len1, line, n, nRows, o, ref, ref1, row, rows, subarray, value;

        // Get the number of rows in buffer
        nRows = buffer.byteLength / this.rowByteSize;

        // Interpret the buffer
        arr = new Uint8Array(buffer);

        // Storage for rows
        rows = [];

        // Loop over the number of rows
        for (i = j = 0, ref = nRows - 1; (0 <= ref ? j <= ref : j >= ref); i = 0 <= ref ? ++j : --j) {

            // Get the subarray for current row
            begin = i * this.rowByteSize;
            end = begin + this.rowByteSize;
            subarray = arr.subarray(begin, end);

            // Convert to string representation
            line = '';
            for (n = 0, len = subarray.length; n < len; n++) {
                value = subarray[n];
                line += String.fromCharCode(value);
            }
            line = line.trim().split(/\s+/);

            // Storage for current row
            row = {};
            ref1 = this.accessors;

            // Convert to correct data type using accessor functions
            for (index = o = 0, len1 = ref1.length; o < len1; index = ++o) {
                accessor = ref1[index];
                value = line[index];
                row[this.columns[index]] = accessor(value);
            }

            // Store row on array
            rows.push(row);
        }
        return rows;
    }

}