/** Blade Run-time helper functions
	(c) Copyright 2012. Blake Miner. All rights reserved.	
	https://github.com/bminer/node-blade
	http://www.blakeminer.com/
	
	See the full license here:
		https://raw.github.com/bminer/node-blade/master/LICENSE.txt
*/
(function(triggerFunction) {
	var runtime = typeof exports == "object" ? exports : {},
		cachedViews = {},
		eventHandlers = {};
	/* Expose Blade runtime via window.blade, if we are running on the browser
		blade.runtime is the Blade runtime
		blade.cachedViews is an Object of cached views, indexed by filename
		blade.cb contains a callback function to be called when a view is
			loaded, indexed by filename. The callback function also has a 'cb'
			property that contains an array of callbacks to be called once all
			of the view's dependencies have been loaded.
		blade.mount is the URL where the Blade middleware is mounted (or where
			compiled templates can be downloaded)
	*/
	if(runtime.client = typeof window != "undefined")
		window.blade = {'runtime': runtime, 'cachedViews': cachedViews,
			'cb': {}, 'mount': '/views/', 'timeout': 15000};
	
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
			.replace(/&(?!\w+;)/g, '&amp;')
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
	*/
	runtime.bind = function(events, elementID, eventHandler, buf, commentExists) {
		eventHandlers[elementID] = {"events": events, "handler": eventHandler};
		var comment = "i[" + JSON.stringify(events) + "]=" + eventHandler.toString();
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
			if(blade.cb[filename])
				blade.cb[filename].cb.push(cb); //push to the array of callbacks
			else
			{
				//Otherwise, start loading it by creating a script tag
				var st = document.createElement('script');
				st.type = 'text/javascript'; //use text/javascript because of IE
				st.async = true;
				st.src = blade.mount + filename;
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
				//Set a timer to return an Error after a timeout expires.
				var timer = setTimeout(function() {
					var cb = blade.cb[filename].cb; //array of callbacks
					delete blade.cb[filename];
					st.parentNode.removeChild(st);
					callCallbacks(cb, new Error("Timeout Error: Blade Template [" + filename +
						"] could not be loaded.") );
				}, blade.timeout);
				var tmp = blade.cb[filename] = function(dependencies, unknownDependencies) {
					clearTimeout(timer);
					delete blade.cb[filename];
					st.parentNode.removeChild(st);
					//Load all dependencies, too
					if(dependencies.length > 0)
					{
						var done = 0;
						for(var i = 0; i < dependencies.length; i++)
							runtime.loadTemplate(baseDir, dependencies[i], compileOptions, function(err, tmpl) {
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
		okay with relative URLs */
	runtime.resolve = function(filename) {
		if(runtime.client) {
			var x = document.createElement('div');
			x.innerHTML = '<a href="' + runtime.escape("./" + filename) + '"></a>';
			x = x.firstChild.href;
			x = x.substr(window.location.href.length).replace(/\/\//g, '/');
			if(x.charAt(0) == '/') x = x.substr(1);
			return x;
		}
	};
	
	runtime.include = function(relFilename, info) {
		//Save template-specific information
		var pInc = info.inc,
			pBase = info.base,
			pRel = info.rel,
			pFilename = info.filename,
			pLine = info.line,
			pCol = info.col,
			pSource = info.source,
			pLocals = info.locals;
		info.inc = true;
		//If exposing locals, the included view gets its own set of locals
		if(arguments.length > 2)
		{
			info.locals = {};
			for(var i = 2; i < arguments.length; i += 2)
				info.locals[arguments[i]] = arguments[i+1];
		}
		//Now load the template and render it
		var sync = runtime.loadTemplate(info.base, info.rel + "/" + relFilename,
			runtime.compileOptions, function(err, tmpl) {
				if(err) throw err;
				tmpl(info.locals, function(err, html) {
					//This is run after the template has been rendered
					if(err) throw err;
					//Now, restore template-specific information
					info.inc = pInc;
					info.base = pBase;
					info.rel = pRel;
					info.filename = pFilename;
					info.line = pLine;
					info.col = pCol;
					info.source = pSource;
					info.locals = pLocals;
				}, info);
		});
		if(!sync) throw new Error("Included file [" + info.rel + "/" + relFilename +
			"] could not be loaded synchronously!");
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
			if(buf.blocks[i].pos >= start)
				delete buf.blocks[i];
		/* Now remove the content generated by the function from the buffer
			and return it as a string */
		return buf.splice(start, buf.length - start).join("");
	};
	
	/* Define a chunk, a function that returns HTML. */
	runtime.chunk = function(name, func, info) {
		info.chunk[name] = function() {
			//This function needs to accept params and return HTML
			return runtime.capture(info, info.length, func.apply(this, arguments) );
		};
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
			try {childFunc(block.buf);}
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
