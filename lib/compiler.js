/** Blade Compiler
	(c) Copyright 2012. Blake Miner. All rights reserved.	
	https://github.com/bminer/node-blade
	http://www.blakeminer.com/
	
	See the full license here:
		https://raw.github.com/bminer/node-blade/master/LICENSE.txt
*/
var path = require('path'),
	parser = require('./parser'),
	runtime = require('./runtime'),
	bladeutil = require('./util'),
	doctypes = require('./doctypes'),
	selfClosingTags = require('./self-closing-tags'),
	filters = require('./filters');

module.exports = Compiler;

function Compiler(string, opts) {
	this.string = string;
	this.options = opts || {};
	//Copy all this crap into compiler options object
	var copy = {
		"doctypes": doctypes,
		"filters": filters
	};
	//Merge doctypes, filters, and selfClosingTags with those passed into `options`
	for(var i in copy)
	{
		this.options[i] = this.options[i] || {};
		for(var j in copy[i])
			if(this.options[i][j] == null)
				this.options[i][j] = copy[i][j];
	}
	//Self-closing tags
	this.options.selfClosingTags = this.options.selfClosingTags || selfClosingTags;
	//Store special options
	if(typeof this.options.filename == "string")
	{
		this.options.filename = path.resolve(this.options.filename);
		this.options.basedir = path.resolve(this.options.basedir || process.cwd() );
		this.options.reldir = path.dirname(path.relative(
			this.options.basedir, this.options.filename) );
		//Hide full paths for templates compiled by the Blade middleware
		if(this.options.middleware)
		{
			this.options.filename = path.relative(this.options.basedir,
				this.options.filename);
			delete this.options.basedir;
		}
		this.includes = 0;
	}
	else
		this.includes = -1;
	if(this.options.cache)
		this.options.minify = true;
	if(this.options.includeSource == null && process.env.NODE_ENV == "development")
		this.options.includeSource = true;
	this.dependencies = [];
	//Name of reserved variable in template
	this.options.templateNamespace = this.options.templateNamespace || "__";
}

/* static */ Compiler.parse = function(string) {
	return parser.parse(string);
}
Compiler.doctypes = doctypes;
Compiler.selfClosingTags = selfClosingTags;
Compiler.filters = filters;

