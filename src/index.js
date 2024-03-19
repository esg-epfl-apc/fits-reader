import {FITSReader} from './FITSReader.js'

export function parseFITS(array_buffer) {
    let fits_reader = new FITSReader(array_buffer);

    let fits_file = fits_reader.parseFile();

    return fits_file;
}