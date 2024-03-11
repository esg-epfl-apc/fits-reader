import { ClassA } from './ClassA.js';
import { ClassB } from './ClassB.js';
import BinaryTable from './BinaryTable.js'
import { CompressedImage } from './CompressedImage.js'
import { DataUnit } from './DataUnit.js'
import { Decompress } from './Decompress.js'
import { FITS } from './FITS.js'
import { FITSFile } from './FITSFile.js'
import { FITSReader } from './FITSReader.js'
import { HDU } from './HDU.js'
import { Header } from './Header.js'
import { HeaderVerify } from './HeaderVerify.js'
import { Image } from './Image.js'
import { ImageUtils } from './ImageUtils.js'
import Parser from './Parser.js'
import { Table } from './Table.js'
import Tabular from './Tabular.js'

//import { awilix } from './awilix/lib/awilix.js'
//import { createContainer, asClass } from './nodemodules/awilix';

/*
import {
    asValue,
    asFunction,
    asClass,
    InjectionMode,
    createContainer,
} from "awilix";

const container = createContainer({
    injectionMode: InjectionMode.PROXY,
    strict: true,
})

container.register({
    classA: asClass(ClassA),
    classB: asClass(ClassB),
});

const classB = container.resolve(ClassB);
const classA = container.resolve(ClassA);
const binaryTable = container.resolve(BinaryTable);
const compressedImage = container.resolve(CompressedImage);
const dataUnit = container.resolve(DataUnit);
const decompress = container.resolve(Decompress);
const fits = container.resolve(FITS);
const fitsFile = container.resolve(FITSFile);
const fitsReader = container.resolve(FITSReader);
const hdu = container.resolve(HDU);
const header = container.resolve(Header);
const headerVerify = container.resolve(HeaderVerify);
const image = container.resolve(Image);
const imageUtils = container.resolve(ImageUtils);
const parser = container.resolve(Parser);
const table = container.resolve(Table);
const tabular = container.resolve(Tabular);

*/

function getFile(file_path) {

    return fetch(file_path)
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error, status = ${response.status}`);
            }
            return response.arrayBuffer();
        })
        .then((buffer) => readFile(buffer, file_path));
}

function readFile(arrayBuffer, file_path) {
    let fits_reader = new FITSReader(file_path, arrayBuffer);

    console.log("start parsing main")

    let fits_file = fits_reader.parseFile();

    console.log("parsing complete main")

    console.log(fits_file);
}

getFile("spi_acs_FULL_SKY_lc.fits");


function print() {
    console.log("aaaaa");
}

const FITSLibrary = {
    print_logs: function() {
        console.log("aaaaa");
    }
};

// Export the MyLibrary object for webpack bundling
export default FITSLibrary;

//classA.displayLogs();