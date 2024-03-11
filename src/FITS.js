export class FITS {

    constructor(file_path) {
        this.file_path = file_path;
    }



    /*
    constructor(file_path, callback, opts) {

        let parser;

        this.file_path = file_path;
        this.callback = callback;

        parser = new Parser(this.file_path, this.callback)


        parser = new Parser(this.arg, (fits) => {
            this.hdus = parser.hdus;
            return this.invoke(callback, opts, this);
        });


    }
    */

    setFITS(parser) {

        console.log("FITS");
        console.log(parser);

        console.log(this.callback);
        console.log(this);

        this.hdus = parser.hdus;
        //this.callback(this);
    }

    // Public API

    // Returns the first HDU containing a data unit.  An optional argument may be passed to retreive
    // a specific HDU
    getHDU(index) {
        var hdu, j, len, ref;
        if ((index != null) && (this.hdus[index] != null)) {
            return this.hdus[index];
        }
        ref = this.hdus;
        for (j = 0, len = ref.length; j < len; j++) {
            hdu = ref[j];
            if (hdu.hasData()) {
                return hdu;
            }
        }
    }

    // Returns the header associated with the first HDU containing a data unit.  An optional argument
    // may be passed to point to a specific HDU.
    getHeader(index) {
        return this.getHDU(index).header;
    }

    // Returns the data object associated with the first HDU containing a data unit.  This method does not read from the array buffer
    // An optional argument may be passed to point to a specific HDU.
    getDataUnit(index) {
        return this.getHDU(index).data;
    }

}