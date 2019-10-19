"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
function arrayIfNot(arr) {
    return Array.isArray(arr) ? arr : [arr];
}
exports.arrayIfNot = arrayIfNot;
function removeUndefined(obj) {
    return lodash_1.pickBy(obj, (v) => v !== undefined);
}
exports.removeUndefined = removeUndefined;
//# sourceMappingURL=util.js.map