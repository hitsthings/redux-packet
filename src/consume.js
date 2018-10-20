import { bindActionCreators } from "redux";
import { connect } from 'react-redux';

/*
//usage of consume
consume([
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
const concatKeys = (arr, obj) => arr.concat(Object.keys(obj));
const nonUniqueFilter = (value, i, values) => values.lastIndexOf(value) !== i;
const defaultMapPacketsToProps = (...values) => {
    const nonUniqueProps = values.reduce(concatKeys,[]).filter(nonUniqueFilter);
    if (nonUniqueProps.length) {
        throw new Error("Props are not unique. " +
            "Pass in mapPacketsToProps to deduplicate them. " +
            "Duplicate names: " + nonUniqueProps.join(','));
    }
    return Object.assign({}, ...values);
};
const defaultMergeProps = (packetProps, ownProps) => ({
    ...ownProps,
    ...packetProps
})

const noop = (a) => {};
const usesContext = fn => typeof fn === 'function' && (fn.dependsOnOwnProps == null ? fn.length !== 1 : Boolean(fn.dependsOnOwnProps));
const stateUsesContext = packet => usesContext(packet.mapStateToProps);

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
            ...ownProps,
            ...mapPacketsToProps({
                ...stateProps,
                ...dispatchProps
            })
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

const mapAllToPackets = mappers => {
    const anyContext = mappers.filter(Boolean).some(usesContext);
    return anyContext
        ? (stateOrDispatch, props) => ({
            packets: mappers.map(mapper => mapper(stateOrDispatch, props))
        })
        : stateOrDispatch => ({
            packets: mappers.map(mapper => mapper(stateOrDispatch))
        });
};

export const makeMapStateToProps = (packets, withState) =>
    (withState.length || undefined) && (
        withState.some(stateUsesContext)
            ? (state, props) => mapAllToPackets(packets.map(b => b.mapStateToProps ? b.mapStateToProps(state, props) : noop))
            : state => mapAllToPackets(packets.map(b => b.mapStateToProps ? b.mapStateToProps(state) : noop))
    );

export const makeMapDispatchToProps = (packets, withDispatch) =>
    (withDispatch.length || undefined) && (
        mapAllToPackets(packets.map(packet =>
            packet.mapDispatchToProps
                ? typeof packet.mapDispatchToProps === 'function'
                    ? packet.mapDispatchToProps
                    : dispatch => bindActionCreators(packet.mapDispatchToProps, dispatch)
                : noop
        ))
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

export const consumeMultiplePackets = (
    packets,
    mapPacketsToProps,
    mergeProps,
    options
) => connect(
    makeMapStateToProps(packets, packets.filter(b => b.mapStateToProps)),
    makeMapDispatchToProps(packets, packets.filter(b => b.mapDispatchToProps)),
    makeMergeProps(mapPacketsToProps, mergeProps),
    options
);

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
        throw new TypeError('At least one packet must be passed to consume()')
    }

    if (packets.length === 1) {
        return consumeOnePacket(packets[0], mapPacketsToProps, mergeProps, options);
    }
    return consumeMultiplePackets(packets, mapPacketsToProps, mergeProps, options);
};
