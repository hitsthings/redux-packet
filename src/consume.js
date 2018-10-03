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
const defaultMapPacketsToProps = spreadAllSafe("mapPacketsToProps");
const defaultMergeProps = (packetProps, ownProps) => ({
    ...packetProps,
    ...ownProps
})

const noop = () => {};

const anyContext = (packets, prop) => packets.some(b => typeof b[prop] === 'function' && b[prop].length !== 1);

export const makeMergePropsOnePacket = (mapPacketsToProps, mergeProps) => {
    if (!mapPacketsToProps) {
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
            ...mapPacketsToProps({
                ...stateProps,
                ...dispatchProps
            }),
            ...ownProps
        });
    }
    return (stateProps, dispatchProps, ownProps) => mergeProps(
        mapPacketsToProps({
            ...stateProps,
            ...dispatchProps
        }),
        ownProps
    );
};

export const consumeOnePacket = (
    packet,
    mapPacketsToProps,
    mergeProps,
    options
) => connect(
    packet.mapStateToProps || undefined,
    packet.mapDispatchToProps || undefined,
    makeMergePropsOnePacket(mapPacketsToProps, mergeProps),
    options
);

export const makeMapStateToProps = (packets, withState) =>
    (withState.length || undefined) && (
        anyContext(withState, 'mapStateToProps')
            ? (state, props) => {
                const mapStateToPropsList = packets
                    .map(b => b.mapStateToProps ? b.mapStateToProps(state, props) : noop);
                return (state, props) => ({
                    packets: mapStateToPropsList.map(mapper => mapper(state, props))
                });
            }
            : state => {
                const mapStateToPropsList = packets
                    .map(b => b.mapStateToProps ? b.mapStateToProps(state) : noop);
                return state => ({
                    packets: mapStateToPropsList.map(mapper => mapper(state))
                });
            }
    );

export const makeMapDispatchToProps = (packets, withDispatch) =>
    (withDispatch.length || undefined) && (
        anyContext(withDispatch, 'mapDispatchToProps')
            ? (dispatch, props) => ({
                packets: packets.map(b =>
                    b.mapDispatchToProps
                        ? typeof b.mapDispatchToProps === 'function'
                            ? b.mapDispatchToProps(dispatch, props)
                            : bindActionCreators(b.mapDispatchToProps, dispatch)
                        : undefined
                )
            })
            : (dispatch) => ({
                packets: packets.map(b =>
                    b.mapDispatchToProps
                        ? typeof b.mapDispatchToProps === 'function'
                            ? b.mapDispatchToProps(dispatch)
                            : bindActionCreators(b.mapDispatchToProps, dispatch)
                        : undefined
                )
            })
    );

export const makeMergeProps = (mapPacketsToProps, mergeProps) => {
    if (!mapPacketsToProps) {
        mapPacketsToProps = defaultMapPacketsToProps;
    }
    if (!mergeProps) {
        mergeProps = defaultMergeProps;
    }
    return (stateProps, dispatchProps, ownProps) => {
        const propsByPacket = stateProps.packets.map((packetState, i) => {
            const packetDispatch = dispatchProps.packets[i];
            return {
                ...packetState,
                ...packetDispatch
            };
        });
        const packetProps = mapPacketsToProps(...propsByPacket);
        return mergeProps(packetProps, ownProps);
    };
};

export const consume = (
    packets,
    mapPacketsToProps,
    mergeProps,
    options
) => {
    if (packets && (packets.mapStateToProps || packets.mapDispatchToProps)) {
        packets = [packets];
    }
    if (!Array.isArray(packets) || packets.length === 0) {
        throw new TypeError('At least one packets must be passed to component()')
    }

    if (packets.length === 1) return consumeOnePacket(packets[0], mapPacketsToProps, mergeProps, options);

    return connect(
        makeMapStateToProps(packets, packets.filter(b => b.mapStateToProps)),
        makeMapDispatchToProps(packets, packets.filter(b => b.mapDispatchToProps)),
        makeMergeProps(mapPacketsToProps, mergeProps),
        options
    );
};
