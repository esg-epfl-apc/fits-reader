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

    // Returns the first HDU containing a data unit.  An optional argument may be passed to retreive
    // a specific HDU
    getHDU(index) {
        console.log("hdus");
        console.log(this);
        console.log(this.hdus);
        console.log(this.hdus[1]);
        console.log("hdus");

        let hdu, j, len, ref;

        if ((index != null) && (this.hdus[index] != null)) {
            console.log("hdu");
            return this.hdus[index];
        }

        console.log("AAAAA");

        ref = this.hdus;
        for (j = 0, len = ref.length; j < len; j++) {
            hdu = ref[j];
            console.log(hdu);
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