import Parser from "./Parser";
import {FITSFile} from "./FITSFile";

export class FITSReader {

    file_path = null;
    array_buffer = null;
    parser = null;

    constructor(file_path, array_buffer) {
        this.file_path = file_path;
        this.array_buffer = array_buffer;
        this.parser = new Parser(array_buffer, new FITSFile())
    }

    parseFile() {
        return this.parser.parseFileFromBuffer(this.array_buffer);
    }

}