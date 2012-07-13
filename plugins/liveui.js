/** Blade Live UI plugin
    (c) Copyright 2012. Blake Miner. All rights reserved.
    https://github.com/bminer/node-blade
    http://www.blakeminer.com/

    See the full license here:
        https://raw.github.com/bminer/node-blade/master/LICENSE.txt
	
	Adds the following to the `blade` global variable:
		- Model
		- Context
	Adds the following to `blade.runtime`:
		- render(viewName, locals, cb)
		- renderTo(element, viewName, locals [, cb])
	Adds the following functions to jQuery.fn:
		- render(viewName, locals [, cb])
	
	Browser Support:
		-Chrome
		-Firefox 4+ (not tested)
		-IE 9+ - NOT WORKING!!!  Causes browser to freeze (probably a resursive loop).
		-IE 8 - (not tested - requires definePropertyIE8 plugin; IE is dumb)
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
		if(!self._keyDeps[key])
			self.add(key);
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
	blade.runtime.render = function(viewName, locals, cb) {
		//Load and render the template
		blade.runtime.loadTemplate(viewName, function(err, tmpl) {
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
	blade.runtime.renderTo = function(el, viewName, locals, cb) {
		blade.runtime.render(viewName, locals, function(err, html, info) {
			if(err) {if(cb) cb.call(el, err); return;}
			try
			{
				//Start preserving the element in focus, if necessary
				var focus = document.activeElement,
					$ = jQuery,
					preserve = jQuery && //jQuery is required
						//if <body> is in focus, ignore preservation
						! $(focus).is("body") &&
						//the element must have an 'id' or a 'name' and a parent with an 'id'
						(focus.id || (focus.parentNode.id && focus.name) ) &&
						//Make sure that this node is a descendant of `el`
						$(focus).parents().index(el) >= 0;
				if(preserve)
				{
					//Save the ID and value of this element
					var id = focus.id, oldValue, tmpValue,
						newElementQuery = id ? "#" + id :
							"#" + focus.parentNode.id + " > [name=" + focus.name + "]";
					//Save the selection, if needed
					if($(focus).is("input[type=text],input[type=password],textarea"))
					{
						var selectionStart = focus.selectionStart,
							selectionEnd = focus.selectionEnd;
					}
					//Remove event handlers and attributes; in Chrome, 'blur' and possibly 'change'
					//events are fired when an in-focus element is removed from the DOM
					while(focus.attributes.length > 0)
						focus.removeAttributeNode(focus.attributes.item(0) );
					//Add a "change" event handler. When in-focus elements are removed from,
					//the DOM, 'blur' or 'change' might be triggered.
					focus.onchange = function(e) {
						tmpValue = focus.value;
						return false; //prevent the change from occurring
					};
					//Remove all children and any leftover event handlers
					//(although blur might still fire if the event handler could not be removed)
					focus = focus.cloneNode();
				}
				//Insert newly rendered content (jQuery is not required here)
				if(el.html)
					el.html(html);
				else
					el.innerHTML = html;
				//Preserve element focus, cursor position, etc.
				if(preserve)
				{
					//Find new element in newly rendered content
					var newElement = $(newElementQuery);
					//If found, do element preservation stuff...
					if(newElement.length == 1)
					{
						//Replace newElement
						newElement.replaceWith(focus);
						newElement = newElement[0];
						oldValue = newElement.value;
						//Add new child nodes and attributes
						while(newElement.childNodes.length > 0)
						{
							var child = newElement.childNodes.item(i);
							newElement.removeChild(child);
							focus.appendChild(child);
						}
						while(newElement.attributes.length > 0)
						{
							var attr = newElement.attributes.item(i);
							newElement.removeAttributeNode(attr);
							focus.setAttributeNode(attr);
						}
						//Set value if a change event was previously triggered
						if(tmpValue)
						{
							focus.value = tmpValue;
							//Setup a one-time blur event handler to ensure
							//that a 'change' event is triggered
							$(focus).blur(function(e) {
								if(this.value !== oldValue)
									$(this).trigger('change');
								$(this).unbind(e);
							});
						}
						//Set focus and cursor
						focus.focus();
						if($(focus).is("input[type=text],input[type=password],textarea"))
						{
							focus.selectionStart = selectionStart;
							focus.selectionEnd = selectionEnd;
						}
					}
				}
				//Register event handlers
				for(var i in info.eventHandlers)
				{
					var events = info.eventHandlers[i].events.split(" "),
						elem = document.getElementById(i);
					for(var j = 0; j < events.length; j++)
						elem['on' + events[j]] = info.eventHandlers[i].handler;
					//Delete comment before element
					elem.parentNode.removeChild(elem.previousSibling);
				}
				if(cb) cb.call(el, null, html, info);
			}
			catch(e) {if(cb) cb.call(el, e);}
		});
	};

	if(jQuery)
		jQuery.fn.render = function(viewName, locals, cb) {
			blade.runtime.renderTo(this, viewName, locals, cb);
		};

})();