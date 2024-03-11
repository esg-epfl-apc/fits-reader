 export class FITSFile {

    hdus = [];

    /*
    constructor(parser) {
        this.hdus = parser.hdus;
    }
    */

    constructor() {

    }

    addHDU(hdu) {
        this.hdus.push(hdu)
    }

    isValid() {
        return true;
    }

    // Returns the first HDU containing a data unit.  An optional argument may be passed to retreive
    // a specific HDU
    getHDU(index) {
        let hdu, j, len, ref;
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