import { Model } from './model';
import { IPrimaryKeyPairs } from './types';
export declare abstract class Association {
    to: typeof Model;
    toKeyMap: IPrimaryKeyPairs;
    multiAssociation: boolean;
    constructor(to: typeof Model, foreignKeyMap: IPrimaryKeyPairs, multiAssociation: boolean);
}
export declare class HasOneAssociation extends Association {
    constructor(to: typeof Model, foreignKeyMap: IPrimaryKeyPairs);
}
export declare class HasManyAssocation extends Association {
    constructor(to: typeof Model, foreignKeyMap: IPrimaryKeyPairs);
}
export declare class BelongsToAssociation extends Association {
    constructor(to: typeof Model, foreignKeyMap: IPrimaryKeyPairs);
}
export declare class BelongsToManyAssociation extends Association {
    through: typeof Model;
    fromKeyMap: IPrimaryKeyPairs;
    constructor(to: typeof Model, through: typeof Model, fromKeyMap: IPrimaryKeyPairs, toKeymap: IPrimaryKeyPairs);
}
