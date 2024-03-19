export class ObjUtils {

    constructor() {

    }

    invoke(callback, opts, data) {
        let context;
        context = (opts != null ? opts.context : void 0) != null ? opts.context : this;
        if (callback != null) {
            return callback.call(context, data, opts);
        }
    }

}