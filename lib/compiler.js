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
	inlineTags = require('./inline-tags'),
	selfClosingTags = require('./self-closing-tags'),
	filters = require('./filters'),
	uglifyjs = null;

try {
	uglifyjs = require('uglify-js');
} catch(e) {}

module.exports = Compiler;

function Compiler(string, opts) {
	this.string = string;
	this.options = opts || {};
	//Copy all this crap into compiler options object
	var copy = {"doctypes": doctypes,
		"filters": filters,
		"inlineTags": inlineTags,
		"selfClosingTags": selfClosingTags
	};
	for(var i in copy)
	{
		if(this.options[i])
			this[i] = this.options[i];
		else
		{
			this[i] = [];
			for(var j in copy[i])
				this[i][j] = copy[i][j];
		}
	}
	//Store special options
	if(typeof this.options.filename == "string")
	{
		this.options.filename = path.resolve(this.options.filename);
		this.basedir = path.resolve(this.options.basedir) || process.cwd();
		this.relDir = path.dirname(path.relative(
			this.basedir, this.options.filename) );
		this.includes = 0;
	}
	else
		this.includes = -1;
	if(this.options.cache)
		this.options.minify = true;
	if(this.options.includeSource == null && process.env.NODE_ENV == "development")
		this.options.includeSource = true;
	//Name of reserved variable in template
	this.templateNamespace = this.options.templateNamespace || "__";
}

/* static */ Compiler.parse = function(string) {
	return parser.parse(string);
}
Compiler.doctypes = doctypes;
Compiler.inlineTags = inlineTags;
Compiler.selfClosingTags = selfClosingTags;
Compiler.filters = filters;

