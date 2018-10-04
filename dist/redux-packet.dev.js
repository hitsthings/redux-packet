(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('redux'), require('react-redux')) :
  typeof define === 'function' && define.amd ? define(['exports', 'redux', 'react-redux'], factory) :
  (factory((global.ReactPacket = {}),global.Redux,global.ReactRedux));
}(this, (function (exports,redux,reactRedux) { 'use strict';

  function _typeof(obj) {
    if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
      _typeof = function (obj) {
        return typeof obj;
      };
    } else {
      _typeof = function (obj) {
        return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
      };
    }

    return _typeof(obj);
  }

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function _objectSpread(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i] != null ? arguments[i] : {};
      var ownKeys = Object.keys(source);

      if (typeof Object.getOwnPropertySymbols === 'function') {
        ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) {
          return Object.getOwnPropertyDescriptor(source, sym).enumerable;
        }));
      }

      ownKeys.forEach(function (key) {
        _defineProperty(target, key, source[key]);
      });
    }

    return target;
  }

  function _toConsumableArray(arr) {
    return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread();
  }

  function _arrayWithoutHoles(arr) {
    if (Array.isArray(arr)) {
      for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

      return arr2;
    }
  }

  function _iterableToArray(iter) {
    if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter);
  }

  function _nonIterableSpread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance");
  }

  /*
  //usage of pack
  packAll({
      fromContext: {
          selector: (state, contextA, contextB) => `itemsInContext`, // or a function returning this to make one per component
          actions: (contextA, contextB) => `actionsForContext`,
      }
  })
  const users = packAll({
      fromGroup: {
          selector: () => createStructuredSelector({
              users: usersForGroupSelector,
              usersLoading: usersLoadingForGroupSelector,
              usersAllLoaded: usersAllLoadedForGroupSelector,
              usersLoadingErrors: usersLoadingErrorsForGroupSelector,
          }),
          actions: (dispatch, group) => ({
              loadUsers: () => dispatch(loadUsersForGroup(group)),
              addUserToGroup: user => dispatch(addUserToGroup(user, group)),
          }), // OR a raw object like actions: { actionA: actionCreatorA, actionB: actionCreatorB }
      },
      byPermission: { ... }
  })
  */

  var memoizeFirstMapStateToProps = function memoizeFirstMapStateToProps(selector, executeContextSelectors, firstState, firstProps, firstValue, firstContext) {
    if (executeContextSelectors) {
      var _inner2 = function _inner(state, props) {
        _inner2 = function _inner(state, props) {
          return selector.apply(void 0, [state].concat(_toConsumableArray(executeContextSelectors(props))));
        };

        if (props !== firstProps) {
          // nothing salvageable
          return _inner2(state, props);
        }

        if (state !== firstState) {
          return selector.apply(void 0, [state].concat(_toConsumableArray(firstContext))); // same props, can memoize contexts
        }

        return firstValue; // same props and state, can return first value
      };

      return function (state, props) {
        return _inner2(state, props);
      };
    }

    var _inner3 = function inner(state) {
      _inner3 = selector;
      return state === firstState ? firstValue : _inner3(state);
    };

    return function (state) {
      return _inner3(state);
    };
  };

  var checkPacketDescriptor = function checkPacketDescriptor(packetDescriptor, name, calledFnName, argExpectation) {
    if (_typeof(packetDescriptor) !== 'object' || packetDescriptor === null) {
      throw new TypeError("".concat(calledFnName, " expects ").concat(argExpectation, "an object, but ").concat(name, " was not."));
    }

    if (packetDescriptor.selector && typeof packetDescriptor.selector !== 'function') {
      throw new TypeError("".concat(calledFnName, " expects selector to be a function, but ").concat(name, ".selector was not."));
    }

    if (packetDescriptor.actions && typeof packetDescriptor.actions !== 'function' && _typeof(packetDescriptor.actions) !== 'object') {
      throw new TypeError("".concat(calledFnName, " expects actions to be a function or object, but ").concat(name, ".actions was not."));
    }

    if (!packetDescriptor.selector && !packetDescriptor.actions) {
      throw new TypeError("".concat(calledFnName, " expects either selector or actions to be present, but ").concat(name, " had neither."));
    }
  };

  var checkPacketMapAndGetNames = function checkPacketMapAndGetNames(packetMap) {
    if (_typeof(packetMap) !== 'object' || packetMap === null) {
      throw new TypeError('packAll(packetMap) expects packetMap to be an object.');
    }

    if (Array.isArray(packetMap)) {
      throw new TypeError('packAll(packetMap) expects packetMap to be an object, not an Array.');
    }

    var packetNames = Object.keys(packetMap);

    if (packetNames.length === 0) {
      throw new TypeError('packAll(packetMap) expected to receive an object with properties, but found no properties.');
    }

    return packetNames;
  };

  var selectorExecutor = function selectorExecutor(selectors) {
    selectors = selectors.map(function (selector) {
      return typeof selector === 'function' ? selector : function () {
        return selector;
      };
    });
    return function (props) {
      return selectors.map(function (selector) {
        return selector(props);
      });
    };
  };

  var internalPack = function internalPack(packetDescriptor, name) {
    var PacketMaker = function PacketMaker() {
      for (var _len = arguments.length, contextSelectors = new Array(_len), _key = 0; _key < _len; _key++) {
        contextSelectors[_key] = arguments[_key];
      }

      var hasContext = contextSelectors.length !== 0;
      var executeContextSelectors = hasContext && selectorExecutor(contextSelectors);

      if ('minimumSelectorsExpected' in packetDescriptor && contextSelectors.length < packetDescriptor.minimumSelectorsExpected) {
        throw new Error("The packet ".concat(name, " expects at least ").concat(packetDescriptor.minimumSelectorsExpected, " selectors to be provided."));
      }

      var mapStateToProps = packetDescriptor.selector ? function (firstState, firstProps) {
        var firstContext = hasContext ? executeContextSelectors(firstProps) : [];
        var firstValue = packetDescriptor.selector.apply(packetDescriptor, [firstState].concat(_toConsumableArray(firstContext)));

        if (typeof firstValue !== 'function') {
          // no factory, fully memoized first call
          return memoizeFirstMapStateToProps(packetDescriptor.selector, executeContextSelectors, firstState, firstProps, firstValue, firstContext);
        }

        if (hasContext) {
          // factory, but memoize first context if we can. Passing in a new object as firstState means we'll never return a memoized firstValue
          return memoizeFirstMapStateToProps(firstValue, executeContextSelectors, {}, firstProps, null, firstContext);
        } // factory, no context, no memoization


        return function (state) {
          return firstValue(state);
        };
      } : null;
      var mapDispatchToProps = typeof packetDescriptor.actions === 'function' ? hasContext ? function (dispatch, props) {
        return packetDescriptor.actions.apply(packetDescriptor, [dispatch].concat(_toConsumableArray(executeContextSelectors(props))));
      } : function (dispatch) {
        return packetDescriptor.actions(dispatch);
      } : packetDescriptor.actions ? function (dispatch) {
        return redux.bindActionCreators(packetDescriptor.actions, dispatch);
      } : null;
      return {
        mapStateToProps: mapStateToProps,
        mapDispatchToProps: mapDispatchToProps
      };
    };

    if (name) {
      Object.defineProperty(PacketMaker, 'name', {
        writable: false,
        enumerable: false,
        configurable: true,
        value: "PacketMaker(".concat(name, ")")
      });
    }

    return PacketMaker;
  };

  var pack = function pack(packetDescriptor, name) {
    checkPacketDescriptor(packetDescriptor, "packetDescriptor", "pack(packetDescriptor)", "");
    return internalPack(packetDescriptor, name);
  };
  var packAll = function packAll(packetMap) {
    var packetNames = checkPacketMapAndGetNames(packetMap);
    return packetNames.reduce(function (o, name) {
      var packetDescriptor = packetMap[name];
      checkPacketDescriptor(packetDescriptor, "packetMap['".concat(name, "']"), "packAll(packetMap)", "each property to be ");
      o[name] = internalPack(packetDescriptor, name);
      return o;
    }, {});
  };

  var nonUniqueFilter = function nonUniqueFilter(value, i, values) {
    return values.lastIndexOf(value) !== i;
  };

  var spreadAllSafe = function spreadAllSafe(fallbackName) {
    return function () {
      for (var _len = arguments.length, values = new Array(_len), _key = 0; _key < _len; _key++) {
        values[_key] = arguments[_key];
      }

      var nonUniqueProps = values.reduce(function (a, v) {
        return a.concat(Object.keys(v));
      }, []).filter(nonUniqueFilter);

      if (nonUniqueProps.length) {
        throw new Error("Props are not unique. " + "Pass in " + fallbackName + " to deduplicate them. " + "Duplicate names: " + nonUniqueProps.join(','));
      }

      return Object.assign.apply(Object, [{}].concat(values));
    };
  };

  var defaultMapPacketsToProps = spreadAllSafe("mapPacketsToProps");

  var defaultMergeProps = function defaultMergeProps(packetProps, ownProps) {
    return _objectSpread({}, packetProps, ownProps);
  };

  var noop = function noop() {};

  var anyContext = function anyContext(packets, prop) {
    return packets.some(function (b) {
      return typeof b[prop] === 'function' && b[prop].length !== 1;
    });
  };

  var makeMergePropsOnePacket = function makeMergePropsOnePacket(mapPacketsToProps, mergeProps) {
    if (!mapPacketsToProps) {
      if (!mergeProps) {
        return undefined;
      }

      return function (stateProps, dispatchProps, ownProps) {
        return mergeProps(_objectSpread({}, stateProps, dispatchProps), ownProps);
      };
    }

    if (!mergeProps) {
      return function (stateProps, dispatchProps, ownProps) {
        return _objectSpread({}, mapPacketsToProps(_objectSpread({}, stateProps, dispatchProps)), ownProps);
      };
    }

    return function (stateProps, dispatchProps, ownProps) {
      return mergeProps(mapPacketsToProps(_objectSpread({}, stateProps, dispatchProps)), ownProps);
    };
  };
  var consumeOnePacket = function consumeOnePacket(packet, mapPacketsToProps, mergeProps, options) {
    return reactRedux.connect(packet.mapStateToProps || undefined, packet.mapDispatchToProps || undefined, makeMergePropsOnePacket(mapPacketsToProps, mergeProps), options);
  };
  var makeMapStateToProps = function makeMapStateToProps(packets, withState) {
    return (withState.length || undefined) && (anyContext(withState, 'mapStateToProps') ? function (state, props) {
      var mapStateToPropsList = packets.map(function (b) {
        return b.mapStateToProps ? b.mapStateToProps(state, props) : noop;
      });
      return function (state, props) {
        return {
          packets: mapStateToPropsList.map(function (mapper) {
            return mapper(state, props);
          })
        };
      };
    } : function (state) {
      var mapStateToPropsList = packets.map(function (b) {
        return b.mapStateToProps ? b.mapStateToProps(state) : noop;
      });
      return function (state) {
        return {
          packets: mapStateToPropsList.map(function (mapper) {
            return mapper(state);
          })
        };
      };
    });
  };
  var makeMapDispatchToProps = function makeMapDispatchToProps(packets, withDispatch) {
    return (withDispatch.length || undefined) && (anyContext(withDispatch, 'mapDispatchToProps') ? function (dispatch, props) {
      return {
        packets: packets.map(function (b) {
          return b.mapDispatchToProps ? typeof b.mapDispatchToProps === 'function' ? b.mapDispatchToProps(dispatch, props) : redux.bindActionCreators(b.mapDispatchToProps, dispatch) : undefined;
        })
      };
    } : function (dispatch) {
      return {
        packets: packets.map(function (b) {
          return b.mapDispatchToProps ? typeof b.mapDispatchToProps === 'function' ? b.mapDispatchToProps(dispatch) : redux.bindActionCreators(b.mapDispatchToProps, dispatch) : undefined;
        })
      };
    });
  };
  var makeMergeProps = function makeMergeProps(mapPacketsToProps, mergeProps) {
    if (!mapPacketsToProps) {
      mapPacketsToProps = defaultMapPacketsToProps;
    }

    if (!mergeProps) {
      mergeProps = defaultMergeProps;
    }

    return function (stateProps, dispatchProps, ownProps) {
      var propsByPacket = stateProps.packets.map(function (packetState, i) {
        var packetDispatch = dispatchProps.packets[i];
        return _objectSpread({}, packetState, packetDispatch);
      });
      var packetProps = mapPacketsToProps.apply(void 0, _toConsumableArray(propsByPacket));
      return mergeProps(packetProps, ownProps);
    };
  };
  var consume = function consume(packets, mapPacketsToProps, mergeProps, options) {
    if (packets && (packets.mapStateToProps || packets.mapDispatchToProps)) {
      packets = [packets];
    }

    if (!Array.isArray(packets) || packets.length === 0) {
      throw new TypeError('At least one packets must be passed to component()');
    }

    if (packets.length === 1) return consumeOnePacket(packets[0], mapPacketsToProps, mergeProps, options);
    return reactRedux.connect(makeMapStateToProps(packets, packets.filter(function (b) {
      return b.mapStateToProps;
    })), makeMapDispatchToProps(packets, packets.filter(function (b) {
      return b.mapDispatchToProps;
    })), makeMergeProps(mapPacketsToProps, mergeProps), options);
  };

  exports.pack = pack;
  exports.packAll = packAll;
  exports.consume = consume;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=redux-packet.dev.js.map
