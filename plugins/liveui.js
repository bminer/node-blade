/** Blade Live UI plugin
	(c) Copyright 2012-2013. Blake Miner. All rights reserved.
	https://github.com/bminer/node-blade
	http://www.blakeminer.com/

	See the full license here:
		https://raw.github.com/bminer/node-blade/master/LICENSE.txt
	
	Hard Dependencies:
		- node-blade runtime
	
	Soft Dependencies (this plugin should still work without these):
		- Spark (https://github.com/meteor/meteor/wiki/Spark)
			- The easiest way to obtain Spark is to clone the Meteor Github repo
			(git://github.com/meteor/meteor.git) and run `admin/spark-standalone.sh`
			- Underscore.js is also a requirement for Spark at this time
	
	Works well with:
		- jQuery
	
	Adds the following to the `blade` global variable:
		- Model
		- Context
	Adds the following to `blade.Runtime`:
		- renderTo(element, viewName, locals [,landmarkOptions] [, cb])
	Adds the following functions to jQuery.fn:
		- render(viewName, locals [,landmarkOptions] [, cb])
	
	Browser Support:
		-Chrome
		-Firefox 4+ (not tested)
		-IE 9+
		-IE 8 (requires definePropertyIE8 plugin; IE is dumb)
		-Safari 5.1+ (not tested)
		-Opera 12+ (not tested)
	If using the definePropertyIE8 plugin, include it into your HTML document
	using a conditional comment like this:
	
	```html
	<!--[if IE 8]>
		<script type="text/javascript" src="/blade/plugins/definePropertyIE8.js"></script>
	<![endif]-->
	```
*/
(function() {
	if(!window.blade) return; //Nothing to expose, so just quit
	
	//This plugin *can* work without Spark...
	var Context = blade.Context = (window.Meteor && Meteor.deps) ? Meteor.deps.Context || {} : {};
	
	//Use Spark as the live update engine
	if(window.Spark)
	{
		//--- Basically an excerpt from https://github.com/meteor/meteor/blob/master/packages/spark/utils.js ---
		//--- Minor modification is to exclude id's starting with "blade_"
		Spark._labelFromIdOrName = function(n) {
			var label = null;
			if (n.nodeType === 1 /*ELEMENT_NODE*/) {
				if (n.id && n.id.substr(0, 6) != "blade_") {
					label = '#' + n.id;
				} else if (n.getAttribute("name")) {
					label = n.getAttribute("name");
					// Radio button special case:	radio buttons
					// in a group all have the same name.	Their value
					// determines their identity.
					// Checkboxes with the same name and different
					// values are also sometimes used in apps, so
					// we treat them similarly.
					if (n.nodeName === 'INPUT' &&
							(n.type === 'radio' || n.type === 'checkbox') &&
							n.value)
						label = label + ':' + n.value;
					// include parent names and IDs up to enclosing ID
					// in the label
					while (n.parentNode &&
								 n.parentNode.nodeType === 1 /*ELEMENT_NODE*/) {
						n = n.parentNode;
						if (n.id) {
							label = '#' + n.id + "/" + label;
							break;
						} else if (n.getAttribute('name')) {
							label = n.getAttribute('name') + "/" + label;
						}
					}
				}
			}
			return label;
		};
		//--- End
		//--- Excerpt from https://github.com/meteor/meteor/blob/master/packages/preserve-inputs/preserve-inputs.js ---
		var inputTags = 'input textarea button select option'.split(' ');
		var selector = _.map(inputTags, function (t) {
			return t.replace(/^.*$/, '$&[id], $&[name]');
		}).join(', ');
		Spark._globalPreserves[selector] = Spark._labelFromIdOrName;
		//--- End
		
		//Copy stuff from Spark to blade.LiveUpdate
		for(var i in Spark)
			blade.LiveUpdate[i] = Spark[i];
	}
	
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
			context.onInvalidate(function () {
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
	
	/* Renders the specified view using the specified locals and injects the generated
		DOM into the specified element. In addition, any event handlers created by
		the view are bound.
		
		Finally, the element in focus is "preserved" and if the element either has an
		'id' attribute or has a 'name' attribute and a parent who has an 'id' attribute.
		
		Views are rendered within the context specific to the `element`, as expected.
		That is, running renderTo against the same element will destroy all registered
		Contexts and their callbacks.
		
		- element - the DOM element into which the generated HTML code will be injected
		- viewName - the view template to be loaded and rendered
		- locals - the locals to be passed to the view. If a `Model` object is
			passed to this method, the Model's `observable` Object will be passed
			to the view.
		- [landmarkOptions] - the options passed to the created Landmark
			(see https://github.com/meteor/meteor/wiki/Spark)
		- [cb] - a callback of the form cb(err) where `err` is the Error object thrown
			when the template was loaded (or null if no error occurred).  This callback is
			called exactly once, when the template is loaded.
		
		It should also be noted that changing the contents of `el` or removing `el` from
		the DOM may confuse Spark and cause errors. To remove `el` from the DOM or to
		delete its child nodes, for example, it is best to call `Spark.finalize(el)` first.
		
	*/
	blade.Runtime.renderTo = function(el, viewName, locals, landmarkOptions, cb) {
		//Reorganize args
		if(typeof landmarkOptions == "function")
			cb = landmarkOptions, landmarkOptions = {};
		//Load blade template
		blade.Runtime.loadTemplate(viewName, function(err, tmpl) {
			//Call optional callback or throw error, if needed
			if(cb)
				cb(err);
			if(err)
			{
				if(!cb) throw err;
				return;
			}
			//Destroy the LiveRanges in this element, if any
			var LiveUpdate = blade.LiveUpdate;
			LiveUpdate.finalize(el);
			var dom = LiveUpdate.render(function() {
				return LiveUpdate.labelBranch(viewName + "@" + el.id, function () {
					return LiveUpdate.createLandmark(landmarkOptions || {}, function (landmark) {
						return LiveUpdate.isolate(function () {
							var ret;
							tmpl(locals ? locals.observable || locals : {}, function(err, html, info) {
								if(err) throw err;
								//Remove event handler attributes
								html = html.replace(/on[a-z]+\=\"return blade\.Runtime\.trigger\(this\,arguments\)\;\"/g, "");
								//Return
								ret = LiveUpdate.attachEvents(info.eventHandlers, html);
							});
							return ret;
						});
					});
				});
			});
			if(window.jQuery)
				//Use jQuery's empty() function to call `jQuery.cleanData` and prevent memory leaks
				jQuery(el).empty();
			else
			{
				while(el.firstChild)
					el.removeChild(el.firstChild);
			}
			if(typeof dom == "string")
				el.innerHTML = dom;
			else
				el.appendChild(dom);
		});
	};

	if(window.jQuery)
		jQuery.fn.render = function(viewName, locals, landmarkOptions, cb) {
			this.each(function() {
				blade.Runtime.renderTo(this, viewName, locals, landmarkOptions, cb);
			});
		};

	//Override `runtime.include` to handle branch labels
	var oldInclude = blade.Runtime.include;
	blade.Runtime.include = function(relFilename, info) {
		//Save old info
		var bufLength = info.length,
			branchLabel = info.filename + ":" + info.line + ":inc:" + relFilename;
		//Run old `runtime.include`
		var ret = oldInclude.apply(this, arguments);
		//If no block definitions were found in the parent and child templates, we can use the reactive HTML
		if(!info.bd)
		{
			//Remove non-reactive HTML
			var html = blade.Runtime.capture(info, bufLength);
			//Add reactive HTML
			info.push(Spark.labelBranch(branchLabel, function() {
				return html;
			}));
		}
		//else... just use whatever is in `info` (non-reactive HTML)
		return ret;
	};
})();