Compiler.prototype.compile = function(cb) {
	var ns = this.templateNamespace;
	//Update options in runtime environment for "includes"
	runtime.compileOptions = this.options;
	if(this.options.debug)
		console.log("Compiling:\n" + this.string +
			"\n---------------------------------------------");
	var ast;
	try {
		ast = this.ast = Compiler.parse(this.string);
		if(this.options.debug)
			console.log("AST:\n", require('util').inspect(ast, false, 15, true),
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
		this._pushOff('var ' + ns + ' = ' + ns + ' || [];' + //Define ns as an array
			ns + '.r = ' + ns + '.r || blade.runtime;' + //Define ns.r to point to the runtime
			'if(!' + ns + '.blocks) ' + ns + '.blocks = {},' + ns + //Define ns.blocks to hold all blocks
			'.func = {},' + //Define ns.func to hold all functions
			ns + '.chunk = {};' + //Define ns.chunk to hold all functions chunks
			ns + '.locals = locals || {};'); //Store all locals, too
		if(this.options.minify !== true && this.options.includeSource)
			this._pushOff(ns + '.source = ' + JSON.stringify(this.string) + ";");
		if(this.options.minify !== true)
			this._pushOff(ns + ".filename = " + JSON.stringify(this.options.filename) + ";\n\ntry {");
		this._pushOff('with(' + ns + '.locals) {');
		if(ast.doctype != null)
			this._compileDoctype(ast.doctype);
		for(var i in ast.nodes)
			this._compileNode(ast.nodes[i]);
		//End of template callback
		this._pushOff('if(!' + ns + '.inc) ' + ns + '.r.done(' + ns + ');');
		//Wrap up inner includes
		for(var i = 0; i < this.includes; i++)
		{
			if(this.options.minify !== true)
				this._pushOff("} catch(e){return cb(" + ns + ".r.rethrow(e, " + ns + ") );}");
			if(i == 0)
				this._pushOff('cb(null, ' + ns + '.join(""), ' + ns + ');');
			this._pushOff("});");
		}
		//Close brace for `with`
		this._pushOff("}");
		//Close main `try` and insert `catch`
		if(this.options.minify !== true)
			this._pushOff("} catch(e){return cb(" + ns + ".r.rethrow(e, " + ns + ") );}");
		//If cb line was not entered yet, enter it now....
		if(this.includes < 1)
			this._pushOff('cb(null, ' + ns + '.join(""), ' + ns + ');');
		var template = this.buf;
		if(this.options.debug)
			console.log("Template:\n" + template +
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
			wrapper.template = new Function("locals", "cb", ns, template);
			if(this.options.debug)
				console.log("Template compiled successfully!");
			wrapper.filename = this.options.filename;
			wrapper.minify = this.options.minify;
			wrapper.toString = function() {
				//Try to use uglify-js
				var str = wrapper.template.toString();
				if(uglifyjs)
				{
					var ast = uglifyjs.parser.parse(str),
						ugly = uglifyjs.uglify;
					if(this.minify)
					{
						ast = ugly.ast_mangle(ast);
						ast = ugly.ast_squeeze(ast);
					}
					str = ugly.gen_code(ast, {'beautify': !this.minify});
				}
				return str;
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
	this.doctypes[name] = value;
};

Compiler.prototype.addFilter = function(name, filter) {
	this.filters[name] = filter;
};

Compiler.prototype._push = function(str) {
	if(this.inPush)
		this.buf += "," + str;
	else
	{
		this.buf += this.templateNamespace + ".push(" + str;
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
	var ns = this.templateNamespace;
	if(this.doctypes[doctype])
		this._push(JSON.stringify(this.doctypes[doctype]) );
	else
		this._push(JSON.stringify('<!DOCTYPE ' + doctype + '>') );
}

Compiler.prototype._compileNode = function(node) {
	var ns = this.templateNamespace;
	if(this.options.minify !== true && node.line != null && (this.lastNode == null ||
		this.lastNode.type != "code" || this.lastNode.children.length == 0) )
		this._pushOff(ns + ".line=" + node.line + "," + ns + ".col=" + node.col + ";");
	if(this.prependNewline && node.type != "text" && node.type != "filtered_text")
		this.prependNewline = false;
	switch(node.type)
	{
		case 'tag':
			var attrs = node.attributes;
			//id attribute
			if(!attrs.id && node.id)
				attrs.id = {'escape': false, 'text': node.id};
			//class attribute
			if(node.classes.length > 0)
			{
				if(attrs['class'] == undefined)
					attrs['class'] = {'escape': false, 'text': node.classes.join(" ")};
				else if(attrs['class'].text)
					attrs['class'].text += (attrs['class'].text.length > 0 ? " " : "") +
						node.classes.join(" ");
				else
					attrs['class'].append = node.classes.join(" ");
			}
			//start tag
			this._push("'<" + node.name + "'");
			//attributes
			var varAttrs = "";
			for(var i in attrs)
			{
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
				else if(i == "class" && attrs[i].append)
					varAttrs += "," + i + ":{append:" + JSON.stringify(attrs[i].append) +
						",val:" + attrs[i].code + ", escape:" + attrs[i].escape + "}";
				else
					varAttrs += "," + i + ":{val:" + attrs[i].code + ", escape:" +
						attrs[i].escape + "}";
			}
			if(varAttrs.length > 0)
				this._pushOff(ns + ".r.attrs({" + varAttrs.substr(1) + "}, " + ns + ", this);");
			//child nodes and end tag
			if(selfClosingTags.indexOf(node.name) >= 0)
				this._push("'/>'");
			else
			{
				this._push("'>'");
				for(var i in node.children)
					this._compileNode(node.children[i]);
				this._push("'</" + node.name + ">'");
			}
			break;
		case 'text':
			//Ensure we prepend a newline if the last node was a text node.
			if(this.prependNewline)
				node.text = "\n" + node.text;
			//Interpolate #{stuff} and optionally escape the text
			if(node.escape)
				this._push(ns + ".r.escape(" + bladeutil.interpolate(
					JSON.stringify(node.text) ) + ")");
			else
				this._push(bladeutil.interpolate(JSON.stringify(node.text) ) );
			this.prependNewline = true;
			break;
		case 'code_output':
			/* This is a text block that contains code, which should be outputed into
			the view.  If the code ends in a semicolon, we just remove it for
			convenience. The extra semicolon can break things. :) */
			if(node.code_output.charAt(node.code_output.length - 1) == ";")
				node.code_output = node.code_output.substr(0, node.code_output.length - 1);
			if(node.escape)
				this._push(ns + ".r.escape(" + node.code_output + ")");
			else
				this._push(node.code_output);
			break;
		case 'filtered_text':
			if(typeof this.filters[node.name] != "function")
			{
				var e = new Error("Invalid filter name: " + node.name);
				e.line = node.line, e.column = node.col;
				throw e;
			}
			var output = this.filters[node.name](node.filtered_text,
				{'minify': this.options.minify, 'compress': this.options.minify});
			//Ensure we prepend a newline if the last node was a text node.
			if(this.prependNewline)
				output = "\n" + output;
			if(this.filters[node.name].interpolate === false)
				this._push(JSON.stringify(output) );
			else
				this._push(bladeutil.interpolate(JSON.stringify(output) ) );
			this.prependNewline = true;
			break;
		case 'comment':
			if(!node.hidden)
			{
				if(this.insideComment)
				{
					this._push("'<!-!-'");
					this._push(JSON.stringify(node.comment) );
					for(var i in node.children)
						this._compileNode(node.children[i]);
					this._push("'-!->'");
				}	
				else
				{
					this._push("'<!--'");
					this.insideComment = true;
					this._push(JSON.stringify(node.comment) );
					for(var i in node.children)
						this._compileNode(node.children[i]);
					this.insideComment = false;
					this._push("'-->'");
				}
			}
			break;
		case 'conditional_comment':
			this._push("'<!--['");
			this._push(JSON.stringify(node.comment) );
			this._push("']>'");
			for(var i in node.children)
				this._compileNode(node.children[i]);
			this._push("'<![endif]-->'");
			break;
		case 'code':
			/* A line of code, which does not output into the view.
			If the node has children, we use the curly brace to enclose them;
			otherwise, we terminate the code with a semicolon */
			this._pushOff(node.code + (node.children.length > 0 ? "{" : ";") );
			for(var i in node.children)
				this._compileNode(node.children[i]);
			if(node.children.length > 0)
				this._pushOff("}");
			break;
		case 'include':
			if(this.includeForbidden)
			{
				var e = new Error("Includes are not permitted inside of functions, " +
					"blocks, or chunks.");
				e.line = node.line, e.column = node.col;
				throw e;
			}
			if(this.includes == -1)
			{
				var e = new Error("Includes will not work unless the `filename` property" +
					" is passed to the compiler.");
				e.line = node.line, e.column = node.col;
				throw e;
			}
			else if(this.includes == 0)
				this._pushOff(ns + ".base=" + JSON.stringify(this.basedir) + ";" +
					ns + ".rel=" + JSON.stringify(this.relDir) + ";");
			this.includes++;
			if(node.filename)
				this._pushOff(ns + ".r.include(" + JSON.stringify(node.filename) + "," +
					ns + ", function(err) {");
			else
				this._pushOff(ns + ".r.include(" + node.code + "," + ns + ", function(err) {");
			if(this.options.minify !== true)
				this._pushOff("try{");
			this._pushOff("if(err) throw err;");
			break;
		case 'block':
			var paramStr = node.parameters == null ? "" : "," + node.parameters.join(",");
			this._pushOff(ns + ".r.blockDef(" + JSON.stringify(node.name) + ", " + ns +
				", function(" + ns + paramStr + ") {");
			this.includeForbidden = true;
			for(var i in node.children)
				this._compileNode(node.children[i]);
			this.includeForbidden = false;
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
			this.includeForbidden = true;
			for(var i in node.children)
				this._compileNode(node.children[i]);
			this.includeForbidden = false;
			this._pushOff("});");
			break;
		case 'function':
			var paramStr = node.parameters == null ? "" : "," + node.parameters.join(",");
			this._pushOff(ns + ".func[" + JSON.stringify(node.name) + "]=function(" +
				ns + paramStr + ") {");
			/* If the first child node is a tag, ensure that its attributes are modified
				to allow a user to pass in an id or classes when the function is called */
			if(node.children.length > 0 && node.children[0].type == "tag")
			{
				var attrs = node.children[0].attributes;
				modifyAttribute('id', 'this.id', false);
				modifyAttribute('class', 'this.classes', true);
				function modifyAttribute(attrName, mergeWith, append) {
					if(attrs[attrName] == null)
						attrs[attrName] = {'escape': false, 'code': mergeWith};
					else if(attrs[attrName].code)
						attrs[attrName].code = "(" + mergeWith + (append ? '.push(' +
							attrs[attrName].code + '),' + mergeWith
							: '||' + attrs[attrName].code) + ")";
					else
					{
						attrs[attrName].code = "(" + mergeWith + (append ? '.push(' +
							JSON.stringify(attrs[attrName].text) + '),' + mergeWith
							: '||' + JSON.stringify(attrs[attrName].text)) + ")";
						delete attrs[attrName].text;
					}
				}
			}
			this.includeForbidden = true;
			for(var i in node.children)
				this._compileNode(node.children[i]);
			this.includeForbidden = false;
			//The buffer length before the function call is returned by the function
			this._pushOff("return this;};");
			break;
		case 'call':
			//The buffer length before the function call is returned by the function
			if(node.output)
				this._pushOff(node.output.to + (node.output.append ? "+=" : "=") + ns +
					".r.capture(" + ns + ",");
			if(node.arguments != "")
				node.arguments = "," + node.arguments;
			this._pushOff(ns + ".func[" + JSON.stringify(node.name) + "].call({" +
				(node.id ? "id:" + JSON.stringify(node.id) + "," : "") +
				(node.classes.length > 0 ? "classes:" +
					JSON.stringify(node.classes) + "," : "") +
				//Pass the current buffer length to the function to be called
				(node.output ? "pos:" + ns + ".length," : "") +
				"}," + ns + node.arguments + (node.output ? ") );" : ");") );
			break;
		case 'chunk':
			var paramStr = node.parameters == null ? "" : node.parameters.join(",");
			this._pushOff(ns + ".r.chunk(" + JSON.stringify(node.name) + ",function(" +
				paramStr + ") {");
			this.includeForbidden = true;
			for(var i in node.children)
				this._compileNode(node.children[i]);
			this.includeForbidden = false;
			this._pushOff("return this;}, " + ns + ");");
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
