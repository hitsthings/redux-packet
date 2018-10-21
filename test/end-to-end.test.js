import React, { Fragment } from 'react';
import ReactDOM from 'react-dom';
import ReactTestUtils from 'react-dom/test-utils';
import { createStore } from 'redux';
import { connect, Provider } from 'react-redux';

import { packAll } from '../src/pack';
import { consume } from '../src/consume';

function immutableSet(o, path, v) {
    path = path.split('.');
    const modified = path.reduce((out, p) => out.concat(out[out.length - 1][p] || {}), [o]);
    const newObjects = modified.map((o, i) => i === modified.length - 1 ? v : {...o});
    path.forEach((p, i) => {
        newObjects[i][p] = newObjects[i+1];
    })
    return newObjects[0];
}
const store = createStore(function(state = {}, action) {
    if (action.type === '___reset') return {};
    if (action.type.startsWith('@')) return state;
    return immutableSet(state, action.type, action.payload);
});
const set = (path, value) => ({
    type: path,
    payload: value
});
const get = (state, path) => path.split('.').reduce((o,p) => o && o[p], state);

const cache = new Map();
const cacheGetOr = (key, supply) => {
    if (!cache.has(key)) {
        cache.set(key, supply());
    }
    return cache.get(key);
};

const inContext = (state, path) => {
    const context = get(state, path)
    // cache against the object or undefined
    return cacheGetOr(context, () => ({
        users: get(context, `users`),
        usersLoading: get(context, `usersLoading`),
        usersLoadingErrors: get(context, `usersLoadingErrors`),
        usersLoaded: get(context, `usersLoaded`)
    }));
};
const loadForContext = (dispatch, context) => {
    dispatch(set(`${context}.usersLoading`, true));
    setTimeout(() => {
        dispatch(set(context, {
            users: ['Alice', 'Bob', 'Eve'],
            usersLoading: false,
            usersLoadingErrors: [],
            usersLoaded: true,
        }));                    
    }, 100);

};

const users = packAll({
    forGroup: {
        selector: (state, group) => {
            return inContext(state, `groups.${group}`);
        },
        actions: (dispatch, group) => ({
            loadUsersForGroup: () => loadForContext(dispatch, `groups.${group}`)
        })
    },
    forProject: {
        selector: (state, project) => {
            return inContext(state, `projects.${project}`);
        },
        actions: (dispatch, project) => ({
            loadUsersForProject: () => loadForContext(dispatch, `projects.${project}`)
        })
    },
    forProjectInGroup: {
        selector: (state, group, project) => {
            return inContext(state, `groups.${group}.projects.${project}`);
        },
        actions: (dispatch, group, project) => ({
            loadUsers: () => loadForContext(dispatch, `groups.${group}.projects.${project}`)
        })
    }
});

const UsersList = ({ users = [], usersLoading, usersLoadingErrors = [], usersLoaded, loadUsers }) => (
    <Fragment>
        {usersLoading && <span className="loading">Loading...</span>}
        {usersLoadingErrors.length &&
            <ul className="errors">
                {usersLoadingErrors.map(error => (
                    <li key={error}>{error}</li>
                ))}
            </ul>
        }
        {users.length &&
            <ul className="users">
                {users.map(u => (
                    <li key={u}>{u}</li>
                ))}
            </ul>
        }
        {usersLoading || usersLoaded || <button onClick={loadUsers}>Load users</button>}
    </Fragment>
);

const GroupUsersList = consume([
    users.forGroup(props => props.groupId)
], usersForGroup => ({
    loadUsers: usersForGroup.loadUsersForGroup,
    ...usersForGroup
}))(UsersList);

const ProjectUsersList = consume([
    users.forProject(props => props.projectId)
], usersForProject => ({
    loadUsers: usersForProject.loadUsersForProject,
    ...usersForProject
}))(UsersList);

const GroupProjectUsersList = consume([
    users.forProjectInGroup(props => props.groupId, props => props.projectId)
])(UsersList);

const GroupProjectUsersList2 = consume([
    users.forProject(props => props.projectId),
    users.forProjectInGroup(props => props.groupId, props => props.projectId)
], (a, b) => b, null)(UsersList);

const DuplicatePropNames = consume([
    users.forProject(props => props.projectId),
    users.forProjectInGroup(props => props.groupId, props => props.projectId)
])(UsersList);

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const withSupressedLogging = fn => (...args) => {
    const { log, warn, error } = console;
    console.log = console.warn = console.error = () => {};
    try {
        return fn(...args);
    } finally {
        console.log = log;
        console.warn = warn;
        console.error = error;
    }
}

describe('consume([packAll({...})])', () => {
    beforeEach(() => {
        store.dispatch({ type: '___reset' })
    })
    const testElement = element => async () => {
        const container = document.createElement('div');
        ReactDOM.render(<Provider store={store}>{element}</Provider>, container);
        expect(container.children.length).toBe(1);
        expect(container.querySelector('button')).not.toBe(null);

        ReactTestUtils.Simulate.click(container.querySelector('button'));
        expect(container.children.length).toBe(1);
        expect(container.querySelector('span')).not.toBe(null);
        
        await wait(100);
        expect(container.children.length).toBe(1);
        expect(container.querySelector('.users')).not.toBe(null);
    };
    it('can handle users in a group', testElement(<GroupUsersList groupId={2} />));
    it('can handle users in a project', testElement(<ProjectUsersList projectId={2} />));
    it('can handle users in a project in a group', testElement(<GroupProjectUsersList groupId={3} projectId={2} />));
    it('can handle multiple packets', testElement(<GroupProjectUsersList2 groupId={3} projectId={2} />));
    it('throws on duplicate props', () => {
        expect(withSupressedLogging(() => {
            ReactDOM.render(<Provider store={store}><DuplicatePropNames /></Provider>, document.createElement('div'));
        })).toThrowErrorMatchingSnapshot();
    });

    it("doesn't rerender if relevant state hasn't changed", () => {
        const mapPacketsToProps = jest.fn((forGroup, forProject) => forGroup);

        const MyComponent = jest.fn().mockReturnValue(<div>Rendered</div>);
        const StatefulMyComponent = consume(
            [users.forGroup(() => 2), users.forProject(() => 2)],
            mapPacketsToProps
        )(MyComponent);

        const container = document.createElement('div');
        ReactDOM.render(<Provider store={store}><StatefulMyComponent /></Provider>, container);
        expect(mapPacketsToProps).toBeCalledTimes(1);
        expect(MyComponent).toBeCalledTimes(1);

        store.dispatch(set("unrelated.path", 42));
        expect(mapPacketsToProps).toBeCalledTimes(1);
        expect(MyComponent).toBeCalledTimes(1);

        store.dispatch(set(`groups.2.usersLoading`, true));
        expect(mapPacketsToProps).toBeCalledTimes(2);
        expect(MyComponent).toBeCalledTimes(2);
    });
});