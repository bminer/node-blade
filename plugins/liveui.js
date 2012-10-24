/** Blade Live UI plugin
    (c) Copyright 2012. Blake Miner. All rights reserved.
    https://github.com/bminer/node-blade
    http://www.blakeminer.com/

    See the full license here:
        https://raw.github.com/bminer/node-blade/master/LICENSE.txt
	
	Adds the following to the `blade` global variable:
		- Model
		- Context
	Adds the following to `blade.Runtime`:
		- render(viewName, locals, cb)
		- renderTo(element, viewName, locals [, cb])
	Adds the following functions to jQuery.fn:
		- render(viewName, locals [, cb])
	
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
	
	For element preservation support, please add jQuery 1.7+ to your project.
*/
(function() {
	if(!window.blade) return; //Nothing to expose, so just quit
	var Context = function () {
		// Each context has a unique number. You can use this to avoid
		// storing multiple copies of the same context in the
		// invalidation list.
		this.id = Context.next_id++;
		this._callbacks = []; //each of these are called when invalidated
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

	//Just mark the Context as invalidated; do not call any invalidation functions
	//just yet; instead, schedule them to be executed soon.
	Context.prototype.invalidate = function () {
		if (!this._invalidated) {
			this._invalidated = true;
			// If this is first invalidation, schedule a flush.
			// We may be inside a flush already, in which case this
			// is unnecessary but harmless.
			if (Context.pending_invalidate.length == 0)
				setTimeout(Context.flush, 1);
			Context.pending_invalidate.push(this);
		}
	};

	//Calls f immediately if this context was already
	//invalidated. The callback receives one argument, the Context.
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
		this._invalid = {}; //list of keys that are invalid
		this.validation = {}; //list of validation functions for each key
		//this._keyDeps[key] is an Object of contexts, indexed by context ID
		
		//If data was passed into the constructor, add each property to the Model
		if(data)
			for(var i in data)
				this.add(i, data[i]);
	}
	blade.Model = Model; //expose this Object
	
	//Add a new key-value pair to the Model, if it doesn't already exist.
	//If the key already exists, this is equivalent to calling Model.put(...)
	Model.prototype.add = function(key, value) {
		var self = this;
		//If the key already is being tracked, just put the value
		if(self._keyDeps[key])
			return self.put(key, value);
		
		//Create dependent contexts
		self._keyDeps[key] = {};
		//Add the property to self.observable
		Object.defineProperty(self.observable, key, {
			"get": function() {return self.get(key);},
			"set": function(val) {self.set(key, val);},
			"configurable": true,
			"enumerable": true
		});
		//Finally, put the value of the newly created property
		return self.put(key, value);
	};
	//Stop tracking this property completely, without invoking any invalidations
	Model.prototype.remove = function(key) {
		delete this.observable[key];
		delete this._keyDeps[key];
		delete this._invalid[key];
		var val = this._rawData[key];
		delete this._rawData[key];
		return val;
	};
	//Get the value of the specified key, and add an invalidation callback to
	//the current Context
	Model.prototype.get = function(key) {
		var self = this;
		if(!self._keyDeps[key])
			self.add(key); //Add the key; the value is undefined
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
		//Put the value and invalidate all dependent contexts
		var ret;
		if(ret = this.put(key, value) )
			this.invalidate(key);
		return ret;
	};
	//Set (or add, if necessary) the key to the specified value, without
	//invalidating any Contexts
	Model.prototype.put = function(key, value) {
		if(!this._keyDeps[key])
			return this.add(key, value); //The key needs to be added first
		
		//Validate
		delete this._invalid[key];
		var valid;
		if(valid = this.validation[key])
		{
			valid = valid.call(this, value, key);
			if(typeof valid == "object")
			{
				value = valid.value;
				valid = valid.valid;
			}
			if(!valid)
				this._invalid[key] = true;
		}
		if(this._rawData[key] === value)
			return false; //The value is unchanged
		//Set the raw value
		this._rawData[key] = value;
		return true;
	};
	//Invalidates any Contexts associated with the key or all keys (if
	//key is not specified)
	Model.prototype.invalidate = function(key) {
		if(key)
			for(var cid in this._keyDeps[key])
				this._keyDeps[key][cid].invalidate();
		else
			for(var key in this._keyDeps)
				this.invalidate(key); //recurse for each key
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
			this.invalidate();
		return invalidate;
	};
	//Returns true if the data is valid; false otherwise
	//Also returns false if the key has not been added to the Model
	Model.prototype.validate = function(key) {
		if(key)
			return this._keyDeps[key] && !this._invalid[key];
		else
			for(key in this._invalid)
				return false;
	};
	//Serializes the Model using JSON.stringify
	Model.prototype.serialize = function() {
		return JSON.stringify(this._rawData);
	};
	
	/* render(viewName, locals, cb)
		Asynchronously loads (if necessary) and renders the specified template
		using the specified locals in a new Context. If the Context is invalidated,
		the template will be re-rendered and the callback will be called again.
		- viewName - the name of the view to be loaded and rendered
		- locals - the locals to be passed to the view. If a `Model` object is
			passed to this method, the Model's `observable` Object will be passed
			to the view.
		- cb - a callback of the form cb(err, html) where `html` is an string of
			HTML produced by the view template
	*/
	blade.Runtime.render = function(viewName, locals, cb) {
		//Load and render the template
		blade.Runtime.loadTemplate(viewName, function(err, tmpl) {
			if(err) return cb(err);
			(function renderTemplate() {
				function renderIt() {
					tmpl(locals ? locals.observable || locals : {}, cb);
				}
				var context = new Context();
				context.on_invalidate(renderTemplate); //recurse
				context.run(renderIt);
			})();
		});
	};
	/* renderTo(element, viewName, locals [, cb])
		Same as render(), except the output of the view is immediately injected
		into the specified element.  In addition, any event handlers created by
		the view are bound.  Finally, the element in focus is "preserved" if jQuery
		is available and if the element either has an 'id' attribute or has a 'name'
		attribute and a parent who has an 'id' attribute.
		Also, from within the callback, `this` refers to the `element`.
	*/
	blade.Runtime.renderTo = function(el, viewName, locals, cb) {
		blade.Runtime.render(viewName, locals, function(err, html, info) {
			if(err) {if(cb) cb.call(el, err); return;}
			try
			{
				//Start preserving the element in focus, if necessary
				var focus = document.activeElement,
					$ = jQuery,
					preserve = jQuery && //jQuery is required
						//if <body> is in focus, ignore preservation
						! $(focus).is("body") &&
						//the element must have an 'id' or a 'name'
						(focus.id || focus.name) &&
						//Make sure that this node is a descendant of `el`
						$(focus).parents().index(el) >= 0;
				if(preserve)
				{
					//Setup the new element query now because the 'id' attribute will be deleted soon
					var newElementIDQuery = focus.id ? "#" + focus.id : null,
						newElementNameQuery = focus.name ? (
								$(focus).parent().closest("[id]").length > 0 ?
								"#" + $(focus).parent().closest("[id]").attr("id") + " " : ""
							) +	"[name=" + focus.name + "]" : null,
						tmpValue = focus.value;
					//Save the selection, if needed
					if($(focus).is("input[type=text],input[type=password],textarea"))
						var selectionStart = focus.selectionStart,
							selectionEnd = focus.selectionEnd;
					//Remove event handlers and attributes; in Chrome, 'blur' and possibly 'change'
					//events are fired when an in-focus element is removed from the DOM
					$(focus).off();
					for(var i = focus.attributes.length - 1; i >= 0; i--)
						focus.removeAttributeNode(focus.attributes.item(i) );
					focus.onchange = focus.onblur = null;
					//Now it's safe to call blur and remove this element from the DOM
					focus.blur();
				}
				//Insert newly rendered content (jQuery is not required here)
				if(el.html)
					el.html(html);
				else
					el.innerHTML = html;
				//Preserve element value, focus, cursor position, etc.
				if(preserve)
				{
					//Find new element in newly rendered content
					var newElement = $(newElementIDQuery);
					if(newElement.length != 1)
						newElement = $(newElementNameQuery);
					//If found, do element preservation stuff...
					if(newElement.length == 1)
					{
						var oldValue = $(newElement).val(); //Save the value that's currently in the model
						newElement = newElement[0];
						newElement.focus(); //Give the new element focus
						if(document.activeElement === newElement)
						{
							//Set value to the temporary value and setup blur event handler to trigger `change`, if needed
							$(newElement).val(tmpValue).blur(function(e) {
								$(this).unbind(e);
								if(this.value !== oldValue)
									$(this).trigger('change');
							});
							//Set focus again and set cursor & text selection
							newElement.focus();
							if($(newElement).is("input[type=text],input[type=password],textarea"))
							{
								newElement.selectionStart = selectionStart;
								newElement.selectionEnd = selectionEnd;
							}
						}
					}
				}
				//Register event handlers
				for(var i in info.eventHandlers)
				{
					var events = info.eventHandlers[i].events.split(" "),
						elem = document.getElementById(i);
					for(var j = 0; j < events.length; j++)
						if(elem === newElement && events[j] == "change")
							(function(elem, handler) {
								elem['on' + events[j]] = function() {
									setTimeout(function() {
										elem['on' + events[j]] = handler; //put everything back
									}, 1);
									//intercept event, if needed
									if(this.value !== oldValue)
										//call original handler
										return handler.apply(this, arguments);
								};
							})(elem, info.eventHandlers[i].handler);
						else
							elem['on' + events[j]] = info.eventHandlers[i].handler;
					//Delete comment before element
					elem.parentNode.removeChild(elem.previousSibling);
				}
				if(cb) cb.call(el, null, html, info);
			}
			catch(e) {if(cb) cb.call(el, e);}
		});
	};

	if(window.jQuery)
		jQuery.fn.render = function(viewName, locals, cb) {
			blade.Runtime.renderTo(this, viewName, locals, cb);
		};

})();
