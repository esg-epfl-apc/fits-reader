import {Parser} from "./Parser";
import {FITSFile} from "./FITSFile";

export class FITSReader {

    array_buffer = null;
    parser = null;

    constructor(array_buffer) {
        this.array_buffer = array_buffer;
        this.parser = new Parser(array_buffer, new FITSFile())
    }

    parseFile() {
        return this.parser.parseFileFromBuffer(this.array_buffer);
    }

}