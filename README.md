# React Bundler

React Bundler is an alternative interface to `react-redux` that helps you hide the internal complexity of action creators and selectors from your components and encapsulates that logic in topic-based files.
Bundler helps you to think in terms of `Users`, `Projects`, `Groups`, `OtherBusinessObjects` instead of separating out `selectors`, `action creators`, and `reducers`.

Instead of this in your components:

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

Write this:

```js
import { consume } from 'react-bundler';
import users from './user-bundle';
export default consume(users.forGroup(props => props.groupId))(UserList);
```

## Installation

If you already have `react-redux` and `redux` in your project, run

```sh
npm install --save react-bundler
```

Otherwise,

```sh
npm install --save redux react-redux react-bundler
```

## Quick Start

Create bundles of state that can be used across your app:

```js
// import bundleAll where you deal with Redux state, to create a nice consumable packet of state and actions
import { bundleAll } from 'react-bundler';

const users = bundleAll({
    // Each property you pass to bundleAll becomes a function that can be called to consume a bundle.
    // any selector functions or values passed to `forGroup()` will become parameters to the selector and actions functions
    // E.g. we could call `users.forGroup(props => props.groupId)` to grab a groupId from the component props or `users.forGroup(4)`
    // to pass a constant value through
    forGroup: {
        // selector will be called as part of mapStateToProps and can return any useful props when thinking about "users for a group".
        // A nice option is to use Reselect's createStructuredSelector here
        selector: (state, groupId) => {
            return {
                users: state.groups[groupId].users,
                //... anything else someone might want for working with users
            };
        },
        // actions will be called as part of mapDispatchToProps and should return functions that dispatch actions.
        // if you don't need any context like groupId, you can use a plain object here and each function property will be converted to a dispatcher
        // just like with connect()
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
import { consume } from 'react-bundler';

// a stateless component that might want some user info
const UserList = ({ users, loadUsers }) => (
    <ul>{users.map(user => <li {...user} />)}</ul>
    <button onClick={loadUsers}>Load</button>
);

// grab the bundles you want for your current context and pass them to consume() to create a higher-order component.
const withUsersForGroup = consume(users.forGroup(props => props.groupId));
const GroupUserList = withUsersForGroup(UserList);
ReactDOM.render(
    <Provider store={createStore(...)}>
        <GroupUserList groupId={7} />
    </Provider>)
```

## API Reference

### bundle(bundleDescription : BundleDescription) : BundleMaker

Given a `bundleDescription` return a generated `Bundle` function.

#### BundleDescription { selector: Selector|()=>Selector, actions: Actions:{}}
#### Selector (state[, props]) => stateProps
#### Actions (dispatch[, props]) => dispatchProps
#### BundleMaker (...contextSelectors) => Bundle
#### Bundle { mapStateToProps, mapDispatchToProps, minimumSelectorsExpected?: number }

### bundleAll(bundleDescriptionMap : BundleDescriptionMap) : { [key: string]: BundleMaker }

Given an object where each property is a `bundleDescription`, return a new object with the same property names whose values are the generated `Bundle`s.

#### BundleDescriptionMap { [key: string]: BundleDescription }

### consume(bundles[, mapBundlesToProps[, mergeProps[, connectOptions]]]) : Component => ConnectedComponent

#### bundles Array<Bundle>|Bundle

#### mapBundlesToProps(...bundleProps) (...Array<{}>) => {}

Takes in the stash and dispatch props from each bundle as a separate argument and combines all properties into one object. For example,
it might be called like `mapBundlesToProps({ users, loadUsers }, { projects, loadProjects })`. By default each arguments will be combined into
a single object with `Object.assign`.

#### mergeProps(allBundleProps, ownProps) ()

Combine the bundled properties with any properties passed in from the parent. Be default this will use `Object.assign({}, ownProps, allBundledProps)`.

## Longer Example

Redux states are generally normalized so that details about an entity can be shared and updated as new data comes in. That means when thinking about users, groups, projects, andt he relationships between them, you might have state like this:

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

But when working with this state in your code, you typically don't want to deal with all that normalized state and understanding how it fits together. Ideally you'd handle that all in one place and expose it in a more intuitive shape. This is where React Bundler comes in. It encourages you to create that "one place".

### bundle()

`bundle()` is how you create that place. `bundle` lets you define selectors and action creators that take in any context from the caller, and output the appropriate props and actionCreators. Below you'll see a `users.forGroup(props => props.groupId)` bundle and a `users.forProject(props => props.projectId)` bundle. Each has a `selector` and an `actions` property that deliver tailored data about users. 

```js
// state/users.js

import bundle from 'react-bundler';

export default bundle({
    forGroup: {
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
    },
    forProject: {
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
    },
});
```

### consume()

`consume()` is how you consume a bundle. You call it with your bundles, passing in any required context parameters. It's a higher-order component that will call `connect()` under the hood and provide your component with the bundle properties.

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
import { consume } from 'react-bundler';
import users from '../state/users';
import UserList from './user-list';

const ProjectUserList = consume(users.forProject(props => props.projectId))(UserList);
const GroupUserList = consume(users.forGroup(props => props.groupId))(UserList);
// <ProjectUserList projectId="projectA" />
// <GroupUserList groupId="groupA" />
```

You can call `consume()` with multiple bundles, but if any properties overlap, you'll have to combine them yourself with a `mapBundlesToProps`:

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
