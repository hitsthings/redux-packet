import { packAll } from '../src/pack.js';

describe('packAll()', () => {
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
                    expect(() => packAll(value).toThrowErrorMatchingSnapshot())
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
                    expect(() => packAll(value)).not.toThrow();
                })
            })
        });
        
        it('returns an object of functions with keys matching the input', () => {
            expect(packAll({ a: {}})).toEqual({ a: expect.any(Function) });
        });
    });

    describe('minimumSelectorsExpected', () => {
        it('does not validate if not passed in', () => {
            const packed = packAll({ a: { }});
            expect(() => packed.a()).not.toThrow();
        })
        it('validates contextSelector count', () => {
            const packed = packAll({ a: { minimumSelectorsExpected: 1 }});
            expect(() => packed.a()).toThrowErrorMatchingSnapshot();
            expect(() => packed.a(() => {})).not.toThrow();
            expect(() => packed.a(() => {}, () => {})).not.toThrow();
        });
    });

    describe('packets', () => {
        describe('with context', () => {
            describe('simple', () => {
                let packedWithContext, contextProviderA, makeSelector, selector, loadActionCreator;
                const contextValue = 40;
                const mappedProps = { prop: 42 };
                const loadAction = { type: 'A' };
                beforeEach(() => {
                    contextProviderA = jest.fn().mockReturnValue(contextValue);
                    selector = jest.fn().mockReturnValue(mappedProps);
                    loadActionCreator = jest.fn().mockReturnValue(loadAction);
                    packedWithContext = packAll({
                        a: {
                            selector,
                            actions: {
                                load: loadActionCreator
                            },
                        }
                    }).a(contextProviderA);
                });
                it('returns all packet props', () => {
                    expect(packedWithContext).toEqual({
                        mapStateToProps: expect.any(Function),
                        mapDispatchToProps: expect.any(Function),
                    });
                });
                it('calls selector in makeMapStateToProps', () => {
                    const state = {}, props = {};
                    const mapStateToProps = packedWithContext.mapStateToProps(state, props);
                    expect(selector).lastCalledWith(state, contextValue);

                    const mapped = mapStateToProps(state, props);
                    expect(mapped).toBe(mappedProps);

                    expect(selector).toHaveBeenCalledTimes(1);
                    expect(contextProviderA).toHaveBeenCalledTimes(1);
                });
                it('calls actions in mapDispatchToProps', () => {
                    const dispatch = jest.fn(), props = {};
                    const mapped = packedWithContext.mapDispatchToProps(dispatch, props);
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
                let packed, contextProviderA, makeSelector, selector, actions;
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
                    packed = packAll({
                        a: {
                            selector: makeSelector,
                            actions,
                        }
                    });
                });
                it('returns all packet props', () => {
                    expect(packed.a(contextProviderA)).toEqual({
                        mapStateToProps: expect.any(Function),
                        mapDispatchToProps: expect.any(Function),
                    });
                });
                it('calls makeSelector and selector in makeMapStateToProps', () => {
                    const state = {}, props = {};
                    const mapStateToProps = packed.a(contextProviderA).mapStateToProps(state, props);
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
                    const mapped = packed.a(contextProviderA).mapDispatchToProps(dispatch, props);
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
                let packed, makeSelector, selector, loadActionCreator;
                const contextValue = 40;
                const mappedProps = { prop: 42 };
                const loadAction = { type: 'A' };
                beforeEach(() => {
                    selector = jest.fn().mockReturnValue(mappedProps);
                    loadActionCreator = jest.fn().mockReturnValue(loadAction);
                    packed = packAll({
                        a: {
                            selector,
                            actions: {
                                load: loadActionCreator
                            },
                        }
                    }).a();
                });
                it('returns all packet props', () => {
                    expect(packed).toEqual({
                        mapStateToProps: expect.any(Function),
                        mapDispatchToProps: expect.any(Function),
                    });
                });
                it('calls selector in makeMapStateToProps', () => {
                    const state = {}, props = {};
                    const mapStateToProps = packed.mapStateToProps(state, props);
                    expect(selector).lastCalledWith(state);

                    const mapped = mapStateToProps(state, props);
                    expect(mapped).toBe(mappedProps);

                    expect(selector).toHaveBeenCalledTimes(1);
                });
                it('calls actions in mapDispatchToProps', () => {
                    const dispatch = jest.fn(), props = {};
                    const mapped = packed.mapDispatchToProps(dispatch, props);
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
                let packed, makeSelector, selector, actions;
                const mappedProps = { prop: 42 };
                const mappedActions = {
                    load: () => ({ type: 'A' })
                };
                beforeEach(() => {
                    selector = jest.fn().mockReturnValue(mappedProps);
                    makeSelector = jest.fn().mockReturnValue(selector);
                    actions = jest.fn().mockReturnValue(mappedActions);
                    packed = packAll({
                        a: {
                            selector: makeSelector,
                            actions,
                        }
                    });
                });
                it('returns all packet props', () => {
                    expect(packed.a()).toEqual({
                        mapStateToProps: expect.any(Function),
                        mapDispatchToProps: expect.any(Function),
                    });
                });
                it('calls makeSelector and selector in makeMapStateToProps', () => {
                    const state = {}, props = {};
                    const mapStateToProps = packed.a().mapStateToProps(state, props);
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
                    const mapped = packed.a().mapDispatchToProps(dispatch, props);
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