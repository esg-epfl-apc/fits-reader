export class HeaderVerify {

    constructor() {
        this.cardIndex = 0;
        this.primary = false;
        this.extension = false;
        this.extensionType = null;
    }

    verifyOrder(keyword, order) {
        if (order !== this.cardIndex) {
            console.warn(`${keyword} should appear at index ${this.cardIndex} in the FITS header`);
        }
    }

    verifyBetween(keyword, value, lower, upper) {
        if (!(value >= lower && value <= upper)) {
            throw `The ${keyword} value of ${value} is not between ${lower} and ${upper}`;
        }
    }

    verifyBoolean(value) {
        return value === "T";
    }

    SIMPLE(value) {
        this.primary = true;
        this.verifyOrder("SIMPLE", 0);
        return this.verifyBoolean(value);
    }

    XTENSION(value) {
        this.extension = true;
        this.extensionType = value;
        this.verifyOrder("XTENSION", 0);

        return this.extensionType;
    }

    BITPIX(value) {
        const key = "BITPIX";
        value = parseInt(value);
        this.verifyOrder(key, 1);
        if (![8, 16, 32, -32, -64].includes(value)) {
            throw `${key} value ${value} is not permitted`;
        }
        return value;
    }

    /*
    NAXIS(value, array) {
        const key = "NAXIS";
        value = parseInt(value);
        if (!array) {
            this.verifyOrder(key, 2);
            this.verifyBetween(key, value, 0, 999);
            if (this.isExtension()) {
                if (["TABLE", "BINTABLE"].includes(this.extensionType)) {
                    const required = 2;
                    if (value !== required) {
                        throw `${key} must be ${required} for TABLE and BINTABLE extensions`;
                    }
                }
            }
        }
        return value;
    }
    */

    NAXIS(value, array) {
        const key = "NAXIS";
        value = parseInt(value);
        if (!array) {
            this.verifyOrder(key, 2);
            this.verifyBetween(key, value, 0, 999);
        }
        return value;
    }

    /*
    PCOUNT(value) {
        const key = "PCOUNT";
        value = parseInt(value);
        const order = 1 + 1 + 1 + this.NAXIS();
        this.verifyOrder(key, order);
        if (this.isExtension()) {
            if (["IMAGE", "TABLE"].includes(this.extensionType)) {
                const required = 0;
                if (value !== required) {
                    throw `${key} must be ${required} for the ${this.extensionType} extensions`;
                }
            }
        }
        return value;
    }
    */

    PCOUNT(value) {
        const key = "PCOUNT";
        value = parseInt(value);
        const order = 1 + 1 + 1 + this.NAXIS();
        this.verifyOrder(key, order);

        return value;
    }

    /*
    GCOUNT(value, isExtension) {
        const key = "GCOUNT";
        value = parseInt(value);
        const order = 1 + 1 + 1 + this.NAXIS() + 1;
        this.verifyOrder(key, order);
        if (isExtension) {
            if (["IMAGE", "TABLE", "BINTABLE"].includes(this.extensionType)) {
                const required = 1;
                if (value !== required) {
                    throw `${key} must be ${required} for the ${this.extensionType} extensions`;
                }
            }
        }
        return value;
    }
    */

    GCOUNT(value) {
        const key = "GCOUNT";
        value = parseInt(value);
        const order = 1 + 1 + 1 + this.NAXIS() + 1;
        this.verifyOrder(key, order);

        return value;
    }

    /*
    EXTEND(value, isPrimary) {
        if (!isPrimary) {
            throw "EXTEND must only appear in the primary header";
        }

        return this.verifyBoolean(value);
    }
    */

    EXTEND(value) {
        return this.verifyBoolean(value);
    }

    BSCALE(value) {
        return parseFloat(value);
    }

    BZERO(value) {
        return parseFloat(value);
    }

    BLANK(value) {
        value = parseInt(value);
        if (!(this.get("BITPIX") > 0)) {
            console.warn(`BLANK is not to be used for BITPIX = ${this.get('BITPIX')}`);
        }
        return value;
    }

    DATAMIN(value) {
        return parseFloat(value);
    }

    DATAMAX(value) {
        return parseFloat(value);
    }

    EXTVER(value) {
        return parseInt(value);
    }

    EXTLEVEL(value) {
        return parseInt(value);
    }

    TFIELDS(value) {
        value = parseInt(value);
        this.verifyBetween("TFIELDS", value, 0, 999);
        return value;
    }

    TBCOL(value, index) {
        value = parseInt(value);
        this.verifyBetween("TBCOL", index, 0, this.get("TFIELDS"));
        return value;
    }

    ZIMAGE(value) {
        return this.verifyBoolean(value);
    }

    ZCMPTYPE(value) {
        if (!["GZIP_1", "RICE_1", "PLIO_1", "HCOMPRESS_1"].includes(value)) {
            throw `ZCMPTYPE value ${value} is not permitted`;
        }
        if (value !== 'RICE_1') {
            throw `Compress type ${value} is not yet implement`;
        }
        return value;
    }

    ZBITPIX(value) {
        value = parseInt(value);
        if (![8, 16, 32, 64, -32, -64].includes(value)) {
            throw `ZBITPIX value ${value} is not permitted`;
        }
        return value;
    }

    ZNAXIS(value, array) {
        value = parseInt(value);
        if (!array) {
            this.verifyBetween("ZNAXIS", value, 0, 999);
        }
        return value;
    }

    ZTILE(value) {
        return parseInt(value);
    }

    ZSIMPLE(value) {
        return value === "T";
    }

    ZPCOUNT(value) {
        return parseInt(value);
    }

    ZGCOUNT(value) {
        return parseInt(value);
    }

    ZDITHER0(value) {
        return parseInt(value);
    }
}