import { bindActionCreators } from "redux";
import { connect } from 'react-redux';

/*
//usage of component
component([
    users.fromGroup(props => props.group),
    cards.fromProject(props => props.project, props => props.filterTerm),
])(({ users = [], usersLoading, usersAllLoaded, usersLoadingErrors, cards, cardsLoading, cardsLoadingErrors, loadUsers, addUserToGroup}) => (
    <div>
        <button disabled={usersLoading || usersLoadingErrors} onClick={usersLoading || usersLoadingErrors ? null : loadUsers}>
            Load users
        </button>
        {users.map(user => (
            <p key={user.id}>{user.name}</p>
        ))}
    </div>
))
*/
const uniqueFilter = (value, i, values) => values.lastIndexOf(value) === i;
const nonUniqueFilter = (value, i, values) => values.lastIndexOf(value) !== i;
const spreadAllSafe = fallbackName => (...values) => {
    const nonUniqueProps = values.reduce((a, v) => a.concat(Object.keys(v)),[]).filter(nonUniqueFilter);
    if (nonUniqueProps.length) {
        throw new Error("Props are not unique. " +
            "Pass in " + fallbackName + " to deduplicate them. " +
            "Duplicate names: " + nonUniqueProps.join(','));
    }
    return Object.assign({}, ...values);
};
const defaultMapBundlesToProps = spreadAllSafe("mapBundlesToProps");
const defaultMergeProps = (bundleProps, ownProps) => ({
    ...bundleProps,
    ...ownProps
})

const noop = () => {};

const anyContext = (bundles, prop) => bundles.some(b => typeof b[prop] === 'function' && b[prop].length !== 1);

export const makeMergePropsOneBundle = (mapBundlesToProps, mergeProps) => {
    if (!mapBundlesToProps) {
        if (!mergeProps) {
            return undefined;
        }
        return (stateProps, dispatchProps, ownProps) => mergeProps(
            {
                ...stateProps,
                ...dispatchProps
            },
            ownProps
        );
    }
    if (!mergeProps) {
        return (stateProps, dispatchProps, ownProps) => ({
            ...mapBundlesToProps({
                ...stateProps,
                ...dispatchProps
            }),
            ...ownProps
        });
    }
    return (stateProps, dispatchProps, ownProps) => mergeProps(
        mapBundlesToProps({
            ...stateProps,
            ...dispatchProps
        }),
        ownProps
    );
};

export const consumeOneBundle = (
    bundle,
    mapBundlesToProps,
    mergeProps,
    options
) => connect(
    bundle.mapStateToProps || undefined,
    bundle.mapDispatchToProps || undefined,
    makeMergePropsOneBundle(mapBundlesToProps, mergeProps),
    options
);

export const makeMapStateToProps = (bundles, withState) =>
    (withState.length || undefined) && (
        anyContext(withState, 'mapStateToProps')
            ? (state, props) => {
                const mapStateToPropsList = bundles
                    .map(b => b.mapStateToProps ? b.mapStateToProps(state, props) : noop);
                return (state, props) => ({
                    bundles: mapStateToPropsList.map(mapper => mapper(state, props))
                });
            }
            : state => {
                const mapStateToPropsList = bundles
                    .map(b => b.mapStateToProps ? b.mapStateToProps(state) : noop);
                return state => ({
                    bundles: mapStateToPropsList.map(mapper => mapper(state))
                });
            }
    );

export const makeMapDispatchToProps = (bundles, withDispatch) =>
    (withDispatch.length || undefined) && (
        anyContext(withDispatch, 'mapDispatchToProps')
            ? (dispatch, props) => ({
                bundles: bundles.map(b =>
                    b.mapDispatchToProps
                        ? typeof b.mapDispatchToProps === 'function'
                            ? b.mapDispatchToProps(dispatch, props)
                            : bindActionCreators(b.mapDispatchToProps, dispatch)
                        : undefined
                )
            })
            : (dispatch) => ({
                bundles: bundles.map(b =>
                    b.mapDispatchToProps
                        ? typeof b.mapDispatchToProps === 'function'
                            ? b.mapDispatchToProps(dispatch)
                            : bindActionCreators(b.mapDispatchToProps, dispatch)
                        : undefined
                )
            })
    );

export const makeMergeProps = (mapBundlesToProps, mergeProps) => {
    if (!mapBundlesToProps) {
        mapBundlesToProps = defaultMapBundlesToProps;
    }
    if (!mergeProps) {
        mergeProps = defaultMergeProps;
    }
    return (stateProps, dispatchProps, ownProps) => {
        const bundledProps = {};
        const propsByBundle = stateProps.bundles.map((bundleState, i) => {
            const bundleDispatch = dispatchProps.bundles[i];
            return {
                ...bundleState,
                ...bundleDispatch
            };
        });
        const bundleProps = mapBundlesToProps(...propsByBundle);
        return mergeProps(bundleProps, ownProps);
    };
};

const consume = (
    bundles,
    mapBundlesToProps,
    mergeProps,
    options
) => {
    if (bundles && (bundles.mapStateToProps || bundles.mapDispatchToProps)) {
        bundles = [bundles];
    }
    if (!Array.isArray(bundles) || bundles.length === 0) {
        throw new TypeError('At least one bundle must be passed to component()')
    }

    if (bundles.length === 1) return consumeOneBundle(bundles[0], mapBundlesToProps, mergeProps, options);

    return connect(
        makeMapStateToProps(bundles, bundles.filter(b => b.mapStateToProps)),
        makeMapDispatchToProps(bundles, bundles.filter(b => b.mapDispatchToProps)),
        makeMergeProps(mapBundlesToProps, mergeProps),
        options
    );
};

export default consume;
