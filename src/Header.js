// Parse and store a FITS header.  Verification is done for reserved
// keywords (e.g. SIMPLE, BITPIX, etc).
export class Header {


    //Header.include(HeaderVerify);

    arrayPattern = /(\D+)(\d+)/;


    // Headers can become extremely large (for instance after Drizzle). This parameters
    // limits the number of lines that are parsed.  Typically the important information
    // describing the structure of the associated data unit and astrometry are near the
    // top.
    maxLines = 600;

    constructor(block, headerVerify = null) {

        let method, name, ref;

        this.headerVerify = headerVerify;
        this.supportedCards = null;

        this.primary = headerVerify.primary;
        this.extension = !this.primary;

        // Add verification methods to instance
        //this.verifyCard = {};

        /*
        ref = this.VerifyFns;
        for (name in ref) {
            method = ref[name];
            this.verifyCard[name] = this.proxy(method);
        }
        */

        if(headerVerify != null) {
            const propertyNames = Object.getOwnPropertyNames(Object.getPrototypeOf(this.headerVerify));
            this.supportedCards = propertyNames.filter(name => typeof headerVerify[name] === 'function');
        }

        // e.g. [index, value, comment]
        this.cards = {};
        this.cards["COMMENT"] = [];
        this.cards["HISTORY"] = [];
        this.cardIndex = 0;
        this.block = block;
        this.readBlock(block);
    }


    // Get the value for a key
    get(key) {
        if (this.contains(key)) {
            return this.cards[key].value;
        } else {
            return null;
        }
    }


    // Set value to key with optional comment
    set(key, value, comment) {
        comment = comment || '';
        this.cards[key] = {
            index: this.cardIndex,
            value: value,
            comment: comment
        };

        return this.cardIndex += 1;
    }


    // Checks if the header contains a specified keyword
    contains(key) {
        return this.cards.hasOwnProperty(key);
    }

    readLine(l) {
        let blank, comment, firstByte, indicator, key, value;

        // Check bytes 1 to 8 for key or whitespace
        key = l.slice(0, 8).trim();
        blank = key === '';
        if (blank) {
            return;
        }

        // Get indicator and value
        indicator = l.slice(8, 10);
        value = l.slice(10);

        // Check the indicator
        if (indicator !== "= ") {
            // Key will be either COMMENT, HISTORY or END
            // all else is outside the standard.
            if (key === 'COMMENT' || key === 'HISTORY') {
                this.cards[key].push(value.trim());
            }
            return;
        }

        // Check the value
        [value, comment] = value.split(' /');
        value = value.trim();

        // Values can be a string pattern starting with single quote
        // a boolean pattern (T or F), or a numeric
        firstByte = value[0];
        if (firstByte === "'") {
            // String data type
            value = value.slice(1, -1).trim();
        } else {
            // Boolean or numeric
            if (value !== 'T' && value !== 'F') {
                value = parseFloat(value);
            }
        }

        value = this.validate(key, value);
        //value = this.headerVerify[key](value);
        return this.set(key, value, comment);
    }

    validate(key, value) {
        let baseKey, index, isArray, match;

        index = null;
        baseKey = key;
        isArray = this.arrayPattern.test(key);

        if (isArray) {
            match = this.arrayPattern.exec(key);
            [baseKey, index] = match.slice(1);
        }

        if (baseKey in this.supportedCards) {
            value = this.headerVerify[baseKey](value, isArray, index);
        }

        return value;
    }

    readBlock(block) {
        let i, j, line, lineWidth, nLines, ref, results;
        lineWidth = 80;
        nLines = block.length / lineWidth;
        nLines = nLines < this.maxLines ? nLines : this.maxLines;
        results = [];
        for (i = j = 0, ref = nLines - 1; (0 <= ref ? j <= ref : j >= ref); i = 0 <= ref ? ++j : --j) {
            line = block.slice(i * lineWidth, (i + 1) * lineWidth);
            results.push(this.readLine(line));
        }
        return results;
    }


    // Tells if a data unit follows based on NAXIS
    hasDataUnit() {
        if (this.get("NAXIS") === 0) {
            return false;
        } else {
            return true;
        }
    }

    getDataLength() {
        let i, j, length, naxis, ref;
        if (!this.hasDataUnit()) {
            return 0;
        }
        naxis = [];
        for (i = j = 1, ref = this.get("NAXIS"); (1 <= ref ? j <= ref : j >= ref); i = 1 <= ref ? ++j : --j) {
            naxis.push(this.get(`NAXIS${i}`));
        }
        length = naxis.reduce(function(a, b) {
            return a * b;
        }) * Math.abs(this.get("BITPIX")) / 8;
        length += this.get("PCOUNT");
        return length;
    }


    // Determine the data unit type (e.g IMAGE, BINTABLE, TABLE, COMPRESSED)
    getDataType() {

        if(!this.extensionType) {
            this.extensionType = null;
        }

        if(this.cards['XTENSION']) {
            this.extensionType = this.cards['XTENSION'].value;
        }

        switch (this.extensionType) {
            case 'BINTABLE':
                if (this.contains('ZIMAGE')) {
                    return 'CompressedImage';
                }
                return 'BinaryTable';
            case 'TABLE':
                return 'Table';
            default:
                if (this.hasDataUnit()) {
                    return 'Image';
                } else {
                    return null;
                }
        }
    }


    // Determine type of header
    isPrimary() {
        return this.primary;
    }

    isExtension() {
        return this.extension;
    }

}