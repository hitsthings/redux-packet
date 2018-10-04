# Redux Packet

Redux Packet is an alternative interface to `react-redux` that helps you hide the internal complexity of action creators and selectors from your components and encapsulates that logic in topic-based files.
Packet helps you to think in terms of `Users`, `Projects`, `Groups`, `OtherBusinessObjects` instead of separating out `selectors`, `action creators`, and `reducers`.

Don't write this in your components:

```js
import { connect } from 'react-redux';
import usersForGroupSelector from './selectors';
import loadUsersForGroup from './action-creators';
const mapStateToProps = (state, props) => {
    return {
        users: usersForGroupSelector(state, props.groupId)
    };
};
const mapDispatchToProps = (dispatch, props) => {
    return {
        loadUsers: () => loadUsersForGroup(props.groupId)
    };
};
export default connect(mapStateToProps, mapDispatchToProps)(UserList);
```

Write this instead:

```js
import { consume } from 'redux-packet';
import users from './user-packet';
export default consume(users.forGroup(props => props.groupId))(UserList);
```

## Installation

If you already have `react-redux` and `redux` in your project, run

```sh
npm install --save redux-packet
```

Otherwise,

```sh
npm install --save redux react-redux redux-packet
```

## Quick Start

Create packets of state that can be used across your app:

```js
// import packAll where you deal with Redux state, to create a nice consumable packet of state and actions
import { packAll } from 'redux-packet';

const users = packAll({

    // Each property you pass to packAll becomes a packet-making function.
    // The packet-making function takes in prop selectors as arguments.
    // E.g. this can be used like `user.forGroup(props => props.groupId)`
    forGroup: {

        // The `selector` property is analogous to mapStateToProps, but it takes in the results of the 
        // prop selectors instead of props themselves
        // It should return the props to inject into a component
        selector: (state, groupId) => {
            return {
                users: state.groups[groupId].users,
                //... anything else someone might want for working with users
            };
        },

        // The `actions` property is analogous to mapDispatchToProps, but it takes in the results of 
        // the prop selectors instead of props themselves
        // If you don't need any context like groupId, `actions` can be a plain object and each function
        // property will be composed with `dispatch`,
        // similar to if you had passed an object to mapDispatchToProps.
        actions: (dispatch, groupId) => {
            return {
                loadUsers: () => dispatch({
                    type: 'loadUsersForGroup',
                    groupId: groupId
                })
            };
        };
    };
});
```

Then consume them in React components:

```jsx
// import consume where you create a Redux-connected React.Component
import { consume } from 'redux-packet';

// a stateless component that might want some user info
const UserList = ({ users, loadUsers }) => (
    <ul>{users.map(user => <li {...user} />)}</ul>
    <button onClick={loadUsers}>Load</button>
);

// grab the packets you want for your current context and pass them to consume() to
// create a higher-order component.
const withUsersForGroup = consume(users.forGroup(props => props.groupId));
const GroupUserList = withUsersForGroup(UserList);
ReactDOM.render(
    <Provider store={createStore(...)}>
        <GroupUserList groupId={7} />
    </Provider>)
```

## API Reference

