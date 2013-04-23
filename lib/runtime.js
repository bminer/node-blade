/** Blade Run-time helper functions
	(c) Copyright 2012-2013. Blake Miner. All rights reserved.	
	https://github.com/bminer/node-blade
	http://www.blakeminer.com/
	
	See the full license here:
		https://raw.github.com/bminer/node-blade/master/LICENSE.txt
*/
(function(triggerFunction) {
	var runtime = typeof exports == "object" ? exports : {},
		cachedViews = {},
		eventHandlers = {},
		/* Add blade.LiveUpdate no-op functions */
		htmlNoOp = function(arg1, html) {return html;},
		funcNoOp = function(func) {return func();},
		funcNoOp2 = function(arg1, func) {return func();},
		liveUpdate = {
			"attachEvents": htmlNoOp,
			"setDataContext": htmlNoOp,
			"isolate": funcNoOp,
			"render": funcNoOp,
			"list": function(cursor, itemFunc, elseFunc) {
				var itemList = [];
				//cursor must have an observe method
				//Let's go ahead and observe it...
				cursor.observe({
					"added": function(item) {
						//added must be called once per element before the
						//`observe` call completes
						itemList.push(item);
					}
				}).stop(); //and then stop observing it.
				if(!itemList.length) //If itemList.length is null, zero, etc.
					return elseFunc();
				//Otherwise, call itemFunc for each item in itemList array
				var html = "";
				for(var i = 0; i < itemList.length; i++)
					html += itemFunc(itemList[i]);
				return html;
			},
			"labelBranch": funcNoOp2,
			"createLandmark": funcNoOp2,
			"finalize": htmlNoOp //should do nothing and return nothing meaningful
		};
	/* blade.Runtime.mount is the URL where the Blade middleware is mounted (or where
		compiled templates can be downloaded)
	*/
	runtime.options = {
		'mount': '/views/', 'loadTimeout': 15000
	};
	/* Expose Blade runtime via window.blade, if we are running on the browser
		blade.Runtime is the Blade runtime
		blade.runtime was kept for backward compatibility (but is now deprecated)
		blade._cachedViews is an Object of cached views, indexed by filename
		blade._cb contains a callback function to be called when a view is
			loaded, indexed by filename. The callback function also has a 'cb'
			property that contains an array of callbacks to be called once all
			of the view's dependencies have been loaded.
	*/
	if(runtime.client = typeof window != "undefined")
		window.blade = {'Runtime': runtime, 'LiveUpdate': liveUpdate,
			'_cachedViews': cachedViews, '_cb': {}, 'runtime': runtime};
	
	/* Convert special characters to HTML entities.
		This function performs replacements similar to PHP's ubiquitous
		htmlspecialchars function. The main difference here is that HTML
		entities are not re-escaped; for example, "<Copyright &copy; 2012>"
		will be escaped to: "&lt;Copyright &copy; 2012&gt;" instead of
		"&lt;Copyright &amp;copy; 2012&gt;"
		
		See: http://php.net/manual/en/function.htmlspecialchars.php
	*/
	runtime.escape = function(str) {
		return str == null ? "" : new String(str)
			/* The regular expression below will match &, except when & is
				followed by a named entity and semicolon. This is included
				below to help understand how the next regular expression
				works. */
			//.replace(/&(?![a-zA-Z]+;)/g, '&amp;')
			
			/* The following regular expression will match &, except when & is
				followed by a named entity, a decimal-encoded numeric entity,
				or a hexidecimal-encoded entity. */
			.replace(/&(?!([a-zA-Z]+|(#[0-9]+)|(#[xX][0-9a-fA-F]+));)/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}
	
	/* This is a helper function that generates tag attributes and adds	them
		to the buffer.
		
		attrs is an object of the following format:
		{
			"v": attribute_value,
			"e": escape_flag,
			"a": additional_classes_to_be_appended
		}
	*/
	runtime.attrs = function(attrs, buf) {
		for(var i in attrs)
		{
			var attr = attrs[i];
			//If the attribute value is null...
			if(attr.v == null || attr.v === false)
			{
				if(attr.a == null)
					continue; //Typically, we ignore attributes with null values
				else
				{
					//If we need to append stuff, just swap value and append
					attr.v = attr.a;
					delete attr.a;
				}
			}
			if(attr.v === true)
				attr.v = i;
			//Class attributes may be passed an Array or have classes that need to be appended
			if(i == "class")
			{
				if(attr.v instanceof Array)
					attr.v = attr.v.join(" ");
				if(attr.a)
					attr.v = (attr.v.length > 0 ? attr.v + " " : "") + attr.a;
			}
			//Add the attribute to the buffer
			if(attr.e)
				buf.push(" " + i + "=\"" + runtime.escape(attr.v) + "\"");
			else
				buf.push(" " + i + "=\"" + attr.v + "\"");
		}
	}
	
	runtime.ueid = runtime.client ? 1000 : 0; //unique element ID
	/* Injects the event handler into the view as a comment and also stores
		it in eventHandlers.  When done() is called, the eventHandlers will
		be moved to buf.eventHandlers, so they can be accessed from the
		render callback function.
		
		- events - a space-delimited string of event types (i.e. "click change")
		- elementID - the "id" attribute of the element to which an event handler is to
			be bound
		- eventHandler - the event handler
		- buf - the Blade template buffer
		- commentExists - false if and only if this is the first call to runtime.bind
			for this element
	*/
	runtime.bind = function(events, elementID, eventHandler, buf, commentExists) {
		/* Place event map into `eventHandlers` global.
			Examples of event maps:
				// Fires when any element is clicked
				"click": function (event) { ... }
				//Fires when an element with class "accept" is clicked, or when a key is pressed
				"keydown, click .accept": function (event) { ... }
				//Fires when an element with class "accept" is either clicked or changed
				"click .accept, change .accept": function (event) { ... }
			
			See http://docs.meteor.com/#eventmaps for more information
		*/
		var eventMapKey = "";
		var eventTypes = events.split(" ");
		for(var i = 0; i < eventTypes.length; i++)
			eventMapKey = "," + eventTypes[i] + " #" + elementID;
		eventHandlers[eventMapKey.substr(1)] = eventHandler;
		var comment = "i[" + JSON.stringify(events) + "]=" + eventHandler.toString();
		//If other event handlers were already declared for this element,
		//merge this one with the existing comment
		if(commentExists)
		{
			var i = buf.length - 1;
			buf[i] = buf[i].substr(0, buf[i].length-3) + ";" + comment + "-->";
		}
		else
			buf.push("<!--" + comment + "-->");
	};
	//runtime.trigger is defined below because it contains an eval()
	runtime.trigger = triggerFunction;
	
	/* Load a compiled template, synchronously, if possible.
	
		loadTemplate(baseDir, filename, [compileOptions,] cb)
		or
		loadTemplate(filename, [compileOptions,] cb)
		
		Returns true if the file was loaded synchronously; false, if it could not be
		loaded synchronously.
		
		The .blade file extension is appended to the filename automatically if no
		file extension is provided.
	
		Default behavior in Node.JS is to synchronously compile the file using Blade.
		Default behavior in the browser is to load from the browser's cache, if
		possible; otherwise, the template is loaded asynchronously via a script tag.
	*/
	runtime.loadTemplate = function(baseDir, filename, compileOptions, cb) {
		//Reorganize arguments
		if(typeof compileOptions == "function")
		{
			cb = compileOptions;
			if(typeof filename == "object")
				compileOptions = filename, filename = baseDir, baseDir = "";
			else
				compileOptions = null;
		}
		if(typeof filename == "function")
			cb = filename, filename = baseDir, compileOptions = null, baseDir = "";
		//Arguments are now in the right place
		//Append .blade for filenames without an extension
		if(filename.split("/").pop().indexOf(".") < 0)
			filename += ".blade";
		//Now, load the template
		if(runtime.client)
		{
			filename = runtime.resolve(filename);
			if(cachedViews[filename])
			{
				cb(null, cachedViews[filename]);
				return true;
			}
			var blade = window.blade;
			//If the file is already loading...
			if(blade._cb[filename])
				blade._cb[filename].cb.push(cb); //push to the array of callbacks
			else
			{
				//Otherwise, start loading it by creating a script tag
				var st = document.createElement('script');
				st.type = 'text/javascript'; //use text/javascript because of IE
				st.async = true;
				st.src = runtime.options.mount + filename;
				//Add compile options to the query string of the URL, if given
				//(this functionality is disabled for now since the middleware ignores it anyway)
				/*if(compileOptions)
				{
					var opts = "";
					for(var key in compileOptions)
						opts += "&" + key + "=" + encodeURIComponent(compileOptions[key]);
					st.src += "?" + opts.substr(1);
				}*/
				/* Helper function for runtime.loadTemplate that calls all of the callbacks
					in the specified array
					- cbArray contains all of the callbacks that need to be called
					- err is the error to be passed to the callbacks
				*/
				function callCallbacks(cbArray, err) {
					//call all callbacks
					for(var i = 0; i < cbArray.length; i++)
					{
						if(err)
							cbArray[i](err);
						else
							cbArray[i](null, cachedViews[filename]);
					}
				}
				//Function to be called if the template could not be loaded
				function errorFunction(reason) {
					var callbacks = blade._cb[filename].cb; //array of callbacks
					delete blade._cb[filename];
					st.parentNode.removeChild(st);
					callCallbacks(callbacks, new Error("Blade Template [" + filename +
						"] could not be loaded: " + (reason ? reason : "Request timed out") ) );
				}
				//Set a timer to return an Error after a timeout expires.
				var timer = setTimeout(errorFunction, runtime.options.loadTimeout);
				//Setup a callback to be called if the template is loaded successfully
				var tmp = blade._cb[filename] = function(compileError, dependenciesReldir,
						dependencies, unknownDependencies) {
					//Clear timeouts and cleanup
					clearTimeout(timer);
					delete blade._cb[filename];
					st.parentNode.removeChild(st);
					//Check for compilation error
					if(compileError)
						return callCallbacks(tmp.cb, compileError);
					//Load all dependencies, too
					if(dependencies.length > 0)
					{
						var done = 0;
						for(var i = 0; i < dependencies.length; i++)
							runtime.loadTemplate(baseDir, dependenciesReldir + "/" + dependencies[i], compileOptions, function(err, tmpl) {
								if(err) return callCallbacks(tmp.cb, err);
								if(++done == dependencies.length)
									callCallbacks(tmp.cb);
							});
					}
					else
						callCallbacks(tmp.cb);
				};
				tmp.cb = [cb];
				//Insert script tag into the DOM
				var s = document.getElementsByTagName('script')[0];
				s.parentNode.insertBefore(st, s);
				//Also setup onload, onreadystatechange, and onerror callbacks to detect errors earlier than the timeout
				st.onload = st.onreadystatechange = st.onerror = function() {
					var x = this.readyState;
					if((!x || x == "loaded" || x == "complete") && blade._cb[filename])
					{
						clearTimeout(timer);
						errorFunction("Request failed");
					}
				};
			}
			return false;
		}
		else
		{
			compileOptions.synchronous = true;
			require('./blade').compileFile(baseDir + "/" + filename,
				compileOptions, function(err, wrapper) {
					if(err) return cb(err);
					cb(null, wrapper.template);
				}
			);
			return true;
		}
	}
	
	/* This function is a hack to get the resolved URL, so that caching works
		okay with relative URLs.
		This function does not work properly if `filename` contains too many "../"
		For example, passing "alpha/beta/../../filename.blade" is acceptable; whereas, 
		"alpha/beta/../../../filename.blade" is unacceptable input.
	*/
	runtime.resolve = function(filename) {
		if(runtime.client) {
			//Use the browser's ability to resolve relative URLs
			var x = document.createElement('div');
			x.innerHTML = '<a href="' + runtime.escape("./" + filename) + '"></a>';
			x = x.firstChild.href;
			/* suppose `window.location.href` is "http://www.example.com/foo/bar/document.html"
				and `filename` is "alpha/./beta/../charlie.blade", then
				`x` will be something like "http://www.example.com/foo/bar//alpha/charlie.blade" */
			var prefix = window.location.href.split("#")[0];
			x = x.substr(prefix.substr(0, prefix.lastIndexOf("/") ).length).replace(/\/[\/]+/g, '/');
			if(x.charAt(0) == '/') x = x.substr(1);
			return x;
		}
	};
	
	var includeFields = ["inc", "base", "rel", "filename", "line", "col", "source", "locals"];
	runtime._beforeInclude = function(relFilename, info) {
		//Save template-specific information
		var old = {};
		includeFields.forEach(function(field) {
			old[field] = info[field];
		});
		info.inc = true;
		//If exposing locals, the included view gets its own set of locals
		if(arguments.length > 2)
		{
			info.locals = {};
			for(var i = 2; i < arguments.length; i += 2)
				info.locals[arguments[i]] = arguments[i+1];
		}
		return old;
	};
	runtime.include = function(relFilename, info) {
		var old = runtime._beforeInclude.apply(this, arguments);
		//Now load the template and render it
		var sync = runtime.loadTemplate(info.base, info.rel + "/" + relFilename,
			runtime.compileOptions, function(err, tmpl) {
				if(err) throw err;
				tmpl(info.locals, function(err, html) {
					//This is run after the template has been rendered
					if(err) throw err;
					//Now, restore template-specific information
					runtime._afterInclude(old, info);
				}, info);
		});
		if(!sync) throw new Error("Included file [" + info.rel + "/" + relFilename +
			"] could not be loaded synchronously!");
	};
	runtime._afterInclude = function(old, info) {
		includeFields.forEach(function(field) {
			info[field] = old[field];
		});
	};
	
	/* Defines a function, storing it in __.func */
	runtime.func = function(funcName, func, info) {
		var x = info.func[funcName] = func;
		x.filename = info.filename;
		x.source = info.source;
	};
	
	/* Calls a function, setting the buffer's filename property, as appropriate
		for proper error reporting */
	runtime.call = function(funcName, idClass, info) {
		//Get remaining arguments to be passed to the function
		var func = info.func[funcName],
			args = [info];
		if(func == null)
			throw new Error("Function '" + funcName + "' is undefined.");
		for(var i = 3; i < arguments.length; i++)
			args[i-2] = arguments[i];
		var oldFilename = info.filename,
			oldSource = info.source;
		info.filename = func.filename;
		info.source = func.source;
		func.apply(idClass, args); //Call the function
		info.filename = oldFilename;
		info.source = oldSource;
	};
	
	/* Capture the output of a function
		and delete all blocks defined within the function.
		The third (undocumented) parameter to runtime.capture is the return
		value from the function or chunk.
	*/
	runtime.capture = function(buf, start) {
		//Delete all blocks defined within the function
		for(var i in buf.blocks)
		{
			var x = buf.blocks[i];
			if(x.pos >= start && (!buf.block || x.parent == buf.block) )
			{
				//Insert the buffer contents where it belongs
				if(x.parent == null)
					buf[x.pos] = x.buf.join("");
				else
				{
					x.parent.buf[x.pos] = x.buf.join("");
					x.parent.numChildren--;
				}
				//Delete the block
				delete buf.blocks[i];
			}
		}
		/* Now remove the content generated by the function from the buffer
			and return it as a string */
		return buf.splice(start, buf.length - start).join("");
	};
	
	/* Define a chunk, a function that returns HTML. */
	runtime.chunk = function(name, func, info) {
		info.chunk[name] = function() {
			//This function needs to accept params and return HTML
			/* Note: This following line is the same as:
				var len = info.length;
				func.apply(this, arguments);
				return runtime.capture(info, len);
			*/
			return runtime.capture(info, info.length, func.apply(this, arguments) );
		};
	};
	
	/* isolateWrapper is a helper function
		- func - a function to be called anytime its data dependencies change
		- buf - the template buffer
		Returns HTML generated by liveUpdate.isolate(...)
	*/
	function isolateWrapper(func, buf, disableReactivity) {
		function wrapper() {
			//Temporarily make blocks inaccessible to func()
			var blocks = buf.blocks;
			buf.blocks = {};
			//Temporarily clear eventHandlers if we are reactive
			var eh = eventHandlers;
			if(!disableReactivity)
				eventHandlers = {};
			/* Note: This following line is the same as:
				var len = buf.length;
				func();
				return runtime.capture(buf, len);
			*/
			var html = runtime.capture(buf, buf.length, func() );
			//Restore blocks
			buf.blocks = blocks;
			if(!disableReactivity)
			{
				//Remove event handler attributes
				html = html.replace(/on[a-z]+\=\"return blade\.Runtime\.trigger\(this\,arguments\)\;\"/g, "");
				//Restore and bind event handlers
				html = liveUpdate.attachEvents(eventHandlers, html);
				eventHandlers = eh;
			}
			return html;
		}
		return disableReactivity ? wrapper() : liveUpdate.isolate(wrapper);
	}
	/* Define an isolate block */
	runtime.isolate = function(func, buf) {
		buf.push(isolateWrapper(func, buf) );
	};
	
	/* Define a constant block */
	runtime.constant = function(label, func, buf) {
		buf.push(liveUpdate.labelBranch(buf.filename + ":" + label, function () {
			return liveUpdate.createLandmark({"constant": true}, function(landmark) {
				/* Note: This following line is the same as:
					var len = buf.length;
					func();
					return runtime.capture(buf, len);
				*/
				return runtime.capture(buf, buf.length, func() );
			});
		}) );
	};
	
	/* Define a preserve block */
	runtime.preserve = function(label, preserved, func, buf) {
		buf.push(liveUpdate.labelBranch(buf.filename + ":" + label, function () {
			return liveUpdate.createLandmark({"preserve": preserved}, function(landmark) {
				/* Note: This following line is the same as:
					var len = buf.length;
					func();
					return runtime.capture(buf, len);
				*/
				return runtime.capture(buf, buf.length, func() );
			});
		}) );
	};
	
	/* Foreach/else block */
	runtime.foreach = function(buf, cursor, itemFunc, elseFunc) {
		var disableReactivity = false;
		//Define wrapper functions for itemFunc and elseFunc
		function itemFuncWrapper(item) {
			var label = item._id || (typeof item === "string" ? item : null) ||
				liveUpdate.UNIQUE_LABEL;
			return liveUpdate.labelBranch(label, function() {
				return liveUpdate.setDataContext(item,
					isolateWrapper(function() {
						return itemFunc.call(item, item);
					}, buf, disableReactivity)
				);
			});
		}
		function elseFuncWrapper() {
			return liveUpdate.labelBranch("else", function() {
				return elseFunc ? isolateWrapper(elseFunc, buf, disableReactivity) : "";
			});
		}
		//Call liveUpdate.list for Cursor Objects
		if(cursor && "observe" in cursor)
			buf.push(liveUpdate.list(cursor, itemFuncWrapper, elseFuncWrapper) );
		else
		{
			disableReactivity = true;
			//Allow non-Cursor Objects or Arrays to work, as well
			var html = "", empty = 1;
			for(var i in cursor)
			{
				empty = 0;
				html += itemFuncWrapper(cursor[i]);
			}
			buf.push(empty ? elseFuncWrapper() : html);
		}
	};
	
	/* Copies error reporting information from a block's buffer to the main
		buffer */
	function blockError(buf, blockBuf, copyFilename) {
		if(copyFilename)
		{
			buf.filename = blockBuf.filename;
			buf.source = blockBuf.source;
		}
		buf.line = blockBuf.line;
		buf.col = blockBuf.col;
	}
	
	/* Defines a block */
	runtime.blockDef = function(blockName, buf, childFunc) {
		var block = buf.blocks[blockName] = {
			'parent': buf.block || null, //set parent block
			'buf': [], //block get its own buffer
			'pos': buf.length, //block knows where it goes in the main buffer
			'numChildren': 0 //number of child blocks
		};
		//Copy some properties from buf into block.buf
		var copy = ['r', 'blocks', 'func', 'locals', 'cb', 'base', 'rel', 'filename', 'source'];
		for(var i in copy)
			block.buf[copy[i]] = buf[copy[i]];
		/* Set the block property of the buffer so that child blocks know
		this is their parent */
		block.buf.block = block;
		//Update numChildren in parent block
		if(block.parent)
			block.parent.numChildren++;
		//Leave a spot in the buffer for this block
		buf.push('');
		//If parameterized block
		if(childFunc.length > 1)
			block.paramBlock = childFunc;
		else
		{
			try {childFunc(block.buf); }
			catch(e) {blockError(buf, block.buf); throw e;}
		}
	};
	
	/* Render a parameterized block
		type can be one of:
			"a" ==> append (the default)
			"p" ==> prepend
			"r" ==> replace
	*/
	runtime.blockRender = function(type, blockName, buf) {
		var block = buf.blocks[blockName];
		if(block == null)
			throw new Error("Block '" + blockName + "' is undefined.");
		if(block.paramBlock == null)
			throw new Error("Block '" + blockName +
				"' is a regular, non-parameterized block, which cannot be rendered.");
		//Extract arguments
		var args = [block.buf];
		for(var i = 3; i < arguments.length; i++)
			args[i-2] = arguments[i];
		if(type == "r") //replace
			block.buf.length = 0; //an acceptable way to empty the array
		var start = block.buf.length;
		//Render the block
		try{block.paramBlock.apply(this, args);}
		catch(e) {blockError(buf, block.buf, 1); throw e;}
		if(type == "p")
			prepend(block, buf, start);
	}
	
	/* Take recently appended content and prepend it to the block, fixing any
		defined block positions, as well. */
	function prepend(block, buf, start) {
		var prepended = block.buf.splice(start, block.buf.length - start);
		Array.prototype.unshift.apply(block.buf, prepended);
		//Fix all the defined blocks, too
		for(var i in buf.blocks)
			if(buf.blocks[i].parent == block && buf.blocks[i].pos >= start)
				buf.blocks[i].pos -= start;
	}
	
	/* Append to, prepend to, or replace a defined block.
		type can be one of:
			"a" ==> append
			"p" ==> prepend
			"r" ==> replace
	*/
	runtime.blockMod = function(type, blockName, buf, childFunc) {
		var block = buf.blocks[blockName];
		if(block == null)
			throw new Error("Block '" + blockName + "' is undefined.");
		if(type == "r") //replace
		{
			//Empty buffer and delete parameterized block function
			delete block.paramBlock;
			block.buf.length = 0; //empty the array (this is an accepted approach, btw)
		}
		var start = block.buf.length;
		//If parameterized block (only works for type == "r")
		if(childFunc.length > 1)
			block.paramBlock = childFunc;
		else
		{
			try {
				//Copy buf.rel and buf.base to block.buf
				block.buf.rel = buf.rel;
				block.buf.base = buf.base;
				childFunc(block.buf);
			}
			catch(e) {blockError(buf, block.buf); throw e;}
		}
		if(type == "p") //prepend
			prepend(block, buf, start);
	};
	
	/* Inject all blocks into the appropriate spots in the main buffer.
		This function is to be run when the template is done rendering.
		Although runtime.done looks like a O(n^2) operation, I think it is
		O(n * max_block_depth) where n is the number of blocks. */
	runtime.done = function(buf) {
		//Iterate through each block until done
		var done = false;
		while(!done)
		{
			done = true; //We are done unless we find work to do
			for(var i in buf.blocks)
			{
				var x = buf.blocks[i];
				if(!x.done && x.numChildren == 0)
				{
					//We found work to do
					done = false;
					//Insert the buffer contents where it belongs
					if(x.parent == null)
						buf[x.pos] = x.buf.join("");
					else
					{
						x.parent.buf[x.pos] = x.buf.join("");
						x.parent.numChildren--;
					}
					x.done = true;
				}
			}
		}
		//Move event handlers to the buffer Object
		buf.eventHandlers = eventHandlers;
		eventHandlers = {};
		if(!runtime.client) runtime.ueid = 0;
	};
	
	/* Adds error information to the error Object and returns it */
	runtime.rethrow = function(err, info) {
		if(info == null)
			info = err;
		//prevent the same error from appearing twice
		if(err.lastFilename == info.filename && err.lastFilename != null)
			return err;
		info.column = info.column || info.col;
		//Generate error message
		var msg = err.message + "\n    at " +
			(info.filename == null ? "<anonymous>" : info.filename) + 
			(info.line == null ? "" : ":" + info.line +
				(info.column == null ? "" : ":" + info.column) );
		if(info.source != null)
		{
			var LINES_ABOVE_AND_BELOW = 3;
			var lines = info.source.split("\n"),
				start = Math.max(info.line - LINES_ABOVE_AND_BELOW, 0),
				end = Math.min(info.line + LINES_ABOVE_AND_BELOW, lines.length),
				digits = new String(end).length;
			lines = lines.slice(start, end);
			msg += "\n\n";
			for(var i = 0; i < lines.length; i++)
				msg += pad(i + start + 1, digits) +
					(i + start + 1 == info.line ? ">\t" : "|\t") +
					lines[i] + "\n";
		}
		err.message = msg;
		err.lastFilename = info.filename;
		//Only set these properties once
		if(err.filename == null && err.line == null)
		{
			err.filename = info.filename;
			err.line = info.line;
			err.column = info.column;
		}
		return err;
	};
	
	//A rather lame implementation, but it works
	function pad(number, count) {
		var str = number + " ";
		for(var i = 0; i < count - str.length + 1; i++)
			str = " " + str;
		return str;
	}
})(
/* runtime.trigger function - I pass it into the function here because
	eval() screws up Uglify JS's name mangling, making the runtime much
	larger. By doing it this way, none of the other variables are in scope.

	Retrieves the proper event handler, which is encoded in a comment right
	before the element, runs it through eval(), and installs it as the event
	handler. Finally, the event is handled.
	This function is more minified because UglifyJS won't completely minify
	a function that contains an eval().
	-e refers to the DOM element that triggered the event
	-t refers to the arguments passed to the event handler
	-t[0] refers to the first argument (the browser's event Object)
*/
function(e, t) {
	//I apologize in advance for the lack of readability here... :/
	var r = e.previousSibling, //refers to the comment element
		i = {}, //refers to the event Object map
		h, //array holding each event type in the Object map
		n; //index into h.  h[n] refers to a event type
	eval(r.textContent); //populates i with event Object map
	e.parentNode.removeChild(r);
	/* now i is an Object like: {
			"click": function() {...},
			"change keyup": function() {...},
			...
		}
		where keys are space-delimited event types and values are event handler functions
	*/
	//now r refers to the properties populated in the event Object map
	for(r in i)
	{
		//i[r] refers to the event handler
		h = r.split(" "); //h is now ["change", "keyup", ...]
		//h[n] now refers to the event type
		for(n = 0; n < h.length; n++)
			e["on" + h[n]] = i[r];
	}
	return e["on" + t[0].type].apply(e, t);
});
