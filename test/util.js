export const stringifyArgs = args => {
    if (!Array.isArray(args)) {
        return String(args);
    }
    return String(args.map(arg => typeof arg === 'function' ? `(${arg.length}-ary fn)` : String(JSON.stringify(arg))));
}