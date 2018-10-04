import { bindActionCreators } from "redux";

/*
//usage of pack
packAll({
    fromContext: {
        selector: (state, contextA, contextB) => `itemsInContext`, // or a function returning this to make one per component
        actions: (contextA, contextB) => `actionsForContext`,
    }
})
const users = packAll({
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

const checkPacketDescriptor = (packetDescriptor, name, calledFnName, argExpectation) => {
    if (typeof packetDescriptor !== 'object' || packetDescriptor === null) {
        throw new TypeError(`${calledFnName} expects ${argExpectation}an object, but ${name} was not.`);
    }
    if (packetDescriptor.selector && typeof packetDescriptor.selector !== 'function') {
        throw new TypeError(`${calledFnName} expects selector to be a function, but ${name}.selector was not.`);
    }
    if (packetDescriptor.actions && (typeof packetDescriptor.actions !== 'function' && typeof packetDescriptor.actions !== 'object')) {
        throw new TypeError(`${calledFnName} expects actions to be a function or object, but ${name}.actions was not.`);
    }
};

const checkPacketMapAndGetNames = packetMap => {
    if (typeof packetMap !== 'object' || packetMap === null) {
        throw new TypeError('packAll(packetMap) expects packetMap to be an object.');
    }
    if (Array.isArray(packetMap)) {
        throw new TypeError('packAll(packetMap) expects packetMap to be an object, not an Array.');
    }
    const packetNames = Object.keys(packetMap);
    if (packetNames.length === 0) {
        throw new TypeError('packAll(packetMap) expected to receive an object with properties, but found no properties.')
    }
    return packetNames;
};

const selectorExecutor = selectors => {
    selectors = selectors.map(selector => typeof selector === 'function' ? selector : () => selector);
    return props => selectors.map(selector => selector(props));
};

const internalPack = (packetDescriptor, name) => {
    const PacketMaker = (...contextSelectors) => {
        const hasContext = contextSelectors.length !== 0;
        const executeContextSelectors = hasContext && selectorExecutor(contextSelectors);
        if ('minimumSelectorsExpected' in packetDescriptor && contextSelectors.length < packetDescriptor.minimumSelectorsExpected) {
            throw new Error(`The packet ${name} expects at least ${packetDescriptor.minimumSelectorsExpected} selectors to be provided.`);
        }
        const mapStateToProps = packetDescriptor.selector ? (firstState, firstProps) => {
            const firstContext = hasContext ? executeContextSelectors(firstProps) : [];
            let firstValue = packetDescriptor.selector(firstState, ...firstContext);
            if (typeof firstValue !== 'function') { // no factory, fully memoized first call
                return memoizeFirstMapStateToProps(packetDescriptor.selector, executeContextSelectors, firstState, firstProps, firstValue, firstContext);
            }
            if (hasContext) { // factory, but memoize first context if we can. Passing in a new object as firstState means we'll never return a memoized firstValue
                return memoizeFirstMapStateToProps(firstValue, executeContextSelectors, {}, firstProps, null, firstContext);
            }
            // factory, no context, no memoization
            return state => firstValue(state);
        } : null;
        const mapDispatchToProps = typeof packetDescriptor.actions === 'function' ?
            hasContext ?
                (dispatch, props) => packetDescriptor.actions(dispatch, ...executeContextSelectors(props)) :
                dispatch => packetDescriptor.actions(dispatch) :
                packetDescriptor.actions ?
                dispatch => bindActionCreators(packetDescriptor.actions, dispatch) :
                null;
        return {
            mapStateToProps,
            mapDispatchToProps,
        };
    };
    if (name) {
        Object.defineProperty(PacketMaker, 'name', {
            writable: false,
            enumerable: false,
            configurable: true,
            value: `PacketMaker(${name})`
        });
    }
    return PacketMaker;
};

export const pack = (packetDescriptor, name) => {
    checkPacketDescriptor(packetDescriptor, "packetDescriptor", "pack(packetDescriptor)", "");
    return internalPack(packetDescriptor, name);
};

export const packAll = packetMap => {
    const packetNames = checkPacketMapAndGetNames(packetMap);
    return packetNames.reduce((o,name) => {
        const packetDescriptor = packetMap[name];
        checkPacketDescriptor(packetDescriptor, `packetMap['${name}']`, "packAll(packetMap)", "each property to be ");
        o[name] = internalPack(packetDescriptor, name);
        return o;
    }, {});
};