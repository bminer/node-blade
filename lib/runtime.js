(function() {
	var runtime = exports || {};
	var cachedViews = {};
	if(runtime.client = typeof window != "undefined")
		window.blade = {'runtime': runtime, 'cachedViews': cachedViews};

	runtime.escape = function(str) {
		return new String(str)
			.replace(/&(?!\w+;)/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}
	
	runtime.attrs = function(attrs, buf) {
		for(var i in attrs)
		{
			if(attrs[i].val == null)
				continue;
			if(i == "class")
			{
				if(attrs[i].val instanceof Array)
					attrs[i].val = attrs[i].val.join(" ");
				if(attrs[i].append)
					attrs[i].val = (attrs[i].val.length > 0 ? " " : "") + attrs[i].append;
			}
			if(attrs[i].escape)
				buf.push(" " + i + "=\"" + runtime.escape(attrs[i].val) + "\"");
			else
				buf.push(" " + i + "=\"" + attrs[i].val + "\"");
		}
	}
	
	/* Load the template from a file, optionally store in cache
		Default behavior in Node.JS is to compile the file using Blade,
		caching it, as needed. The client should cache the view if
		`compileOptions.cache` is set to `true`. */
	runtime.loadTemplate = function(filename, compileOptions, cb) {
		if(runtime.client)
		{
			//TODO: Load client template
			cb(new Error("Client-side template loading is not yet implemented.") );
		}
		else
		{
			var blade = require('./blade');
			blade.compileFile(filename, compileOptions, function(err, wrapper) {
				if(err) return cb(err);
				cb(null, wrapper.template);
			});
		}
	}
	
	runtime.include = function(filename, info, cb) {
		function includeDone(err, html, includeInfo) {
			if(err) return cb(err);
			for(var i in includeInfo.blocks)
			{
				var cblk = includeInfo.blocks[i], pblk = info.blocks[i];
				//Handle block definitions
				if(cblk.pos != null)
				{
					cblk.pos += info.buf.length;
					info.blocks[i] = cblk;
				}
				//If the block was not defined in the include, then merge info
				else
				{
					if(cblk.replace)
					{
						delete pblk.paramBlock;
						delete pblk.renderArgs;
						delete pblk.append;
						delete pblk.prepend;
						pblk.replace = true;
					}
					if(cblk.renderArgs != null)
						pblk.renderArgs = cblk.renderArgs;
					if(cblk.block != null)
						pblk.block = cblk.block;
					if(cblk.append != null)
					{
						if(pblk.append != null)
							pblk.append += cblk.append;
						else
							pblk.append = cblk.append;
					}
					if(cblk.prepend != null)
					{
						if(pblk.prepend != null)
							pblk.prepend = cblk.prepend + pblk.prepend;
						else
							pblk.prepend = cblk.prepend;
					}
				}
			}
			for(var i in includeInfo.buf)
				info.buf.push(includeInfo.buf[i]);
			cb(null);
		}
		if(cachedViews[filename])
			cachedViews[filename](info.locals, runtime, includeDone);
		else
			runtime.loadTemplate(filename, runtime.compileOptions, function(err, tmpl) {
				if(err) return cb(err);
				try {
					tmpl(info.locals, runtime, includeDone);
				}
				catch(e) {
					console.log("Caught");
					throw e;
				}
			});
	}
	
	runtime.blockDef = function(blockName, info, childFunc) {
		var block = info.blocks[blockName] = {
			'pos': info.buf.length
		};
		info.buf.push('');
		//If parameterized block
		if(childFunc.length > 0)
			block.paramBlock = childFunc;
		else
			block.block = childFunc().join("");
		return block;
	}
	
	//Renders a parameterized block
	runtime.blockRender = function(blockName, info) {
		var block = info.blocks[blockName] = info.blocks[blockName] || {};
		//Extract arguments
		var args = [];
		for(var i = 2; i < arguments.length; i++)
			args[i-2] = arguments[i];
		//Render the block later
		block.renderArgs = args;
	}
	
	runtime.blockMod = function(type, blockName, info, childFunc) {
		var block = info.blocks[blockName] = info.blocks[blockName] || {};
		if(type == "replace")
		{
			delete block.paramBlock;
			delete block.renderArgs;
			delete block.append;
			delete block.prepend;
			block.replace = true;
			block.block = childFunc().join("");
		}
		else if(type == "append")
			block.append = (block.append == null ? "" : block.append) +
				childFunc().join("");
		else
			block.prepend = childFunc().join("") +
				(block.prepend == null ? "" : block.prepend);
	}
	
	//Insert blocks into the template
	runtime.done = function(info) {
		var blocks = info.blocks;
		for(var i in blocks)
		{
			var blk = blocks[i];
			if(blk.pos != null)
			{
				//TODO: Maybe throw exception if you try to render a regular block?
				if(blk.paramBlock && blk.renderArgs)
					blk.block = blk.paramBlock.apply(this, blk.renderArgs).join("");
				info.buf[blk.pos] = (blk.prepend ? blk.prepend : "") +
					(blk.block ? blk.block : "") +
					(blk.append ? blk.append : "");
			}
		}
	}
	
	runtime.rethrow = function(err, info) {
		if(info == undefined) info = err;
		info.column = info.col;
		var msg = err.message + "\n    at " +
			(info.filename == null ? "<anonymous>" : info.filename) + 
			(info.line == null ? "" : ":" + info.line) +
			(info.column == null ? "" : ":" + info.column);
		if(info.source != null)
		{
			const LINES_ABOVE_AND_BELOW = 3;
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
		err.filename = info.filename;
		err.line = info.line;
		err.column = info.column;
		return err;
	};
	
	function pad(number, count) {
		var str = number + " ";
		for(var i = 0; i < count - str.length + 1; i++)
			str = " " + str;
		return str;
	};
})();