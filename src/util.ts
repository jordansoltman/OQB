import { pickBy } from 'lodash';

export function arrayIfNot<T>(arr: T[] | T): T[] {
    return Array.isArray(arr) ? arr : [arr];
}

export function removeUndefined(obj: any) {
    return pickBy(obj, (v) => v !== undefined);
}