Compiler.prototype.compile = function(cb) {
	var ns = this.options.templateNamespace;
	//Update options in runtime environment for "includes"
	runtime.compileOptions = this.options;
	if(this.options.debug)
		console.log("Compiling:\n" + this.string +
			"\n---------------------------------------------");
	try {
		this.ast = Compiler.parse(this.string);
		if(this.options.debug)
			console.log("AST:\n", require('util').inspect(this.ast, false, 15, true),
				"\n---------------------------------------------");
	} catch(e) {
		if(this.options.filename)
			e.filename = this.options.filename;
		e.message = "Parser error: " + e.message;
		e.source = this.string;
		return cb(runtime.rethrow(e) );
	}
	try {
		//Convert to JS function
		this.buf = "";
		this.blockDeclarations = false;
		this._pushOff(ns + ' = ' + ns + ' || [];' + //Define ns as an array
			ns + '.r = ' + ns + '.r || blade.Runtime;' + //Define ns.r to point to the runtime
			'if(!' + ns + '.func) ' + ns + '.func = {},' + //Define ns.func to hold all functions
				ns + '.blocks = {},' + //Define ns.blocks to hold all blocks
				ns + '.chunk = {};' + //Define ns.chunk to hold all functions chunks
			ns + '.locals = locals || {};'); //Store all locals, too
		var baseRelStart = this.buf.length;
		//Expose the filename no matter what; this is needed for branch labels if a
		//"live page update engine" is used
		this._pushOff(this.options.filename ? ns + ".filename = " +
			JSON.stringify(this.options.filename) + ";" : "");
		//Only include error handling and source code, if needed
		if(this.options.minify !== true && this.options.includeSource)
			this._pushOff(ns + '.source = ' + JSON.stringify(this.string) + ";");
		if(this.options.minify !== true)
			this._pushOff("\ntry {");
		//Now compile the template
		this._pushOff('with(' + ns + '.locals) {');
		for(var i = 0; i < this.ast.doctypes.length; i++)
			this._compileDoctype(this.ast.doctypes[i]);
		for(var i = 0; i < this.ast.nodes.length; i++)
			this._compileNode(this.ast.nodes[i]);
		//Close brace for `with`
		this._pushOff("}");
		//Close main `try` and insert `catch`
		if(this.options.minify !== true)
			this._pushOff("} catch(e){return cb(" + ns + ".r.rethrow(e, " + ns + ") );}");
		//End of template callback
		this._pushOff('if(!' + ns + '.inc) ' + ns + '.r.done(' + ns + ');');
		if(this.blockDeclarations)
			this._pushOff(ns + '.bd = 1;');
		this._pushOff('cb(null, ' + ns + '.join(""), ' + ns + ');');
		//Add base and rel properties to buffer if includes were used
		if(this.includes > 0)
		{
			var tempBuf = this.buf.substr(baseRelStart);
			this.buf = this.buf.substr(0, baseRelStart);
			if(this.options.basedir)
				this._pushOff(ns + ".base=" + JSON.stringify(this.options.basedir) + ";");
			this._pushOff(ns + ".rel=" + JSON.stringify(this.options.reldir) + ";");
			this.buf += tempBuf;
		}
		if(this.options.debug)
			console.log("Template:\n" + this.buf +
				"\n---------------------------------------------");
		//Wrapper only accepts `locals` and `cb`
		var wrapper = function(locals, cb) {
			var info = [];
			info.r = runtime;
			wrapper.template(locals, cb, info);
		}
		try {
			//The actual template exepects `locals`, `runtime`, and `cb`
			if(this.options.debug)
				console.log("Compiling template...");
			wrapper.template = new Function("locals", "cb", ns, this.buf);
			if(this.options.debug)
				console.log("Template compiled successfully!");
			wrapper.filename = this.options.filename;
			wrapper.minify = this.options.minify;
			wrapper.dependencies = this.dependencies;
			wrapper.reldir = this.options.reldir;
			wrapper.unknownDependencies = this.unknownDependencies === true;
			wrapper.toString = function() {
				//Try to use uglify-js
				return bladeutil.uglify(this.template.toString(), this.minify);
			};
		} catch(e) {
			/* Note: The error object generated when calling `new Function(...)` does not
				contain any useful information about where the error occurred. No line
				number. No offset. Nothing.
				
				This is not only a Node.js limitation, it is a Google V8 limitation.
				I don't like this.  If you don't like this, go complain:
				
				Node.js issue: https://github.com/joyent/node/issues/2734
				Google V8 issue: http://code.google.com/p/v8/issues/detail?id=1914
			*/
			e.message = "An error occurred while generating a function from the" + 
				" compiled template. This could be a problem with Blade, or it could be a" + 
				" syntax issue with the JavaScript code in your template: " + e.message;
			throw e;
		}
	} catch(e) {
		if(this.options.filename)
			e.filename = this.options.filename;
		e.message = "Compile error: " + e.message;
		e.source = this.string;
		return cb(runtime.rethrow(e) );
	}
	cb(null, wrapper);
}

Compiler.prototype.addDoctype = function(name, value) {
	this.options.doctypes[name] = value;
};

Compiler.prototype.addFilter = function(name, filter) {
	this.options.filters[name] = filter;
};

Compiler.prototype._push = function(str) {
	if(this.inPush)
		this.buf += "+" + str;
	else
	{
		this.buf += this.options.templateNamespace + ".push(" + str;
		this.inPush = true;
	}
};
Compiler.prototype._pushOff = function(str) {
	if(this.inPush)
	{
		this.buf += ");" + str;
		this.inPush = false;
	}
	else
		this.buf += str;
}

Compiler.prototype._compileDoctype = function(doctype) {
	var ns = this.options.templateNamespace;
	if(this.options.doctypes[doctype])
		this._push(JSON.stringify(this.options.doctypes[doctype]) );
	else
		this._push(JSON.stringify('<!DOCTYPE ' + doctype + '>') );
}

