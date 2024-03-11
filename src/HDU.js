export class HDU {

    constructor(header, data) {
        this.header = header;
        this.data = data;
    }

    hasData() {
        if (this.data != null) {
            return true;
        } else {
            return false;
        }
    }

}