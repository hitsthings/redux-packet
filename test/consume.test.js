import { consume, consumeOnePacket, makeMergePropsOnePacket } from '../src/consume.js';
import { connect } from 'react-redux';

import { stringifyArgs } from './util';

jest.mock('react-redux');
const connectReturn = jest.fn();
connect.mockReturnValue(connectReturn);
afterEach(() => {
    jest.clearAllMocks();
});

const functionOfLength = (n, innerFn) => {
    switch (n) {
        case 0:
            return function() { return innerFn.apply(this, arguments); };
        case 1:
            return function(a) { return innerFn.apply(this, arguments); };
        case 2:
            return function(a, b) { return innerFn.apply(this, arguments); };
        default:
            throw new Error('Unsupported length ' + n);
    }
};

describe('consume()', () => {
    describe('basic contract assertions', () => {
        describe('throws on invalid input', () => {
            [
                [undefined],
                [{}],
                [[]]
            ].forEach(value =>
                it(String(value.map(p => JSON.stringify(p))), () => {
                    expect(() => consume(...value).toThrowErrorMatchingSnapshot())
                })
            );
        });
        describe('accepts valid input', () => {
            const packet = {
                mapStateToProps: jest.fn(),
                mapDispatchToProps: jest.fn(),
            };
            [
                [packet],
                [[packet]],
                [[packet], jest.fn()],
                [[packet], jest.fn(), jest.fn()],
                [[packet], null, null],
                [[packet], jest.fn(), jest.fn(), jest.fn()],
                [[packet], jest.fn(), jest.fn(), jest.fn(), {}],
            ].forEach(args => {
                it(stringifyArgs(args), () => {
                    expect(() => consume(...args)).not.toThrow();
                })
            })
        });
        it('calls connect() with expected values', () => {
            const options = {};
            expect(consume([
                {
                    mapStateToProps: jest.fn(),
                    mapDispatchToProps: jest.fn(),
                }
            ], jest.fn(), jest.fn(), options)).toEqual(connectReturn);
            expect(connect).toBeCalledTimes(1);
            expect(connect).toBeCalledWith(expect.any(Function), expect.any(Function), expect.any(Function), options);
        });
    });

    describe('consumeOnePacket()', () => {
        it('passes mapStateToProps if defined', () => {
            const mapStateToProps = jest.fn();
            expect(connect).not.toBeCalled();
            consumeOnePacket({ mapStateToProps });
            expect(connect).toBeCalled();
            expect(connect.mock.calls[0][0]).toBe(mapStateToProps);
        });
        it('passes undefined mapStateToProps if undefined', () => {
            expect(connect).not.toBeCalled();
            consumeOnePacket({ mapStateToProps: null });
            expect(connect).toBeCalled();
            expect(connect.mock.calls[0][0]).toBeUndefined();
        });
        it('passes mapDispatchToProps if defined', () => {
            const mapDispatchToProps = jest.fn();
            expect(connect).not.toBeCalled();
            consumeOnePacket({ mapDispatchToProps });
            expect(connect).toBeCalled();
            expect(connect.mock.calls[0][1]).toBe(mapDispatchToProps);
        });
        it('passes undefined mapDispatchToProps if undefined', () => {
            expect(connect).not.toBeCalled();
            consumeOnePacket({ mapDispatchToProps: null });
            expect(connect).toBeCalled();
            expect(connect.mock.calls[0][1]).toBeUndefined();
        });
        it('passes options', () => {
            const options = {};
            expect(connect).not.toBeCalled();
            consumeOnePacket({}, null, null, options);
            expect(connect).toBeCalled();
            expect(connect.mock.calls[0][3]).toBe(options);
        });
    });
    describe('makeMergePropsOnePacket()', () => {
        const stateProps = { state: true, stateDispatch: false, stateOwn: true };
        const dispatchProps = { dispatch: true, stateDispatch: true };
        const ownProps = { own: true, stateOwn: false };
        const mappedProps = {
            state: true,
            dispatch: true,
            stateDispatch: true,
            stateOwn: true,
        };
        const mergedProps = {
            state: true,
            dispatch: true,
            stateDispatch: true,
            own: true,
            stateOwn: true,
        };
        it('returns undefined if no functions passed', () => {
            expect(makeMergePropsOnePacket()).toBeUndefined();
        });
        it('calls mergeProps with state+dispatch props and ownProps if no mapPacketsToProps is defined', () => {
            const mergeProps = jest.fn().mockReturnValue(mergedProps);
            const generatedMergeProps = makeMergePropsOnePacket(undefined, mergeProps);
            expect(generatedMergeProps(stateProps, dispatchProps, ownProps)).toBe(mergedProps);
            expect(mergeProps.mock.calls[0]).toEqual([mappedProps, ownProps]);
        });
        it('calls mapPacketsToProps with state+dispatch props if no mergeProps is defined', () => {
            const mapPacketsToProps = jest.fn().mockReturnValue(mappedProps);
            const generatedMergeProps = makeMergePropsOnePacket(mapPacketsToProps, undefined);
            expect(generatedMergeProps(stateProps, dispatchProps, ownProps)).toEqual(mergedProps);
            expect(mapPacketsToProps).toBeCalledWith(mappedProps);
        });
        it('calls mapPacketsToProps with state+dispatch props if no mergeProps is defined', () => {
            const mapPacketsToProps = jest.fn().mockReturnValue(mappedProps);
            const mergeProps = jest.fn().mockReturnValue(mergedProps);
            const generatedMergeProps = makeMergePropsOnePacket(mapPacketsToProps, mergeProps);
            expect(generatedMergeProps(stateProps, dispatchProps, ownProps)).toBe(mergedProps);
            expect(mapPacketsToProps).toBeCalledWith(mappedProps);
            expect(mergeProps.mock.calls[0][0]).toBe(mappedProps);
            expect(mergeProps.mock.calls[0][1]).toBe(ownProps);
        });
    });

    describe('makeMakeMapStateToProps()', () => {

    });

    describe('packAll mapStateToProps handling', () => {
        const worksTest = (getArgs) => () => {
            const { expectContext, extraPacket, extraPacketMapped } = getArgs();
            const state = {}, props = {};
            const stateProps = expectContext ? [state, props] : [state];

            const mapped = {};
            const packetMapState = jest.fn().mockReturnValue(mapped);
            const packetMakeMapState = jest.fn().mockReturnValue(functionOfLength(stateProps.length, packetMapState));
            const packet = {
                mapStateToProps: functionOfLength(stateProps.length, packetMakeMapState),
                mapDispatchToProps: jest.fn(),
            };
            const packets = extraPacket ? [packet, extraPacket] : [packet];
            const mappedArray = extraPacket ? [mapped, extraPacketMapped] : [mapped];
            const reversedMappedArray = mappedArray.slice().reverse();

            const mapPacketsToProps = jest.fn((...values) => values.slice().reverse());

            const connected = consume(packets, mapPacketsToProps);
            expect(connect).toBeCalledTimes(1);
            expect(connect).toBeCalledWith(expect.any(Function), expect.any(Function), expect.any(Function), undefined);
            expect(connected).toEqual(connectReturn);

            const [makeMapStateToProps, mapDispatchToProps, mergeProps, options] = connect.mock.calls[0];
            expect(makeMapStateToProps.length).toBe(stateProps.length);

            const mapStateToProps = makeMapStateToProps(state, props);
            if (packets.length === 1) {
                expect(makeMapStateToProps).toBe(packet.mapStateToProps);
                expect(packetMakeMapState).toBeCalledTimes(1);
                expect(packetMapState).toBeCalledTimes(0);
                return; // no point testing the rest of this as it's just testing our unit test implementation
            }
            expect(packetMakeMapState).toBeCalledWith(...stateProps);
            expect(packetMakeMapState).toBeCalledTimes(1);
            expect(packetMapState).toBeCalledTimes(0);
            expect(mapStateToProps).toEqual(expect.any(Function));
            expect(mapStateToProps.length).toBe(stateProps.length);

            const propMappedState = mapStateToProps(state, props);
            expect(packetMapState).toBeCalledWith(...stateProps);
            expect(packetMakeMapState).toBeCalledTimes(1);
            expect(packetMapState).toBeCalledTimes(1);
        };
        it('works with context', worksTest(() => ({ expectContext: true })));
        it('works without context', worksTest(() => ({ expectContext: false })));
        it('works with some context', worksTest(() => {
            const extraPacketMapped = { b:2 };
            const mapStateToProps = jest.fn().mockReturnValue(extraPacketMapped);
            return {
                expectContext: true,
                extraPacket: {
                    mapStateToProps: jest.fn().mockReturnValue(mapStateToProps),
                },
                extraPacketMapped
            };
        }));
        it('works with some packet omissions', worksTest(() => ({
            expectContext: true,
            extraPacket: {
                mapStateToProps: null,
            },
            extraPacketMapped: undefined
        })));
        it('works with no handlers', () => {
            const packet = {
                mapStateToProps: null,
                mapDispatchToProps: jest.fn(),
            };

            const mapPacketsToProps = jest.fn(values => values[0]);

            const connected = consume([packet], mapPacketsToProps);
            expect(connect).toBeCalledTimes(1);
            expect(connect.mock.calls[0][0]).toBeUndefined();
            expect(connected).toEqual(connectReturn);
            expect(mapPacketsToProps).toBeCalledTimes(0);
        });
    });
    describe('packAll mapDispatchToProps handling', () => {
        const worksTest = (getArgs) => () => {
            const { expectContext, extraPacket, extraPacketMapped } = getArgs();
            const state = {}, props = {}, dispatch = jest.fn();
            const dispatchProps = expectContext ? [dispatch, props] : [dispatch];

            const mapped = {};
            const packetMapDispatch = jest.fn().mockReturnValue(mapped);
            const packet = {
                mapStateToProps: jest.fn(),
                mapDispatchToProps: functionOfLength(dispatchProps.length, packetMapDispatch),
            };
            const packets = extraPacket ? [packet, extraPacket] : [packet];
            const mappedArray = extraPacket ? [mapped, extraPacketMapped] : [mapped];
            const reversedMappedArray = mappedArray.slice().reverse();

            const mapPacketsToProps = jest.fn((...values) => values.slice().reverse());

            const connected = consume(packets, mapPacketsToProps);
            expect(connect).toBeCalledTimes(1);
            expect(connect).toBeCalledWith(expect.any(Function), expect.any(Function), expect.any(Function), undefined);
            expect(connected).toEqual(connectReturn);

            const [makeMapStateToProps, mapDispatchToProps] = connect.mock.calls[0];
            expect(mapDispatchToProps.length).toBe(dispatchProps.length);

            const propMappedDispatch = mapDispatchToProps(dispatch, props);
            if (packets.length === 1) {
                expect(mapDispatchToProps).toBe(packet.mapDispatchToProps);
            } else {
                expect(packetMapDispatch).toBeCalledWith(...dispatchProps);
            }
            expect(packetMapDispatch).toBeCalledTimes(1);
        };
        it('works with context', worksTest(() => ({ expectContext: true })));
        it('works without context', worksTest(() => ({ expectContext: false })));
        it('works with some context', worksTest(() => {
            const extraPacketMapped = { b: expect.any(Function) };
            return {
                expectContext: true,
                extraPacket: {
                    mapDispatchToProps: functionOfLength(1, jest.fn().mockReturnValue(extraPacketMapped)),
                },
                extraPacketMapped
            };
        }));
        it('works with some packet omissions', worksTest(() => ({
            expectContext: true,
            extraPacket: {
                mapDispatchToProps: null,
            },
            extraPacketMapped: undefined
        })));
        it('works with some objects', worksTest(() => ({
            expectContext: true,
            extraPacket: {
                mapDispatchToProps: { b: () => {} },
            },
            extraPacketMapped: { b: expect.any(Function) }
        })));
        it('works with no handlers', () => {
            const packet = {
                mapStateToProps: null,
                mapDispatchToProps: null,
            };

            const mapPacketsToProps = jest.fn(values => values[0]);

            const connected = consume([packet], mapPacketsToProps);
            expect(connect).toBeCalledTimes(1);
            expect(connect.mock.calls[0][1]).toBeUndefined();
            expect(connected).toEqual(connectReturn);
            expect(mapPacketsToProps).toBeCalledTimes(0);
        });
    });
});