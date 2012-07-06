/** Blade Live UI plugin
    (c) Copyright 2012. Blake Miner. All rights reserved.
    https://github.com/bminer/node-blade
    http://www.blakeminer.com/

    See the full license here:
        https://raw.github.com/bminer/node-blade/master/LICENSE.txt
	
	Adds the following to the `blade` global variable:
		- Model
		- Context
	
	Browser Support:
		-Chrome
		-Firefox 4+ (not tested)
		-IE 9+
		-IE 8 (requires definePropertyIE8 plugin; IE is dumb)
		-Safari 5.1+ (not tested)
		-Opera 12+ (not tested)
	If using the definePropertyIE8 plugin, include it into your HTML document
	using a conditional comment like this:
	<!--[if IE 8]>
		<script type="text/javascript" src="/blade/plugins/definePropertyIE8.js"></script>
	<![endif]-->
*/
(function() {
	if(!window.blade) return; //Nothing to expose, so just quit
	var Context = function () {
		// Each context has a unique number. You can use this to avoid
		// storing multiple copies of the same context in the
		// invalidation list.
		this.id = Context.next_id++;
		this._callbacks = []; //called when invalidated
		this._invalidated = false;
	};
	blade.Context = Context; //expose this Object
	
	//Global static variables
	Context.next_id = 0;
	Context.current = null;
	Context.pending_invalidate = []; //list of Contexts that have been invalidated but not flushed

	//Calls all Context _callbacks on each Context listed in Context.pending_invalidate
	Context.flush = function() {
		while (Context.pending_invalidate.length > 0) {
			var pending = Context.pending_invalidate;
			Context.pending_invalidate = [];
			for(var i = 0; i < pending.length; i++) {
				var ctx = pending[i];
				for(var j = 0; j < ctx._callbacks.length; j++)
					ctx._callbacks[j](ctx);
				delete ctx._callbacks; //maybe help the GC
			}
		}
	}

	//Run a function in this Context
	Context.prototype.run = function (f) {
		var previous = Context.current;
		Context.current = this;
		try { var ret = f(); }
		finally { Context.current = previous; }
		return ret;
	};

	// we specifically guarantee that this doesn't call any
	// invalidation functions (before returning) -- it just marks the
	// context as invalidated.
	Context.prototype.invalidate = function () {
		if (!this._invalidated) {
			this._invalidated = true;
			// If this is first invalidation, schedule a flush.
			// We may be inside a flush already, in which case this
			// is unnecessary but harmless.
			if (Context.pending_invalidate.length == 0)
				setTimeout(Context.flush, 0);
			Context.pending_invalidate.push(this);
		}
	};

	// Calls f immediately if this context was already
	// invalidated. The callback receives one argument, the context.
	Context.prototype.on_invalidate = function (f) {
		if (this._invalidated)
			f(this);
		else
			this._callbacks.push(f);
	};

	function Model(data) {
		/*A proxy object that can be written to
			or read from to invoke the Model's set and get functions */
		this.observable = Object.defineProperty({}, "_model", {
			"value": this,
			"enumerable": false
		});
		this._rawData = {}; //the raw model data
		this._keyDeps = {}; //the key's dependent contexts - indexed by key.
		//this._keyDeps[key] is an Object of contexts, indexed by context ID
		
		//If data was passed into the constructor, add each property to the Model
		if(data)
			for(var i in data)
				this.add(i, data[i]);
	}
	blade.Model = Model; //expose this Object
	
	//Add a new key-value pair to the Model, if it doesn't already exist.
	Model.prototype.add = function(key, value) {
		var self = this;
		//If the key already is being tracked, just set the value
		if(self._keyDeps[key])
			return self.set(key, value);
		
		//Create dependent contexts
		self._keyDeps[key] = {};
		//Add the property to self.observable
		Object.defineProperty(self.observable, key, {
			"get": function() {return self.get(key);},
			"set": function(val) {self.set(key, val);},
			"configurable": true,
			"enumerable": true
		});
		//Finally, set the value of the newly created property
		return self.set(key, value);
	};
	//Stop tracking this property completely, without invoking any invalidations
	Model.prototype.remove = function(key) {
		delete this.observable[key];
		delete this._rawData[key];
		delete this._keyDeps[key];
	};
	//Get the value of the specified key, and add an invalidation callback to
	//the current Context
	Model.prototype.get = function(key) {
		var self = this;
		var context = Context.current;
		if(context && !self._keyDeps[key][context.id]) {
			//Store the current context and setup invalidation callback
			self._keyDeps[key][context.id] = context;
			context.on_invalidate(function() {
				//Check to see if self._keyDeps[key] exists first,
				//as this property might have been deleted
				if(self._keyDeps[key])
					delete self._keyDeps[key][context.id];
			});
		}
		return self._rawData[key];
	};
	//Just take a peek at the value of the specified key,
	//without adding any Context invalidation callbacks
	Model.prototype.peek = function(key) {
		return this._rawData[key];
	};
	//Set (or add, if necessary) the key to the specified value, invalidating
	//any Contexts, as necessary
	Model.prototype.set = function(key, value) {
		var self = this;
		if(self._rawData[key] === value)
			return false; //The value is unchanged
		if(!self._keyDeps[key])
			return self.add(key, value); //The key needs to be added first
		
		//Set the value and invalidate all dependent contexts
		self._rawData[key] = value;
		for(var cid in self._keyDeps[key])
			self._keyDeps[key][cid].invalidate();
		return true;
	};
	//Synchronizes with the 'observable' Object
	//If properties are added/removed, all keys in the model are invalidated
	Model.prototype.sync = function() {
		//This function doesn't work in IE 8
		if(this.observable instanceof Element)
			return false;
		var invalidate = false;
		//sync properties added to the observable Object
		for(var key in this.observable)
			if(!this._keyDeps[key])
			{
				this.add(key, this.observable[key]);
				invalidate = true;
			}
		//sync properties removed from the observable Object
		for(var key in this._rawData)
			if(!this.observable[key])
			{
				this.remove(key);
				invalidate = true;
			}
		//invalidate all contexts for all keys
		if(invalidate)
			for(var key in this._keyDeps)
				for(var cid in this._keyDeps[key])
					this._keyDeps[key][cid].invalidate();
		return invalidate;
	};
})();