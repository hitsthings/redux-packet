import { bundleAll } from '../src/bundle.js';

describe('bundleAll()', () => {
    describe('contract assertions', () => {
        describe('throws on invalid input', () => {
            [
                undefined,
                null,
                true,
                false,
                0,
                1,
                '',
                'string',
                ['array'],
                {},
                {a: true},
                {a: 1},
                {a: 'string'},
                {a: {selector:true}},
                {a: {selector:1}},
                {a: {selector:'string'}},
                {a: {actions:true}},
                {a: {actions:1}},
                {a: {actions:'string'}},
            ].forEach(value =>
                it(String(JSON.stringify(value)), () => {
                    expect(() => bundleAll(value).toThrowErrorMatchingSnapshot())
                })
            );
        });
        describe('accepts valid input', () => {
            [
                { a:{} },
                { a:{}, b: {} },
                { a:{ selector: () => {}} },
                { a:{ actions: {} } },
                { a:{ actions: () => {} } },
            ].forEach(value => {
                it(String(JSON.stringify(value)), () => {
                    expect(() => bundleAll(value)).not.toThrow();
                })
            })
        });
        
        it('returns an object of functions with keys matching the input', () => {
            expect(bundleAll({ a: {}})).toEqual({ a: expect.any(Function) });
        });
    });

    describe('minimumSelectorsExpected', () => {
        it('does not validate if not passed in', () => {
            const bundled = bundleAll({ a: { }});
            expect(() => bundled.a()).not.toThrow();
        })
        it('validates contextSelector count', () => {
            const bundled = bundleAll({ a: { minimumSelectorsExpected: 1 }});
            expect(() => bundled.a()).toThrowErrorMatchingSnapshot();
            expect(() => bundled.a(() => {})).not.toThrow();
            expect(() => bundled.a(() => {}, () => {})).not.toThrow();
        });
    });

    describe('bundles', () => {
        describe('with context', () => {
            describe('simple', () => {
                let bundledWithContext, contextProviderA, makeSelector, selector, loadActionCreator;
                const contextValue = 40;
                const mappedProps = { prop: 42 };
                const loadAction = { type: 'A' };
                beforeEach(() => {
                    contextProviderA = jest.fn().mockReturnValue(contextValue);
                    selector = jest.fn().mockReturnValue(mappedProps);
                    loadActionCreator = jest.fn().mockReturnValue(loadAction);
                    bundledWithContext = bundleAll({
                        a: {
                            selector,
                            actions: {
                                load: loadActionCreator
                            },
                        }
                    }).a(contextProviderA);
                });
                it('returns all bundle props', () => {
                    expect(bundledWithContext).toEqual({
                        mapStateToProps: expect.any(Function),
                        mapDispatchToProps: expect.any(Function),
                    });
                });
                it('calls selector in makeMapStateToProps', () => {
                    const state = {}, props = {};
                    const mapStateToProps = bundledWithContext.mapStateToProps(state, props);
                    expect(selector).lastCalledWith(state, contextValue);

                    const mapped = mapStateToProps(state, props);
                    expect(mapped).toBe(mappedProps);

                    expect(selector).toHaveBeenCalledTimes(1);
                    expect(contextProviderA).toHaveBeenCalledTimes(1);
                });
                it('calls actions in mapDispatchToProps', () => {
                    const dispatch = jest.fn(), props = {};
                    const mapped = bundledWithContext.mapDispatchToProps(dispatch, props);
                    expect(mapped).toEqual({
                        load: expect.any(Function)
                    });
                    const loadParam = {};
                    const action = mapped.load(loadParam);
                    expect(loadActionCreator).lastCalledWith(loadParam);
                    expect(dispatch).lastCalledWith(loadAction);
                    expect(loadActionCreator).toHaveBeenCalledTimes(1);
                    expect(dispatch).toHaveBeenCalledTimes(1);
                    expect(contextProviderA).toHaveBeenCalledTimes(0);
                });
            });

            describe('complex', () => {
                let bundled, contextProviderA, makeSelector, selector, actions;
                const contextValue = 40;
                const mappedProps = { prop: 42 };
                const mappedActions = {
                    load: () => ({ type: 'A' })
                };
                beforeEach(() => {
                    contextProviderA = jest.fn().mockReturnValue(contextValue);
                    selector = jest.fn().mockReturnValue(mappedProps);
                    makeSelector = jest.fn().mockReturnValue(selector);
                    actions = jest.fn().mockReturnValue(mappedActions);
                    bundled = bundleAll({
                        a: {
                            selector: makeSelector,
                            actions,
                        }
                    });
                });
                it('returns all bundle props', () => {
                    expect(bundled.a(contextProviderA)).toEqual({
                        mapStateToProps: expect.any(Function),
                        mapDispatchToProps: expect.any(Function),
                    });
                });
                it('calls makeSelector and selector in makeMapStateToProps', () => {
                    const state = {}, props = {};
                    const mapStateToProps = bundled.a(contextProviderA).mapStateToProps(state, props);
                    expect(makeSelector).lastCalledWith(state, contextValue);
                    expect(selector).not.toHaveBeenCalled();

                    const mapped = mapStateToProps(state, props);
                    expect(selector).lastCalledWith(state, contextValue);
                    expect(mapped).toBe(mappedProps);

                    expect(makeSelector).toHaveBeenCalledTimes(1);
                    expect(selector).toHaveBeenCalledTimes(1);
                    expect(actions).not.toHaveBeenCalled();
                    expect(contextProviderA).toHaveBeenCalledTimes(1);
                });
                it('calls actions in mapDispatchToProps', () => {
                    const dispatch = jest.fn(), props = {};
                    const mapped = bundled.a(contextProviderA).mapDispatchToProps(dispatch, props);
                    expect(actions).lastCalledWith(dispatch, contextValue);
                    expect(mapped).toBe(mappedActions);

                    expect(actions).toHaveBeenCalledTimes(1);
                    expect(selector).not.toHaveBeenCalled();
                    expect(makeSelector).not.toHaveBeenCalled();
                    expect(contextProviderA).toHaveBeenCalledTimes(1);
                });
            });
        });

        describe('without context', () => {
            describe('simple', () => {
                let bundled, makeSelector, selector, loadActionCreator;
                const contextValue = 40;
                const mappedProps = { prop: 42 };
                const loadAction = { type: 'A' };
                beforeEach(() => {
                    selector = jest.fn().mockReturnValue(mappedProps);
                    loadActionCreator = jest.fn().mockReturnValue(loadAction);
                    bundled = bundleAll({
                        a: {
                            selector,
                            actions: {
                                load: loadActionCreator
                            },
                        }
                    }).a();
                });
                it('returns all bundle props', () => {
                    expect(bundled).toEqual({
                        mapStateToProps: expect.any(Function),
                        mapDispatchToProps: expect.any(Function),
                    });
                });
                it('calls selector in makeMapStateToProps', () => {
                    const state = {}, props = {};
                    const mapStateToProps = bundled.mapStateToProps(state, props);
                    expect(selector).lastCalledWith(state);

                    const mapped = mapStateToProps(state, props);
                    expect(mapped).toBe(mappedProps);

                    expect(selector).toHaveBeenCalledTimes(1);
                });
                it('calls actions in mapDispatchToProps', () => {
                    const dispatch = jest.fn(), props = {};
                    const mapped = bundled.mapDispatchToProps(dispatch, props);
                    expect(mapped).toEqual({
                        load: expect.any(Function)
                    });
                    const loadParam = {};
                    const action = mapped.load(loadParam);
                    expect(loadActionCreator).lastCalledWith(loadParam);
                    expect(dispatch).lastCalledWith(loadAction);
                    expect(loadActionCreator).toHaveBeenCalledTimes(1);
                    expect(dispatch).toHaveBeenCalledTimes(1);
                });
            });

            describe('complex', () => {
                let bundled, makeSelector, selector, actions;
                const mappedProps = { prop: 42 };
                const mappedActions = {
                    load: () => ({ type: 'A' })
                };
                beforeEach(() => {
                    selector = jest.fn().mockReturnValue(mappedProps);
                    makeSelector = jest.fn().mockReturnValue(selector);
                    actions = jest.fn().mockReturnValue(mappedActions);
                    bundled = bundleAll({
                        a: {
                            selector: makeSelector,
                            actions,
                        }
                    });
                });
                it('returns all bundle props', () => {
                    expect(bundled.a()).toEqual({
                        mapStateToProps: expect.any(Function),
                        mapDispatchToProps: expect.any(Function),
                    });
                });
                it('calls makeSelector and selector in makeMapStateToProps', () => {
                    const state = {}, props = {};
                    const mapStateToProps = bundled.a().mapStateToProps(state, props);
                    expect(makeSelector).lastCalledWith(state);
                    expect(selector).not.toHaveBeenCalled();

                    const mapped = mapStateToProps(state, props);
                    expect(selector).lastCalledWith(state);
                    expect(mapped).toBe(mappedProps);

                    expect(makeSelector).toHaveBeenCalledTimes(1);
                    expect(selector).toHaveBeenCalledTimes(1);
                    expect(actions).not.toHaveBeenCalled();
                });
                it('calls actions in mapDispatchToProps', () => {
                    const dispatch = jest.fn(), props = {};
                    const mapped = bundled.a().mapDispatchToProps(dispatch, props);
                    expect(actions).lastCalledWith(dispatch);
                    expect(mapped).toBe(mappedActions);

                    expect(actions).toHaveBeenCalledTimes(1);
                    expect(selector).not.toHaveBeenCalled();
                    expect(makeSelector).not.toHaveBeenCalled();
                });
            });
        });
    });
});