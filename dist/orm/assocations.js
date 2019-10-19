"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Association {
    constructor(to, foreignKeyMap, multiAssociation) {
        this.to = to;
        this.toKeyMap = foreignKeyMap;
        this.multiAssociation = multiAssociation;
    }
}
exports.Association = Association;
class HasManyAssocation extends Association {
    constructor(to, foreignKeyMap) {
        super(to, foreignKeyMap, true);
    }
}
exports.HasManyAssocation = HasManyAssocation;
class BelongsToAssociation extends Association {
    constructor(to, foreignKeyMap) {
        super(to, foreignKeyMap, false);
    }
}
exports.BelongsToAssociation = BelongsToAssociation;
class BelongsToManyAssociation extends Association {
    constructor(to, through, fromKeyMap, toKeymap) {
        super(to, toKeymap, true);
        this.through = through;
        this.fromKeyMap = fromKeyMap;
    }
}
exports.BelongsToManyAssociation = BelongsToManyAssociation;
//# sourceMappingURL=assocations.js.map