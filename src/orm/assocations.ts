import { Model } from './model';
import { IPrimaryKeyPairs } from './types';

export abstract class Association {
    public to: typeof Model;
    public toKeyMap: IPrimaryKeyPairs;
    public multiAssociation: boolean;
    constructor(to: typeof Model, foreignKeyMap: IPrimaryKeyPairs, multiAssociation: boolean) {
        this.to = to;
        this.toKeyMap = foreignKeyMap;
        this.multiAssociation = multiAssociation;
    }
}

export class HasManyAssocation extends Association {
    constructor(to: typeof Model, foreignKeyMap: IPrimaryKeyPairs) {
        super(to, foreignKeyMap, true);
    }
}

export class BelongsToAssociation extends Association {
    constructor(to: typeof Model, foreignKeyMap: IPrimaryKeyPairs) {
        super(to, foreignKeyMap, false);
    }
}

export class BelongsToManyAssociation extends Association {
    public through: typeof Model;
    public fromKeyMap: IPrimaryKeyPairs;
    constructor(to: typeof Model, through: typeof Model, fromKeyMap: IPrimaryKeyPairs, toKeymap: IPrimaryKeyPairs) {
        super(to, toKeymap, true);
        this.through = through;
        this.fromKeyMap = fromKeyMap;
    }
}
