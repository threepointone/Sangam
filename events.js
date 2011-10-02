//classical inheritance
//also, base observable object for every other class, so simply do 
// var myClass = Events.extend({
//   initialize:function(){/* your constructor function here*/},
//   etc etc 
// });
//derived from @jashkenas' work on Backbone - https://github.com/documentcloud/backbone




(function() {

	var _ = require('underscore');
	
    var events = {

        // Bind an event, specified by a string name, `ev`, to a `callback` function.
        // Passing `"all"` will bind the callback to all events fired.
        bind: function(ev, callback) {
            var calls = this._callbacks || (this._callbacks = {});
            var list = calls[ev] || (calls[ev] = []);
            list.push(callback);
            return this;
        },

        // Remove one or many callbacks. If `callback` is null, removes all
        // callbacks for the event. If `ev` is null, removes all bound callbacks
        // for all events.
        unbind: function(ev, callback) {
            var calls;
            if (!ev) {
                this._callbacks = {};
            } else if (calls = this._callbacks) {
                if (!callback) {
                    calls[ev] = [];
                } else {
                    var list = calls[ev];
                    if (!list) return this;
                    for (var i = 0, l = list.length; i < l; i++) {
                        if (callback === list[i]) {
                            list[i] = null;
                            break;
                        }
                    }
                }
            }
            return this;
        },

        // Trigger an event, firing all bound callbacks. Callbacks are passed the
        // same arguments as `trigger` is, apart from the event name.
        // Listening for `"all"` passes the true event name as the first argument.
        trigger: function(eventName) {
            var list,
            calls,
            ev,
            callback,
            args;
            var both = 2;
            if (! (calls = this._callbacks)) return this;
            while (both--) {
                ev = both ? eventName: 'all';
                if (list = calls[ev]) {
                    for (var i = 0, l = list.length; i < l; i++) {
                        if (! (callback = list[i])) {
                            list.splice(i, 1);
                            i--;
                            l--;
                        } else {
                            args = both ? Array.prototype.slice.call(arguments, 1) : arguments;
                            callback.apply(this, args);
                        }
                    }
                }
            }
            return this;
        }

    };

    // Helpers
    // -------
    // The self-propagating extend function that Backbone classes use.

    var extend = function(protoProps, classProps) {
        var child = inherits(this, protoProps, classProps);
        child.extend = this.extend;
        return child;
    };


    // Shared empty constructor function to aid in prototype-chain creation.
    var ctor = function() {};

    // Helper function to correctly set up the prototype chain, for subclasses.
    // Similar to `goog.inherits`, but uses a hash of prototype properties and
    // class properties to be extended.
    var inherits = function(parent, protoProps, staticProps) {
        var child;

        // The constructor function for the new subclass is either defined by you
        // (the "constructor" property in your `extend` definition), or defaulted
        // by us to simply call `super()`.
        if (protoProps && protoProps.hasOwnProperty('constructor')) {
            child = protoProps.constructor;
        } else {
            child = function() {
                return parent.apply(this, arguments);
            };
        }

        // Inherit class (static) properties from parent.
        _.extend(child, parent);

        // Set the prototype chain to inherit from `parent`, without calling
        // `parent`'s constructor function.
        ctor.prototype = parent.prototype;
        child.prototype = new ctor();

        // Add prototype properties (instance properties) to the subclass,
        // if supplied.
        if (protoProps) _.extend(child.prototype, protoProps);

        // Add static properties to the constructor function, if supplied.
        if (staticProps) _.extend(child, staticProps);

        // Correctly set child's `prototype.constructor`.
        child.prototype.constructor = child;

        // Set a convenience property in case the parent's prototype is needed later.
        child.__super__ = parent.prototype;

        return child;
    };


	var Events = function(){
		return this.initialize.apply(this, arguments);
	};

	_.extend(Events.prototype, events, {
		initialize:function(){
			//override this in every object
		}
	});

    Events.extend = extend;

	exports.Events = Events;
    

})();

