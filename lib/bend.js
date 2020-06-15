(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define("bend", [], factory);
	else if(typeof exports === 'object')
		exports["bend"] = factory();
	else
		root["bend"] = factory();
})(typeof self !== 'undefined' ? self : this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = _default;

var _vector = _interopRequireDefault(__webpack_require__(1));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function Bend(_ref) {
  var _ref$path = _ref.path,
      path = _ref$path === void 0 ? '' : _ref$path,
      _ref$initialPosition = _ref.initialPosition,
      initialPosition = _ref$initialPosition === void 0 ? {
    x: 0,
    y: 0
  } : _ref$initialPosition,
      _ref$initialDirection = _ref.initialDirection,
      initialDirection = _ref$initialDirection === void 0 ? {
    x: 1,
    y: 0
  } : _ref$initialDirection;

  if (!(this instanceof Bend)) {
    return new Bend({
      path: path,
      initialPosition: initialPosition,
      initialDirection: initialDirection
    });
  }

  this.path = path;
  this.initialPosition = (0, _vector["default"])(initialPosition);
  this.initialDirection = (0, _vector["default"])(initialDirection);
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

var words = {
  d: function d(_ref2) {
    var instructions = _ref2.instructions,
        params = _ref2.params;
    var radius = params.pop() / 2;
    instructions.unshift({
      type: 'barRadius',
      radius: radius
    });
    return {
      instructions: instructions,
      params: params
    };
  },
  s: function s(_ref3) {
    var instructions = _ref3.instructions,
        params = _ref3.params;
    var radius = params.pop() / 2;
    instructions.push({
      type: 'bendRadius',
      radius: radius
    });
    return {
      instructions: instructions,
      params: params
    };
  },
  l: function l(_ref4) {
    var instructions = _ref4.instructions,
        params = _ref4.params;
    var length = params.pop();
    var index = instructions.length - 1;

    if (instructions[index] && instructions[index].type === 'bend') {
      length -= instructions[index].lengthToTangent;
    }

    instructions.push({
      type: 'forward',
      length: length
    });
    return {
      instructions: instructions,
      params: params
    };
  },
  w: function w(_ref5) {
    var instructions = _ref5.instructions,
        params = _ref5.params;
    var angle = params.pop();
    var index = instructions.length - 1; // Find bend radius, if any

    var br = 0;

    for (var i = index; i >= 0; i -= 1) {
      if (instructions[i].type === 'bendRadius') {
        br = instructions[i].radius;
        break;
      }
    }

    if (br === 0) {
      // No bend radius results in a sharp turn
      instructions.push({
        type: 'turn',
        angle: angle
      });
    } else {
      // Bend radius requires modification of neighboring straight segments
      var lengthToTangent = br / Math.tan(deg2rad(180 - Math.abs(angle)) / 2);
      instructions[index].length -= lengthToTangent;
      instructions.push({
        type: 'bend',
        angle: angle,
        lengthToTangent: lengthToTangent
      });
    }

    return {
      instructions: instructions,
      params: params
    };
  },
  div: function div(_ref6) {
    var instructions = _ref6.instructions,
        params = _ref6.params;
    var d = params.pop();
    var n = params.pop();
    params.push(n / d);
    return {
      instructions: instructions,
      params: params
    };
  },
  atan: function atan(_ref7) {
    var instructions = _ref7.instructions,
        params = _ref7.params;
    var p = params.pop();
    params.push(Math.atan(p));
    return {
      instructions: instructions,
      params: params
    };
  },
  neg: function neg(_ref8) {
    var instructions = _ref8.instructions,
        params = _ref8.params;
    var p = params.pop();
    params.push(-p);
    return {
      instructions: instructions,
      params: params
    };
  }
};
var draw = {
  barRadius: function barRadius(_ref9) {
    var pen = _ref9.pen,
        instruction = _ref9.instruction;
    return {
      pen: _objectSpread(_objectSpread({}, pen), {}, {
        barRadius: instruction.radius
      }),
      d: null
    };
  },
  bendRadius: function bendRadius(_ref10) {
    var pen = _ref10.pen,
        instruction = _ref10.instruction;
    return {
      pen: _objectSpread(_objectSpread({}, pen), {}, {
        bendRadius: instruction.radius
      }),
      d: null
    };
  },
  forward: function forward(_ref11) {
    var pen = _ref11.pen,
        instruction = _ref11.instruction;
    var position = pen.position.add(pen.direction.scale(instruction.length));
    return {
      pen: _objectSpread(_objectSpread({}, pen), {}, {
        position: position
      }),
      d: "L ".concat(position.x, " ").concat(position.y)
    };
  },
  bend: function bend(_ref12) {
    var pen = _ref12.pen,
        instruction = _ref12.instruction;
    var r = pen.bendRadius;
    var direction = pen.direction.rotateDeg(-instruction.angle);
    var position = pen.position.add(pen.direction.scale(instruction.lengthToTangent)).add(direction.scale(instruction.lengthToTangent));
    var sf = -instruction.angle > 0 ? 1 : 0;
    return {
      pen: _objectSpread(_objectSpread({}, pen), {}, {
        position: position,
        direction: direction
      }),
      d: "A ".concat(r, " ").concat(r, " 0 0 ").concat(sf, " ").concat(position.x, " ").concat(position.y)
    };
  },
  turn: function turn(_ref13) {
    var pen = _ref13.pen,
        instruction = _ref13.instruction;
    return {
      pen: _objectSpread(_objectSpread({}, pen), {}, {
        direction: pen.direction.rotateDeg(-instruction.angle)
      }),
      d: null
    };
  }
};

Bend.prototype.list = function list() {
  return this.path.split(' ');
};

Bend.prototype.instructions = function instructions() {
  var stack = {
    instructions: [],
    params: []
  };
  this.list().forEach(function (arg) {
    if (words[arg]) {
      stack = words[arg](stack);
    } else {
      stack.params.push(arg);
    }
  });
  return stack.instructions;
};

Bend.prototype.print = function print() {
  var pen = {
    position: this.initialPosition,
    direction: this.initialDirection
  };
  var d = "M ".concat(pen.position.x, " ").concat(pen.position.y);
  this.instructions().forEach(function (instruction) {
    var _draw$instruction$typ = draw[instruction.type]({
      pen: pen,
      instruction: instruction
    }),
        newPen = _draw$instruction$typ.pen,
        newD = _draw$instruction$typ.d;

    if (newD) d += " ".concat(newD);
    pen = newPen;
  });
  return d;
};

function _default(init) {
  return new Bend(init);
}

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

!function(t,e){ true?module.exports=e():"function"==typeof define&&define.amd?define("vector",[],e):"object"==typeof exports?exports.vector=e():t.vector=e()}("undefined"!=typeof self?self:this,function(){return function(t){function e(r){if(n[r])return n[r].exports;var o=n[r]={i:r,l:!1,exports:{}};return t[r].call(o.exports,o,o.exports,e),o.l=!0,o.exports}var n={};return e.m=t,e.c=n,e.d=function(t,n,r){e.o(t,n)||Object.defineProperty(t,n,{configurable:!1,enumerable:!0,get:r})},e.n=function(t){var n=t&&t.__esModule?function(){return t.default}:function(){return t};return e.d(n,"a",n),n},e.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},e.p="",e(e.s=0)}([function(t,e,n){"use strict";function r(t){return t*(Math.PI/180)}function o(t){return t*(180/Math.PI)}function i(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},e=t.x,n=t.y;if(!(this instanceof i))return new i({x:e,y:n});this.x=e||0,this.y=n||0}function u(t){return new i(t)}Object.defineProperty(e,"__esModule",{value:!0}),e.default=u,e.deg2rad=r,e.rad2deg=o,i.prototype.cross=function(t){return this.x*t.y-this.y*t.x},i.prototype.dot=function(t){return this.x*t.x+this.y*t.y},i.prototype.divide=function(t){return new i({x:this.x/t.x,y:this.y/t.y})},i.prototype.magnitude=function(){return Math.sqrt(this.dot({x:this.x,y:this.y}))},i.prototype.length=function(){return this.magnitude()},i.prototype.add=function(t){return new i({x:this.x+t.x,y:this.y+t.y})},i.prototype.subtract=function(t){return new i({x:this.x-t.x,y:this.y-t.y})},i.prototype.scale=function(t){return new i({x:this.x*t,y:this.y*t})},i.prototype.multiplyScalar=function(t){return this.scale(t)},i.prototype.angle=function(){return Math.atan2(this.y,this.x)},i.prototype.angleDeg=function(){return o(this.angle())},i.prototype.reverse=function(){return new i({x:-this.x,y:-this.y})},i.prototype.invert=function(){return this.reverse()},i.prototype.normalize=function(){var t=this.magnitude();return t<=0?new i({x:0,y:0}):this.scale(1/t)},i.prototype.direction=function(t){var e=new i(t).subtract({x:this.x,y:this.y}),n=e.magnitude();return n<=0?new i({x:1,y:0}):e.scale(1/n)},i.prototype.equal=function(t){return this.x===t.x&&this.y===t.y},i.prototype.rotate=function(t){return new i({x:Math.cos(t)*this.x-Math.sin(t)*this.y,y:Math.sin(t)*this.x+Math.cos(t)*this.y})},i.prototype.rotateDeg=function(t){var e=r(t);return this.rotate(e)},i.prototype.dist=function(t){return this.subtract(t).magnitude()},i.prototype.distSq=function(t){var e=this.subtract(t);return e.dot({x:e.x,y:e.y})},i.prototype.clone=function(){return new i({x:this.x,y:this.y})},i.prototype.get=function(){return{x:this.x,y:this.y}}}])});

/***/ })
/******/ ]);
});
//# sourceMappingURL=bend.js.map