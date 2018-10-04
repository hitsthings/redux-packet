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

  var memoizeFirstMapStateToProps=function(a,b,c,d,e,f){if(b){var h=function j(g,i){return h=function e(c,d){return a.apply(void 0,[c].concat(_toConsumableArray(b(d))))},i===d?g===c?e:a.apply(void 0,[g].concat(_toConsumableArray(f))):h(g,i);
  };return function(a,b){return h(a,b)}}var g=function d(b){return g=a,b===c?e:g(b)};return function(a){return g(a)}},checkPacketDescriptor=function(a,b,c,d){if("object"!==_typeof(a)||null===a)throw new TypeError("".concat(c," expects ").concat(d,"an object, but ").concat(b," was not."));if(a.selector&&"function"!=typeof a.selector)throw new TypeError("".concat(c," expects selector to be a function, but ").concat(b,".selector was not."));if(a.actions&&"function"!=typeof a.actions&&"object"!==_typeof(a.actions))throw new TypeError("".concat(c," expects actions to be a function or object, but ").concat(b,".actions was not."));if(!a.selector&&!a.actions)throw new TypeError("".concat(c," expects either selector or actions to be present, but ").concat(b," had neither."))},checkPacketMapAndGetNames=function(a){if("object"!==_typeof(a)||null===a)throw new TypeError("packAll(packetMap) expects packetMap to be an object.");if(Array.isArray(a))throw new TypeError("packAll(packetMap) expects packetMap to be an object, not an Array.");var b=Object.keys(a);if(0===b.length)throw new TypeError("packAll(packetMap) expected to receive an object with properties, but found no properties.");return b},selectorExecutor=function(a){return a=a.map(function(a){return "function"==typeof a?a:function(){return a}}),function(b){return a.map(function(a){return a(b)})}},internalPack=function(a,b){var c=function(){for(var c=arguments.length,d=Array(c),e=0;e<c;e++)d[e]=arguments[e];var f=0!==d.length,g=f&&selectorExecutor(d);if("minimumSelectorsExpected"in a&&d.length<a.minimumSelectorsExpected)throw new Error("The packet ".concat(b," expects at least ").concat(a.minimumSelectorsExpected," selectors to be provided."));var h=a.selector?function(b,c){var d=f?g(c):[],e=a.selector.apply(a,[b].concat(_toConsumableArray(d)));return "function"==typeof e?f?memoizeFirstMapStateToProps(e,g,{},c,null,d):function(a){return e(a)}:memoizeFirstMapStateToProps(a.selector,g,b,c,e,d);
  }:null,i="function"==typeof a.actions?f?function(b,c){return a.actions.apply(a,[b].concat(_toConsumableArray(g(c))))}:function(b){return a.actions(b)}:a.actions?function(b){return redux.bindActionCreators(a.actions,b)}:null;return {mapStateToProps:h,mapDispatchToProps:i}};return b&&Object.defineProperty(c,"name",{writable:!1,enumerable:!1,configurable:!0,value:"PacketMaker(".concat(b,")")}),c};var pack=function(a,b){return checkPacketDescriptor(a,"packetDescriptor","pack(packetDescriptor)",""),internalPack(a,b)};var packAll=function(a){var b=checkPacketMapAndGetNames(a);return b.reduce(function(b,c){var d=a[c];return checkPacketDescriptor(d,"packetMap['".concat(c,"']"),"packAll(packetMap)","each property to be "),b[c]=internalPack(d,c),b},{})};

  var nonUniqueFilter=function(a,b,c){return c.lastIndexOf(a)!==b},spreadAllSafe=function(a){return function(){for(var b=arguments.length,c=Array(b),d=0;d<b;d++)c[d]=arguments[d];var e=c.reduce(function(b,a){return b.concat(Object.keys(a))},[]).filter(nonUniqueFilter);if(e.length)throw new Error("Props are not unique. Pass in "+a+" to deduplicate them. Duplicate names: "+e.join(","));return Object.assign.apply(Object,[{}].concat(c))}},defaultMapPacketsToProps=spreadAllSafe("mapPacketsToProps"),defaultMergeProps=function(a,b){return _objectSpread({},a,b)},noop=function(){},anyContext=function(a,c){return a.some(function(a){return "function"==typeof a[c]&&1!==a[c].length})};var makeMergePropsOnePacket=function(a,b){return a?b?function(c,d,e){return b(a(_objectSpread({},c,d)),e)}:function(b,c,d){return _objectSpread({},a(_objectSpread({},b,c)),d)}:b?function(a,c,d){return b(_objectSpread({},a,c),d)}:void 0};var consumeOnePacket=function(a,b,c,d){return reactRedux.connect(a.mapStateToProps||void 0,a.mapDispatchToProps||void 0,makeMergePropsOnePacket(b,c),d)};var makeMapStateToProps=function(a,b){return (b.length||void 0)&&(anyContext(b,"mapStateToProps")?function(c,d){var e=a.map(function(a){return a.mapStateToProps?a.mapStateToProps(c,d):noop});return function(a,b){return {packets:e.map(function(c){return c(a,b)})}}}:function(c){var d=a.map(function(a){return a.mapStateToProps?a.mapStateToProps(c):noop});return function(a){return {packets:d.map(function(b){return b(a)})}}})};var makeMapDispatchToProps=function(a,b){return (b.length||void 0)&&(anyContext(b,"mapDispatchToProps")?function(c,d){return {packets:a.map(function(a){return a.mapDispatchToProps?"function"==typeof a.mapDispatchToProps?a.mapDispatchToProps(c,d):redux.bindActionCreators(a.mapDispatchToProps,c):void 0})}}:function(c){return {packets:a.map(function(a){return a.mapDispatchToProps?"function"==typeof a.mapDispatchToProps?a.mapDispatchToProps(c):redux.bindActionCreators(a.mapDispatchToProps,c):void 0})}})};var makeMergeProps=function(a,b){return a||(a=defaultMapPacketsToProps),b||(b=defaultMergeProps),function(c,d,e){var f=c.packets.map(function(a,b){var c=d.packets[b];return _objectSpread({},a,c)}),g=a.apply(void 0,_toConsumableArray(f));return b(g,e)}};var consume=function(a,b,c,d){if(a&&(a.mapStateToProps||a.mapDispatchToProps)&&(a=[a]),!Array.isArray(a)||0===a.length)throw new TypeError("At least one packets must be passed to component()");return 1===a.length?consumeOnePacket(a[0],b,c,d):reactRedux.connect(makeMapStateToProps(a,a.filter(function(a){return a.mapStateToProps})),makeMapDispatchToProps(a,a.filter(function(a){return a.mapDispatchToProps})),makeMergeProps(b,c),d)};

  exports.pack = pack;
  exports.packAll = packAll;
  exports.consume = consume;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=redux-packet.js.map
