import bundler from './bundler';
import { combineReducers } from 'redux';

/*
const loadUsersForGroup = group => ({
    type: 'LOAD_USERS',
    group,
    ....
});

const reducer = keyBy(action => action.type, action => action.group)(finalReducer);
const selector = groupSelector => keyedBy(() =>'LOAD_USERS', groupSelector)(finalSelector);

// arg -> payload -> (serialize) -> reducerKey == selectorKey <- (serialize) <- inputSelector
[
    {
        name: 'group',
        getId: group => group.id
    }
]

const {
    request,
    success,
    failure,
    reducer,
    selector
} = entityDuck(
    'LOAD_USERS',
    function getId(entity) {
        return entity.id;
    },
    function payloadCreator(group) {
        return { group };
    },
    [
        payload => payload.group
    ]
)(
    function leafReducer(state, action) {
        switch(action.status) {
            case 'pending':
                return {
                    ...state,
                    loading: true,
                };
            case 'succeeded':
                return {
                    ...state,
                    loading: false
                }
        }
    },
    function leafSelector(state) {

    }
);
*/

const keyBy = (...keySelectors) => leafReducer => (state = {}, action) => {
    const keys = [];
    let oldLeafState = state;
    for (let i = 0; i < keySelectors.length; i++) {
        const key = keySelectors[i](action);
        if (key == null) { // if any key is invalid, return the previous state
            return state;
        }
        keys.push(key);
        oldLeafState = oldLeafState && oldLeafState[key];
    }

    const newLeafState = leafReducer(oldLeafState, action);
    // return the old state if it would be unchanged
    if (oldLeafState === newLeafState) {
        return state;
    }

    const newState = { ...state };
    const lastKey = keys.pop();
    const leafState = keys.reduce((leafState, key) => {
        return (leafState[key] = { ...leafState[key] });
    }, newState);
    leafState[lastKey] = newLeafState;
    return newState;
};
const keyedBy = (...keySelectors) => leafSelector => (state, props) => {
    const keys = [];
    let leafState = state;
    for (let i = 0; i < keySelectors.length; i++) {
        if (leafState === null) {
            return leafSelector(undefined, props);
        }
        const key = keySelectors[i](action);
        if (key == null) {
            return leafSelector(undefined, props);
        }
        leafState = leafState[key];
    }
    return leafSelector(leafState, props);
};

const entityDuck = (entityType, getId) => {
    //TODO - support multiple action types that all modify the same entities state, but different requests state.
    return (type, payloadCreator, reducerKeys, getEntities, getErrors, getPagingInfo) => {
        const request = (...args) => ({
            type,
            entityType,
            status: 'pending',
            payload: payloadCreator(...args)
        });
        const success = (requestAction, payload) => ({
            type,
            entityType,
            status: 'succeeded',
            context: requestAction,
            payload
        });
        const failure = (requestAction, payload) => ({
            type,
            entityType,
            status: 'failed',
            context: requestAction,
            payload
        });
        const entitiesReducer = function (state = {}, action) {
            if (action.type === type && action.status === 'succeeded') {
                const entities = getEntities(action);
                if (0 === entities.length) {
                    return state;
                }
                const newState = { ...state };
                entities.forEach(entity => {
                    newState[getId(entity)] = entity;
                });
                return newState;
            }
        };
        const requestsReducer = keyBy(...reducerKeys)(function(entityState = {}, action) {
            switch (action.status) {
                case 'pending':
                    return {
                        ...entityState,
                        loading: true,
                    };
                case 'failed':
                    return {
                        ...entityState,
                        loading: false,
                        errors: getErrors(action),
                    };
                case 'succeeded':
                    return {
                        loading: false,
                        errors: null,
                        pagingInfo: getPagingInfo(action),
                        ids: (entityState.ids || []).concat(getEntities(action).map(entity => getId(entity))),
                    };
            }
        });
        const combinedReducer = combineReducers({
            entities: entitiesReducer,
            requests: requestsReducer,
        });
        const reducer = (state = {}, action) => {
            if (action.type !== type) {
                return state;
            }
            return combinedReducer(state, action);
        };
        const selector = (...keySelectors) => {
            if (keySelectors.length !== reducerKeys.length) {
                throw new Error("The number of provided input selectors doesn't match the expected number of context inputs.");
            }
            return keyedBy(() => 'requests', () => type, ...keySelectors)(makeLeafSelector());
        }
        return {
            request,
            success,
            failure,
            reducer, // need one per ENTITY
            selector, // need one per action type
        };
    };
};