Compiler.prototype._compileNode = function(node) {
	var ns = this.options.templateNamespace;
	if(this.options.minify !== true && node.line != null && (this.lastNode == null ||
		this.lastNode.type != "code" || this.lastNode.children.length == 0 ||
		node.type != "code") && node.type != "foreach_else")
	{
		this._pushOff(ns + ".line=" + node.line + "," + ns + ".col=" + node.col + ";");
		if(node.type != "code")
			this.lastNode = node;
	}
	if(this.prependNewline && node.type != "text" && node.type != "filtered_text")
		this.prependNewline = false;
	switch(node.type)
	{
		case 'tag':
			var attrs = node.attributes;
			//id attribute
			if(node.id)
			{
				/* If the tag doesn't have an "id" attribute, add it now; otherwise,
					only add it if the attribute is 'code'.
					That is, `div(id="foo")` always takes precedence over `div#foo`
				*/
				if(!attrs.id || attrs.id.text == "")
					attrs.id = {'escape': false, 'text': node.id};
				else if(attrs.id.code)
					attrs.id.code = "(" + attrs.id.code + ") || " + JSON.stringify(node.id);
			}
			//class attribute
			if(node.classes.length > 0)
			{
				/* If the tag doesn't have a "class" attribute, add it now; otherwise,
					if the "class" attribute is text, just append to it now; otherwise,
					append the classes at runtime
				*/
				if(!attrs['class'])
					attrs['class'] = {'escape': false, 'text': node.classes.join(" ")};
				else if(attrs['class'].text)
					attrs['class'].text += (attrs['class'].text.length > 0 ? " " : "") +
						node.classes.join(" ");
				else
					attrs['class'].append = node.classes.join(" "); //append classes at runtime
			}
			//event handlers
			var numEventHandlers = 0,
				eventHandlerID;
			for(var i = 0; i < node.children.length; i++)
				if(node.children[i].type == "event_handler")
				{
					//This is the first event handler, so we have some setup work to do...
					if(numEventHandlers++ == 0)
					{
						//Add id attribute, if necessary
						if(!attrs.id)
						{
							eventHandlerID = "'blade_'+" + ns + ".r.ueid";
							attrs.id = {
								"escape": false,
								"code": eventHandlerID + "++"
							};
						}
						else
							eventHandlerID = attrs.id.text ? JSON.stringify(attrs.id.text) :
								attrs.id.code;
					}
					if(node.children[i].event_handler.length == 0) continue;
					//Setup the event handler
					this._pushOff(ns + ".r.bind(" + JSON.stringify(node.children[i].events.toLowerCase() ) +
						"," + eventHandlerID + ",function(e){" +
						node.children[i].event_handler + "\n}," + ns +
						(numEventHandlers > 1 ? ",1" : "") + ");");
					//Add event attributes
					var events = node.children[i].events.split(" ");
					for(var j = 0; j < events.length; j++)
						attrs["on" + events[j].toLowerCase() ] = {
							"escape": false,
							"text": "return blade.Runtime.trigger(this,arguments);"
						};
				}
			//start tag
			this._push((node.prependSpace ? "' <" : "'<") + node.name + "'");
			//attributes
			var varAttrs = "";
			for(var i in attrs)
			{
				//interpolate text attributes
				if(attrs[i].text)
				{
					var stringified = JSON.stringify(attrs[i].text),
						interpolated = bladeutil.interpolate(stringified, ns);
					//check to see if this text attribute needs to be interpolated
					if(interpolated != stringified)
					{
						delete attrs[i].text;
						attrs[i].code = interpolated;
					}
				}
				//take care of text attributes here
				if(attrs[i].text)
				{
					if(attrs[i].escape)
						this._push("' " + i + "=" + bladeutil.quote(
							JSON.stringify(runtime.escape(attrs[i].text)) ) + "'");
					else
						this._push("' " + i + "=" + bladeutil.quote(
							JSON.stringify(attrs[i].text) ) + "'");
				}
				//take care of code attributes here
				else
					varAttrs += "," + JSON.stringify(i) + ":{v:" + attrs[i].code +
						(attrs[i].escape ? ",e:1" : "") +
						(i == "class" && attrs[i].append ?
							",a:" + JSON.stringify(attrs[i].append): "") + "}";
			}
			if(varAttrs.length > 0)
				this._pushOff(ns + ".r.attrs({" + varAttrs.substr(1) + "}, " + ns + ");");
			//child nodes and end tag
			if(this.options.selfClosingTags.indexOf(node.name) >= 0)
			{
				this._push("'/>'");
				if(node.children.length > numEventHandlers)
				{
					var e = new Error("Self-closing tag <" + node.name +
						"/> may not contain any children.");
					e.line = node.line, e.column = node.col;
					throw e;
				}
			}
			else
			{
				this._push("'>'");
				for(var i = 0; i < node.children.length; i++)
					if(node.children[i].type != "event_handler")
						this._compileNode(node.children[i]);
				this._push("'</" + node.name + ">'");
			}
			if(node.appendSpace)
				this._push("' '");
			break;
		case 'event_handler':
			var e = new Error("Event handlers may only be defined for a tag.");
			e.line = node.line, e.column = node.col;
			throw e;
			break;
		case 'text':
			//Ensure we prepend a newline if the last node was a text node.
			if(this.prependNewline)
				node.text = "\n" + node.text;
			//Interpolate #{stuff}
			var interpolated = bladeutil.interpolate(JSON.stringify(node.text), ns);
			//Optionally escape the text
			if(node.escape)
			{
				//If no string interpolation was used in this node, we can just escape it now
				if(interpolated == JSON.stringify(node.text) )
					this._push(JSON.stringify(runtime.escape(node.text) ) );
				//Otherwise, we'll escape it at runtime
				else
					this._push(ns + ".r.escape(" + interpolated + ")");
			}
			else
				this._push(interpolated);
			this.prependNewline = true;
			break;
		case 'code_output':
			/* This is a text block that contains code, which should be outputed into
			the view.  If the code ends in a semicolon, we just remove it for
			convenience. The extra semicolon can break things. :) */
			if(node.code_output.charAt(node.code_output.length - 1) == ";")
				node.code_output = node.code_output.substr(0, node.code_output.length - 1);
			var parens = node.code_output.indexOf(",") >= 0;
			if(node.escape)
				this._push(ns + ".r.escape(" + (parens ? "(" : "") + node.code_output +
					"\n)" + (parens ? ")" : "") );
			else
				this._push((parens ? "(" : "") + node.code_output + "\n" +
					(parens ? ")" : "") );
			break;
		case 'filtered_text':
			if(typeof this.options.filters[node.name] != "function")
			{
				var e = new Error("Invalid filter name: " + node.name);
				e.line = node.line, e.column = node.col;
				throw e;
			}
			var output = this.options.filters[node.name](node.filtered_text, {
				'minify': this.options.minify,
				'compress': this.options.minify,
				'filename': this.options.filename
			});
			//Ensure we prepend a newline if the last node was a text node.
			if(this.prependNewline)
				output = "\n" + output;
			if(this.options.filters[node.name].interpolate === false)
				this._push(JSON.stringify(output) );
			else
				this._push(bladeutil.interpolate(JSON.stringify(output), ns) );
			this.prependNewline = true;
			break;
		case 'comment':
			if(!node.hidden)
			{
				this._push("'<!--'");
				var start = this.buf.length; //Keep track of where the comment begins
				this._push(JSON.stringify(node.comment) );
				if(node.children) //unparsed comments do not have children attribute
					for(var i = 0; i < node.children.length; i++)
						this._compileNode(node.children[i]);
				//Escape all instances of "<!--" and "-->"
				var comment = this.buf.substr(start)
					.replace(/<!--/g, "<!-!-")
					.replace(/-->/g, "-!->");
				this.buf = this.buf.substr(0, start) + comment;
				//Now end the comment
				this._push("'-->'");
			}
			//if node.hidden, we ignore it entirely
			break;
		case 'conditional_comment':
			this._push("'<!--['");
			this._push(JSON.stringify(node.comment) );
			this._push("']>'");
			for(var i = 0; i < node.children.length; i++)
				this._compileNode(node.children[i]);
			this._push("'<![endif]-->'");
			break;
		case 'code':
			/* A line of code, which does not output into the view.
			If the node has children, we use the curly brace to enclose them;
			otherwise, we terminate the code with a semicolon */
			this._pushOff(node.code + "\n" +
				(node.children.length > 0 ? "{" : ";") );
			for(var i = 0; i < node.children.length; i++)
				this._compileNode(node.children[i]);
			if(node.children.length > 0)
				this._pushOff("}");
			break;
		case 'include':
			if(this.includes == -1)
			{
				var e = new Error("Includes will not work unless the `filename` property" +
					" is passed to the compiler.");
				e.line = node.line, e.column = node.col;
				throw e;
			}
			this.includes++;
			var exposedVarList = "";
			if(node.exposing)
				for(var i = 0; i < node.exposing.length; i++)
					exposedVarList += "," + JSON.stringify(node.exposing[i]) + "," + node.exposing[i];
			if(node.code)
			{
				this._pushOff(ns + ".r.include(" + node.code + "," + ns + exposedVarList + ");");
				this.unknownDependencies = true;
			}
			else if(node.filename.length > 0)
			{
				this._pushOff(ns + ".r.include(" + JSON.stringify(node.filename) + "," +
					ns + exposedVarList + ");");
				//Add to list of dependencies
				if(this.dependencies.indexOf(node.filename) < 0)
					this.dependencies.push(node.filename);
			}
			else
			{
				var e = new Error("Invalid include statement: You must specify a filename");
				e.line = node.line, e.column = node.col;
				throw e;
			}
			break;
		case 'block':
			this.blockDeclarations = true;
			var paramStr = node.parameters == null ? "" : "," + node.parameters.join(",");
			this._pushOff(ns + ".r.blockDef(" + JSON.stringify(node.name) + ", " + ns +
				", function(" + ns + paramStr + ") {");
			for(var i = 0; i < node.children.length; i++)
				this._compileNode(node.children[i]);
			this._pushOff("});");
			break;
		case 'render':
			this._pushOff(ns + ".r.blockRender('" + node.behavior.charAt(0) + "', " +
				JSON.stringify(node.name) + ", " + ns +
				(node.arguments.length > 0 ? ", " + node.arguments : "") + ");");
			break;
		case 'append':
		case 'prepend':
			if(node.parameters != null)
			{
				var e = new Error("Parameters are not permitted for `" +
					node.type + " block`.");
				e.line = node.line, e.column = node.col;
				throw e;
			}
		case 'replace':
			var paramStr = node.parameters == null ? "" : "," + node.parameters.join(",");
			this._pushOff(ns + ".r.blockMod('" + node.type.charAt(0) + "', " +
				JSON.stringify(node.name) + ", " + ns + ", " +
				"function(" + ns + paramStr + ") {");
			for(var i = 0; i < node.children.length; i++)
				this._compileNode(node.children[i]);
			this._pushOff("});");
			break;
		case 'function':
			var paramStr = node.parameters == null ? "" : "," + node.parameters.join(",");
			this._pushOff(ns + ".r.func(" + JSON.stringify(node.name) + ",function(" +
				ns + paramStr + ") {");
			/* If the first child node is a tag, ensure that its attributes are modified
				to allow a user to pass in an id or classes when the function is called */
			if(node.children.length > 0 && node.children[0].type == "tag")
			{
				var attrs = node.children[0].attributes;
				modifyAttribute('id');
				modifyAttribute('class');
				function modifyAttribute(attrName) {
					//If the attribute does not exist, simply add it as code; no need to escape
					if(attrs[attrName] == null)
						attrs[attrName] = {'escape': false, 'code': "this." + (attrName == "class" ? "classes" : attrName) };
					//Merge passed-in classes with the class attribute
					else if(attrName == "class")
					{
						if(attrs[attrName].code)
							attrs[attrName].code = "(this.classes || []).concat(" + attrs[attrName].code + ")";
						else
						{
							attrs[attrName].code = "(this.classes || []).concat(" +
								bladeutil.interpolate(JSON.stringify(attrs[attrName].text) ) + ")";
							delete attrs[attrName].text;
						}
					}
					//Replace the attribute with the passed-in attribute value
					else if(attrs[attrName].code)
						attrs[attrName].code = "this." + attrName + '||' + attrs[attrName].code;
					else
					{
						attrs[attrName].code = "this." + attrName + '||' +
							bladeutil.interpolate(JSON.stringify(attrs[attrName].text) );
						delete attrs[attrName].text;
					}
				}
			}
			for(var i = 0; i < node.children.length; i++)
				this._compileNode(node.children[i]);
			//The buffer length before the function call is returned by the function
			this._pushOff("}," + ns + ");");
			break;
		case 'call':
			//The buffer length before the function call is returned by the function
			if(node.output)
				this._pushOff(node.output.to + (node.output.append ? "+=" : "=") + ns +
					".r.capture(" + ns + "," + ns + ".length,");
			if(node.arguments != "")
				node.arguments = "," + node.arguments;
			this._pushOff(ns + ".r.call(" + JSON.stringify(node.name) + ",{" +
				(node.id ? "id:" + JSON.stringify(node.id) + "," : "") +
				(node.classes.length > 0 ? "classes:" +
					JSON.stringify(node.classes) + "," : "") +
				"}," + ns + node.arguments + (node.output ? ") );" : ");") );
			break;
		case 'chunk':
			console.warn("Blade chunks are now deprecated. Please fix " +
				(this.options.filename ? this.options.filename + ":" : "line ") +
				node.line + ":" + node.col);
			var paramStr = node.parameters == null ? "" : node.parameters.join(",");
			this._pushOff(ns + ".r.chunk(" + JSON.stringify(node.name) + ",function(" +
				paramStr + ") {");
			for(var i = 0; i < node.children.length; i++)
				this._compileNode(node.children[i]);
			this._pushOff("}," + ns + ");");
			break;
		case 'isolate':
			this._pushOff(ns + ".r.isolate(function() {");
			for(var i = 0; i < node.children.length; i++)
				this._compileNode(node.children[i]);
			this._pushOff("}," + ns + ");");
			break;
		case 'constant':
			this._pushOff(ns + ".r.constant(" + node.line + ",function() {");
			for(var i = 0; i < node.children.length; i++)
				this._compileNode(node.children[i]);
			this._pushOff("}," + ns + ");");
			break;
		case 'preserve':
			if(!node.preserved)
				node.preserved = "[]";
			this._pushOff(ns + ".r.preserve(" + node.line + ",(" + node.preserved + ")||[],function() {");
			for(var i = 0; i < node.children.length; i++)
				this._compileNode(node.children[i]);
			this._pushOff("}," + ns + ");");
			break;
		case 'foreach':
			this._pushOff(ns + ".r.foreach(" + ns + "," + node.cursor + ",function(" +
				(node.itemAlias ? node.itemAlias : "") + ") {");
			for(var i = 0; i < node.children.length; i++)
				this._compileNode(node.children[i]);
			this._pushOff("});");
			break;
		case 'foreach_else':
			if(!this.lastNode || this.lastNode.type != "foreach")
			{
				var e = new Error("No matching foreach list block. You cannot put a foreach else block here!");
				e.line = node.line, e.column = node.col;
				throw e;
			}
			//Remove trailing ");" and add elseFunc argument to the Runtime.foreach(...) call.
			this.buf = this.buf.substr(0, this.buf.length - 2) + ",function() {";
			for(var i = 0; i < node.children.length; i++)
				this._compileNode(node.children[i]);
			this._pushOff("});");
			break;
		case 'blank_line':
			//Ignore these lines
			break;
		default:
			var e = new Error("Unknown node type: " + node.type);
			e.line = node.line, e.column = node.col;
			throw e;
			break;
	}
	if(this.prependNewline && node.type != "text" && node.type != "filtered_text")
		this.prependNewline = false;
	this.lastNode = node;
}