- [pack()](https://github.com/hitsthings/redux-packet#packpacketdescription--packetdescription--packetmaker)
- [packAll()](https://github.com/hitsthings/redux-packet#packallpacketdescriptionmap--packetdescriptionmap---key-string-packetmaker-)
- [consume()](https://github.com/hitsthings/redux-packet#consumepackets-mappacketstoprops-mergeprops-connectoptions--component--connectedcomponent)

### `pack(packetDescription : PacketDescription) : PacketMaker`

Given a `packetDescription` returns a `PacketMaker` function that can be called in React components.

##### `PacketDescription`
`{ selector?: Selector|()=>Selector, actions?: Actions|{}, minimumSelectorsExpected?: number}`

An object that describes what state and action props are provided in the packet. It must have at least one of a `selector` property and an `actions` property. It can also have a `minimumSelectorsExpected` to enforce that consumers pass in a certain number of context selectors.

##### `Selector`
`(state, ...contextProps) => stateProps`

The `selector` property takes in the Redux state and the results from any context selectors. For example, in `users.forGroup(props => props.groupId)`
the selector would receive the value of the `groupId` prop from the component.

##### `Actions`
`(dispatch, ...contextProps) => dispatchProps`

The `actions` property takes in the Redux dispatch and the results from any context selectors. For example, in `users.forGroup(props => props.groupId)`
the actions would receive the value of the `groupId` prop from the component.

Alternatively, you can pass in an object of functions. Each function property will be composed with dispatch for you.

##### `PacketMaker`
`(...contextSelectors) => Packet`

##### `Packet`
`{ mapStateToProps, mapDispatchToProps, minimumSelectorsExpected?: number }`

### `packAll(packetDescriptionMap : PacketDescriptionMap) : { [key: string]: PacketMaker }`

Given an object where each property is a `packetDescription`, return a new object with the same property names whose values are the generated `Packet`s.

##### `PacketDescriptionMap`
`{ [key: string]: PacketDescription }`

### `consume(packets[, mapPacketsToProps[, mergeProps[, connectOptions]]]) : Component => ConnectedComponent`

##### `packets`
`Array<Packet>|Packet`

##### `mapPacketsToProps(...packetProps)`
`(...Array<{}>) => {}`

Takes in the stash and dispatch props from each packet as a separate argument and combines all properties into one object. For example,
it might be called like `mapPacketsToProps({ users, loadUsers }, { projects, loadProjects })`. By default each arguments will be combined into
a single object with `Object.assign`.

##### `mergeProps(allPacketProps, ownProps)`
`(Array<{}>, Array<{}>) => {}`

Combine the packed properties with any properties passed in from the parent. Be default this will use `Object.assign({}, ownProps, allPacketProps)`.

##### `connectOptions`
`ConnectOptions`

Options which will be passed directly to [react-redux connect()](https://github.com/reduxjs/react-redux/blob/master/docs/api.md#connectmapstatetoprops-mapdispatchtoprops-mergeprops-options)

## Longer Example

Redux states are generally normalized so that details about an entity can be shared and updated as new data comes in. That means when thinking about users, groups, projects, and the relationships between them, you might have state like this:

```json
{
    "users": {
        "userA": {"some":"details"},
        "userB": {"some":"details"}
    },
    "groups": {
        "groupA": {"some":"details"},
        "groupB": {"some":"details"}
    },
    "projects": {
        "projectA": {"some":"details"},
        "projectB": {"some":"details"}
    },
    "usersByGroup": {
        "groupA": {
            "isLoading": false,
            "hasAllLoaded": false,
            "nextPage": 2,
            "errors": [],
            "users": ["userA", "userB"]
        },
        "groupB": {
            "isLoading": true,
            "hasAllLoaded": false,
            "nextPage": 2,
            "errors": [],
            "users": []
        }
    },
    "usersByProject": {
        "projectA": {
            "isLoading": false,
            "hasAllLoaded": false,
            "nextPage": 2,
            "errors": [],
            "users": ["userB", "userC"]
        },
        "projectB": {
            "isLoading": true,
            "hasAllLoaded": false,
            "nextPage": 2,
            "errors": [],
            "users": []
        }
    },
}
```

But when working with this state in your code, you typically don't want to deal with all that normalized state and understanding how it fits together. Ideally you'd handle that all in one place and expose it in a more intuitive shape. This is where Redux Packet comes in. It encourages you to create that "one place".

### pack() and packAll()

`pack()` is how you create that place. `pack` lets you define selectors and action creators that take in any context from the caller, and output the appropriate props and actionCreators. Below you'll see a `users.forGroup(props => props.groupId)` packet and a `users.forProject(props => props.projectId)` packet. Each has a `selector` and an `actions` property that deliver tailored data about users. 

```js
// state/users.js

import { pack } from 'redux-packet';

export default {
    forGroup: pack({
        selector: (state, groupId) => {
            // ...combine all the various bits of state...
            const usersForGroup = state.usersByGroup[groupId];
            return {
                ...usersForGroup,
                users: usersForGroup.users.map(userId => state.users[userId]),
            };
            // returns {
            //    users,
            //    isLoading,
            //    hasAllLoaded,
            //    errors
            // }
        },
        actions: (dispatch, groupId) => ({
            loadUsers: () => dispatch({ type: 'LOAD_USERS', groupId })
        })
    }),
    forProject: pack({
        selector: (state, projectId, filterTerm) => {
            // ...combine all the various bits of state...
            const usersForProject = state.usersByProject[projectId];
            return {
                users: users.filter(user => user.name.indexOf(filterTerm) !== -1,
                isLoading: usersForProject.isLoading,
                hasAllLoaded: usersForProject.hasAllLoaded,
                errors: usersForProject.errors
            };
        },
        actions: (dispatch, projectId, filterTerm) => ({
            loadUsers: () => dispatch({ type: 'LOAD_USERS', projectId })
        })
    })
};
```

To simplify writing multiple packets, you can use `packAll` which expects each property on an object to be a packetDescription.

```js
import { packAll } from 'redux-packet';

export default packAll({
    forGroup: {
        selector: ...,
        actions: ...
    },
    forProject: {
        selector: ...,
        actions: ...
    }
});
```

### consume()

`consume()` is how you consume a packet. You call it with your packets, passing in any required context parameters. It's a higher-order component that will call `connect()` under the hood and provide your component with the packet properties.

```jsx
const UserList = (users = [], isLoading, hasAllLoaded, errors, loadUsers) => (
    <div>
        {errors && <ul>{errors.map(...)}</ul>}
        {isLoading && <Spinner />}
        <ul>{users.map(...)}</ul>
        {hasAllLoaded || <button onClick={loadUsers}>Load users</button>}
    </div>
);
```

```js
import { consume } from 'redux-packet';
import users from '../state/users';
import UserList from './user-list';

const ProjectUserList = consume(users.forProject(props => props.projectId))(UserList);
const GroupUserList = consume(users.forGroup(props => props.groupId))(UserList);
// <ProjectUserList projectId="projectA" />
// <GroupUserList groupId="groupA" />
```

You can call `consume()` with multiple packets, but if any properties overlap, you'll have to combine them yourself with a `mapPacketsToProps`:

```js
const CompareUserLists = ({ listA, listB }) => (
    <div>
        <UserList {...listA} />
        <UserList {...listB} />
    </div>
);

const CompareUsersInGroups = consume(
    [
        users.forGroup(props => props.groupA),
        users.forGroup(props => props.groupB)
    ],
    (listA, listB) => ({
        listA,
        listB
    })
)(CompareUserLists);

// <CompareUsersInGroups groupA="groupA" groupB="groupB" />
```
