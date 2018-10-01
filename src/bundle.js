import { bindActionCreators } from "redux";

/*
//usage of bundle
bundler({
    fromContext: {
        selector: (state, contextA, contextB) => `itemsInContext`, // or a function returning this to make one per component
        actions: (contextA, contextB) => `actionsForContext`,
    }
})
const users = bundle({
    fromGroup: {
        selector: () => createStructuredSelector({
            users: usersForGroupSelector,
            usersLoading: usersLoadingForGroupSelector,
            usersAllLoaded: usersAllLoadedForGroupSelector,
            usersLoadingErrors: usersLoadingErrorsForGroupSelector,
        }),
        actions: (dispatch, group) => ({
            loadUsers: () => dispatch(loadUsersForGroup(group)),
            addUserToGroup: user => dispatch(addUserToGroup(user, group)),
        }), // OR a raw object like actions: { actionA: actionCreatorA, actionB: actionCreatorB }
    },
    byPermission: { ... }
})
*/

const memoizeFirstMapStateToProps = (selector, executeContextSelectors, firstState, firstProps, firstValue, firstContext) => {
    if (executeContextSelectors) {
        let inner = (state, props) => {
            inner = (state, props) => selector(state, ...executeContextSelectors(props));
            if (props !== firstProps) { // nothing salvageable
                return inner(state, props); 
            }
            if (state !== firstState) { 
                return selector(state, ...firstContext); // same props, can memoize contexts
            }
            return firstValue;// same props and state, can return first value
        };
        return (state, props) => inner(state, props);
    }
    let inner = state => {
        inner = selector;
        return state === firstState ?
            firstValue :
            inner(state);
    };
    return state => inner(state);
};

const checkBundleDescriptor = (bundleDescriptor, name, calledFnName, argExpectation) => {
    if (typeof bundleDescriptor !== 'object' || bundleDescriptor === null) {
        throw new TypeError(`${calledFnName} expects ${argExpectation}an object, but ${name} was not.`);
    }
    if (bundleDescriptor.selector && typeof bundleDescriptor.selector !== 'function') {
        throw new TypeError(`${calledFnName} expects selector to be a function, but ${name}.selector was not.`);
    }
    if (bundleDescriptor.actions && (typeof bundleDescriptor.actions !== 'function' && typeof bundleDescriptor.actions !== 'object')) {
        throw new TypeError(`${calledFnName} expects actions to be a function or object, but ${name}.actions was not.`);
    }
};

const checkBundleMapAndGetNames = bundleMap => {
    if (typeof bundleMap !== 'object' || bundleMap === null) {
        throw new TypeError('bundleAll(bundleMap) expects bundleMap to be an object.');
    }
    if (Array.isArray(bundleMap)) {
        throw new TypeError('bundleAll(bundleMap) expects bundleMap to be an object, not an Array.');
    }
    const bundleNames = Object.keys(bundleMap);
    if (bundleNames.length === 0) {
        throw new TypeError('bundleAll(bundleMap) expected to receive an object with properties, but found no properties.')
    }
    return bundleNames;
};

const selectorExecutor = selectors => {
    selectors = selectors.map(selector => typeof selector === 'function' ? selector : () => selector);
    return props => selectors.map(selector => selector(props));
};

const internalBundle = (bundleDescriptor, name) => {
    const Bundle = (...contextSelectors) => {
        const hasContext = contextSelectors.length !== 0;
        const executeContextSelectors = hasContext && selectorExecutor(contextSelectors);
        if ('minimumSelectorsExpected' in bundleDescriptor && contextSelectors.length < bundleDescriptor.minimumSelectorsExpected) {
            throw new Error(`The bundle ${name} expects at least ${bundleDescriptor.minimumSelectorsExpected} selectors to be provided.`);
        }
        const mapStateToProps = bundleDescriptor.selector ? (firstState, firstProps) => {
            const firstContext = hasContext ? executeContextSelectors(firstProps) : [];
            let firstValue = bundleDescriptor.selector(firstState, ...firstContext);
            if (typeof firstValue !== 'function') { // no factory, fully memoized first call
                return memoizeFirstMapStateToProps(bundleDescriptor.selector, executeContextSelectors, firstState, firstProps, firstValue, firstContext);
            }
            if (hasContext) { // factory, but memoize first context if we can. Passing in a new object as firstState means we'll never return a memoized firstValue
                return memoizeFirstMapStateToProps(firstValue, executeContextSelectors, {}, firstProps, null, firstContext);
            }
            // factory, no context, no memoization
            return state => firstValue(state);
        } : null;
        const mapDispatchToProps = typeof bundleDescriptor.actions === 'function' ?
            hasContext ?
                (dispatch, props) => bundleDescriptor.actions(dispatch, ...executeContextSelectors(props)) :
                dispatch => bundleDescriptor.actions(dispatch) :
            bundleDescriptor.actions ?
                dispatch => bindActionCreators(bundleDescriptor.actions, dispatch) :
                null;
        return {
            mapStateToProps,
            mapDispatchToProps,
        };
    };
    if (name) {
        Object.defineProperty(Bundle, 'name', {
            writable: false,
            enumerable: false,
            configurable: true,
            value: `Bundle(${name})`
        });
    }
    return Bundle;
};

export const bundle = (bundleDescriptor, name) => {
    checkBundleDescriptor(bundleDescriptor, "bundleDescriptor", "bundle(bundleDescriptor)", "");
    return internalBundle(bundleDescriptor, name);
};

export const bundleAll = bundleMap => {
    const bundleNames = checkBundleMapAndGetNames(bundleMap);
    return bundleNames.reduce((o,name) => {
        const bundleDescriptor = bundleMap[name];
        checkBundleDescriptor(bundleDescriptor, `bundleMap['${name}']`, "bundleAll(bundleMap)", "each property to be ");
        o[name] = internalBundle(bundleDescriptor, name);
        return o;
    }, {});
};