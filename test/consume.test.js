import consume, { consumeOneBundle, makeMergePropsOneBundle } from '../src/consume.js';
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
            const bundle = {
                mapStateToProps: jest.fn(),
                mapDispatchToProps: jest.fn(),
            };
            [
                [bundle],
                [[bundle]],
                [[bundle], jest.fn()],
                [[bundle], jest.fn(), jest.fn()],
                [[bundle], null, null],
                [[bundle], jest.fn(), jest.fn(), jest.fn()],
                [[bundle], jest.fn(), jest.fn(), jest.fn(), {}],
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

    describe('consumeOneBundle()', () => {
        it('passes mapStateToProps if defined', () => {
            const mapStateToProps = jest.fn();
            expect(connect).not.toBeCalled();
            consumeOneBundle({ mapStateToProps });
            expect(connect).toBeCalled();
            expect(connect.mock.calls[0][0]).toBe(mapStateToProps);
        });
        it('passes undefined mapStateToProps if undefined', () => {
            expect(connect).not.toBeCalled();
            consumeOneBundle({ mapStateToProps: null });
            expect(connect).toBeCalled();
            expect(connect.mock.calls[0][0]).toBeUndefined();
        });
        it('passes mapDispatchToProps if defined', () => {
            const mapDispatchToProps = jest.fn();
            expect(connect).not.toBeCalled();
            consumeOneBundle({ mapDispatchToProps });
            expect(connect).toBeCalled();
            expect(connect.mock.calls[0][1]).toBe(mapDispatchToProps);
        });
        it('passes undefined mapDispatchToProps if undefined', () => {
            expect(connect).not.toBeCalled();
            consumeOneBundle({ mapDispatchToProps: null });
            expect(connect).toBeCalled();
            expect(connect.mock.calls[0][1]).toBeUndefined();
        });
        it('passes options', () => {
            const options = {};
            expect(connect).not.toBeCalled();
            consumeOneBundle({}, null, null, options);
            expect(connect).toBeCalled();
            expect(connect.mock.calls[0][3]).toBe(options);
        });
    });
    describe('makeMergePropsOneBundle()', () => {
        const stateProps = { state: true };
        const dispatchProps = { dispatch: true };
        const ownProps = { own: true };
        const mappedProps = {
            state: true,
            dispatch: true
        };
        const mergedProps = {
            state: true,
            dispatch: true,
            own: true
        };
        it('returns undefined if no functions passed', () => {
            expect(makeMergePropsOneBundle()).toBeUndefined();
        });
        it('calls mergeProps with state+dispatch props and ownProps if no mapBundlesToProps is defined', () => {
            const mergeProps = jest.fn().mockReturnValue(mergedProps);
            const generatedMergeProps = makeMergePropsOneBundle(undefined, mergeProps);
            expect(generatedMergeProps(stateProps, dispatchProps, ownProps)).toBe(mergedProps);
            expect(mergeProps.mock.calls[0]).toEqual([mappedProps, ownProps]);
        });
        it('calls mapBundlesToProps with state+dispatch props if no mergeProps is defined', () => {
            const mapBundlesToProps = jest.fn().mockReturnValue(mappedProps);
            const generatedMergeProps = makeMergePropsOneBundle(mapBundlesToProps, undefined);
            expect(generatedMergeProps(stateProps, dispatchProps, ownProps)).toEqual(mergedProps);
            expect(mapBundlesToProps).toBeCalledWith(mappedProps);
        });
        it('calls mapBundlesToProps with state+dispatch props if no mergeProps is defined', () => {
            const mapBundlesToProps = jest.fn().mockReturnValue(mappedProps);
            const mergeProps = jest.fn().mockReturnValue(mergedProps);
            const generatedMergeProps = makeMergePropsOneBundle(mapBundlesToProps, mergeProps);
            expect(generatedMergeProps(stateProps, dispatchProps, ownProps)).toBe(mergedProps);
            expect(mapBundlesToProps).toBeCalledWith(mappedProps);
            expect(mergeProps.mock.calls[0][0]).toBe(mappedProps);
            expect(mergeProps.mock.calls[0][1]).toBe(ownProps);
        });
    });

    describe('makeMakeMapStateToProps()', () => {

    });

    describe('bundle mapStateToProps handling', () => {
        const worksTest = (getArgs) => () => {
            const { expectContext, extraBundle, extraBundleMapped } = getArgs();
            const state = {}, props = {};
            const stateProps = expectContext ? [state, props] : [state];

            const mapped = {};
            const bundleMapState = jest.fn().mockReturnValue(mapped);
            const bundleMakeMapState = jest.fn().mockReturnValue(functionOfLength(stateProps.length, bundleMapState));
            const bundle = {
                mapStateToProps: functionOfLength(stateProps.length, bundleMakeMapState),
                mapDispatchToProps: jest.fn(),
            };
            const bundles = extraBundle ? [bundle, extraBundle] : [bundle];
            const mappedArray = extraBundle ? [mapped, extraBundleMapped] : [mapped];
            const reversedMappedArray = mappedArray.slice().reverse();

            const mapBundlesToProps = jest.fn((...values) => values.slice().reverse());

            const connected = consume(bundles, mapBundlesToProps);
            expect(connect).toBeCalledTimes(1);
            expect(connect).toBeCalledWith(expect.any(Function), expect.any(Function), expect.any(Function), undefined);
            expect(connected).toEqual(connectReturn);

            const [makeMapStateToProps, mapDispatchToProps, mergeProps, options] = connect.mock.calls[0];
            expect(makeMapStateToProps.length).toBe(stateProps.length);

            const mapStateToProps = makeMapStateToProps(state, props);
            if (bundles.length === 1) {
                expect(makeMapStateToProps).toBe(bundle.mapStateToProps);
                expect(bundleMakeMapState).toBeCalledTimes(1);
                expect(bundleMapState).toBeCalledTimes(0);
                return; // no point testing the rest of this as it's just testing our unit test implementation
            }
            expect(bundleMakeMapState).toBeCalledWith(...stateProps);
            expect(bundleMakeMapState).toBeCalledTimes(1);
            expect(bundleMapState).toBeCalledTimes(0);
            expect(mapStateToProps).toEqual(expect.any(Function));
            expect(mapStateToProps.length).toBe(stateProps.length);

            const propMappedState = mapStateToProps(state, props);
            expect(bundleMapState).toBeCalledWith(...stateProps);
            expect(bundleMakeMapState).toBeCalledTimes(1);
            expect(bundleMapState).toBeCalledTimes(1);
        };
        it('works with context', worksTest(() => ({ expectContext: true })));
        it('works without context', worksTest(() => ({ expectContext: false })));
        it('works with some context', worksTest(() => {
            const extraBundleMapped = { b:2 };
            const mapStateToProps = jest.fn().mockReturnValue(extraBundleMapped);
            return {
                expectContext: true,
                extraBundle: {
                    mapStateToProps: jest.fn().mockReturnValue(mapStateToProps),
                },
                extraBundleMapped
            };
        }));
        it('works with some bundle omissions', worksTest(() => ({
            expectContext: true,
            extraBundle: {
                mapStateToProps: null,
            },
            extraBundleMapped: undefined
        })));
        it('works with no handlers', () => {
            const bundle = {
                mapStateToProps: null,
                mapDispatchToProps: jest.fn(),
            };

            const mapBundlesToProps = jest.fn(values => values[0]);

            const connected = consume([bundle], mapBundlesToProps);
            expect(connect).toBeCalledTimes(1);
            expect(connect.mock.calls[0][0]).toBeUndefined();
            expect(connected).toEqual(connectReturn);
            expect(mapBundlesToProps).toBeCalledTimes(0);
        });
    });
    describe('bundle mapDispatchToProps handling', () => {
        const worksTest = (getArgs) => () => {
            const { expectContext, extraBundle, extraBundleMapped } = getArgs();
            const state = {}, props = {};
            const stateProps = expectContext ? [state, props] : [state];

            const mapped = {};
            const bundleMapDispatch = jest.fn().mockReturnValue(mapped);
            const bundle = {
                mapStateToProps: jest.fn(),
                mapDispatchToProps: functionOfLength(stateProps.length, bundleMapDispatch),
            };
            const bundles = extraBundle ? [bundle, extraBundle] : [bundle];
            const mappedArray = extraBundle ? [mapped, extraBundleMapped] : [mapped];
            const reversedMappedArray = mappedArray.slice().reverse();

            const mapBundlesToProps = jest.fn((...values) => values.slice().reverse());

            const connected = consume(bundles, mapBundlesToProps);
            expect(connect).toBeCalledTimes(1);
            expect(connect).toBeCalledWith(expect.any(Function), expect.any(Function), expect.any(Function), undefined);
            expect(connected).toEqual(connectReturn);

            const [makeMapStateToProps, mapDispatchToProps] = connect.mock.calls[0];
            expect(mapDispatchToProps.length).toBe(stateProps.length);

            const propMappedDispatch = mapDispatchToProps(state, props);
            if (bundles.length === 1) {
                expect(mapDispatchToProps).toBe(bundle.mapDispatchToProps);
            } else {
                expect(bundleMapDispatch).toBeCalledWith(...stateProps);
            }
            expect(bundleMapDispatch).toBeCalledTimes(1);
        };
        it('works with context', worksTest(() => ({ expectContext: true })));
        it('works without context', worksTest(() => ({ expectContext: false })));
        it('works with some context', worksTest(() => {
            const extraBundleMapped = { b: expect.any(Function) };
            return {
                expectContext: true,
                extraBundle: {
                    mapDispatchToProps: functionOfLength(1, jest.fn().mockReturnValue(extraBundleMapped)),
                },
                extraBundleMapped
            };
        }));
        it('works with some bundle omissions', worksTest(() => ({
            expectContext: true,
            extraBundle: {
                mapDispatchToProps: null,
            },
            extraBundleMapped: undefined
        })));
        it('works with some objects', worksTest(() => ({
            expectContext: true,
            extraBundle: {
                mapDispatchToProps: { b: () => {} },
            },
            extraBundleMapped: { b: expect.any(Function) }
        })));
        it('works with no handlers', () => {
            const bundle = {
                mapStateToProps: null,
                mapDispatchToProps: null,
            };

            const mapBundlesToProps = jest.fn(values => values[0]);

            const connected = consume([bundle], mapBundlesToProps);
            expect(connect).toBeCalledTimes(1);
            expect(connect.mock.calls[0][1]).toBeUndefined();
            expect(connected).toEqual(connectReturn);
            expect(mapBundlesToProps).toBeCalledTimes(0);
        });
    });
});