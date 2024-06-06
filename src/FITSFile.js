 export class FITSFile {

    hdus = [];

    constructor() {

    }

    addHDU(hdu) {
        this.hdus.push(hdu)
    }

    // Returns the first HDU containing a data unit.  An optional argument may be passed to retreive
    // a specific HDU
     /*
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
    */

    getHDU(hdu_index) {
        if(hdu_index >= 0 && hdu_index < this.file.hdus.length) {
            return this.hdus[hdu_index];
        } else {
            return null;
        }
    }

     getHDUs() {
         let HDUs = [];
         let hdu_object;
         let type;
         let extname = '';

         this.hdus.forEach(function(hdu, index) {

             if (hdu.header.primary === true) {
                 type = "PRIMARY";
             } else {
                 type = hdu.header.get('XTENSION');
                 extname = hdu.header.get('EXTNAME');
             }

             hdu_object = {
                 "name": type,
                 "index": index,
                 "extname": extname
             };

             HDUs.push(hdu_object);
         })

         return HDUs;
     }

     getTabularHDUs() {
         let tabular_hdus_index = [];

         this.hdus.forEach(function(hdu, index) {
             if (hdu.header.primary !== true) {
                 if(hdu.header.get('XTENSION') === "TABLE" || hdu.header.get('XTENSION') === "BINTABLE") {
                     tabular_hdus_index.push(index);
                 }
             }
         })

         return tabular_hdus_index;
     }

     getNumberOfColumnFromHDU(hdu_index) {
         let hdu = this.getHDU(hdu_index);

         let header = hdu.header;
         let data = hdu.data;

         let type = header.get('XTENSION');

         let column_number = null;

         if(type === 'BINTABLE' || type === 'TABLE') {
             column_number = data.cols;
         } else {
             return null;
         }

         return column_number;
     }

     getColumnsNameFromHDU(hdu_index) {
         let hdu = this.getHDU(hdu_index);

         let header = hdu.header;
         let data = hdu.data;

         let type = header.get('XTENSION');

         let columns = [];
         let column_name;

         if(type === 'BINTABLE' || type === 'TABLE') {
             data.columns.forEach(function (column) {
                 column_name = column;

                 columns.push(column_name);
             })
         } else {
             return null;
         }

         return columns;
     }

     getColumnsJSONDataFromHDU(hdu_index) {
         let hdu = this.getHDU(hdu_index);

         let header = hdu.header;
         let data = hdu.data;

         let type = header.get('XTENSION');

         let columns_data_json = [];
         let raw_columns_data_array = [];
         let column_data;

         if(type === 'BINTABLE' || type === 'TABLE') {
             data.columns.forEach(function(column) {

                 try {
                     data.getColumn(column, function (col) {
                         column_data = col;
                     })

                     raw_columns_data_array[column] = column_data;
                 } catch(e) {
                    //column data cannot be accessed so column is not added to the array
                 }

             })

             let column_names = Object.keys(raw_columns_data_array);

             for (let i = 0; i < raw_columns_data_array[column_names[0]].length; i++) {

                 let column_json_data_object = {};

                 column_names.forEach((column_name) => {
                     column_json_data_object[column_name] = raw_columns_data_array[column_name][i];
                 });

                 columns_data_json.push(column_json_data_object);
             }

         } else {
             return null;
         }

         return columns_data_json;
     }

     getColumnDataFromHDU(hdu_index, column_name) {
         let hdu = this.getHDU(hdu_index);

         let header = hdu.header;
         let data = hdu.data;

         let type = header.get('XTENSION');

         let col_data = [];
         if(type === 'BINTABLE' || type === 'TABLE') {

             data.getColumn(column_name, function(col){
                 if(col[0] === undefined) {
                     let header_col_data = hdu.header.get(column_name);
                     col = col.map(() => header_col_data);
                 }

                 col_data = col;
             })

         } else {
             return null;
         }

         return col_data;
     }

     getHeaderFromHDU(hdu_index) {
         let hdu = this.getHDU(hdu_index);
         let header = hdu.header;

         return header;
     }

     getDataFromHDU(hdu_index) {
         let hdu = this.getHDU(hdu_index);
         let data = hdu.data;

         return data;
     }

     getHeaderCardValueByNameFromHDU(hdu_index, card_name) {
         let hdu = this.getHDU(hdu_index);
         let header = hdu.header;

         let value = header.get(card_name);

         if(value === undefined) {
             value = '';
         }

         return value;
     }

     getHeaderCardsValueFromHDU(hdu_index) {
         let hdu = this.getHDU(hdu_index);

         const cards_array = [];

         Object.entries(hdu.header.cards).forEach(function(item) {
             let item_value_array = item[1];

             if(typeof item_value_array === 'object' && !Array.isArray(item_value_array)) {
                 item_value_array['card_name'] = item[0];
                 cards_array.push(item_value_array);
             }
         })

         let sorted_hdu_cards = cards_array.sort((a, b) => a.index - b.index);

         return sorted_hdu_cards;
     }

     isHDUTabular(hdu_index) {
         let is_tabular = false;

         let hdu = this.getHDU(hdu_index);
         let header = hdu.header;

         let type = header.get('XTENSION');

         if(type === 'BINTABLE' || type === 'TABLE') {
             is_tabular = true;
         }

         return is_tabular;
     }

}