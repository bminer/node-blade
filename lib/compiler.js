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
	if(typeof this.options.filename == "string" &&
		typeof this.options.basedir == "string")
	{
		this.filename = this.options.filename;
		this.includes = 0;
	}
	else
		this.includes = -1;
	if(opts.includeSource == null && process.env.NODE_ENV &&
		process.env.NODE_ENV == "development")
			opts.includeSource = true;
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
		if(this.filename)
			e.filename = this.filename;
		e.message = "Parser error: " + e.message;
		e.source = this.string;
		return cb(runtime.rethrow(e) );
	}
	try {
		//Convert to JS function
		var buf = this.buf = [];
		buf.push('var ' + ns + ' = ' + ns + ' || [];' + //Define ns as an array
			ns + '.r = ' + ns + '.r || blade.runtime;' + //Define ns.r to point to the runtime
			ns + '.blocks = ' + ns + '.blocks || {};' + //Define ns.blocks to hold all blocks
			ns + '.func = ' + ns + '.func || {};' + //Define ns.func to hold all functions
			ns + '.locals = locals || {};'); //Store all locals, too
		if(this.options.minify !== true && this.options.includeSource)
			buf.push(ns + '.source = ' + JSON.stringify(this.string) + ";");
		if(this.options.minify !== true)
			buf.push(ns + ".filename = " + JSON.stringify(this.filename) + ";\n\ntry {");
		buf.push('with(' + ns + '.locals) {');
		if(ast.doctype != null)
			this._compileDoctype(ast.doctype);
		for(var i in ast.nodes)
			this._compileNode(ast.nodes[i]);
		//End of template callback
		buf.push('if(!' + ns + '.inc) ' + ns + '.r.done(' + ns + ');');
		//Wrap up inner includes
		for(var i = 0; i < this.includes; i++)
		{
			if(this.options.minify !== true)
				buf.push("} catch(e){return cb(" + ns + ".r.rethrow(e, " + ns + ") );}");
			if(i == 0)
				buf.push('cb(null, ' + ns + '.join(""), ' + ns + ');');
			buf.push("});");
		}
		//Close brace for `with`
		buf.push("}");
		//Close main `try` and insert `catch`
		if(this.options.minify !== true)
			buf.push("} catch(e){return cb(" + ns + ".r.rethrow(e, " + ns + ") );}");
		//If cb line was not entered yet, enter it now....
		if(this.includes < 1)
			buf.push('cb(null, ' + ns + '.join(""), ' + ns + ');');
		var template = buf.join("");
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
			wrapper.filename = this.filename;
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
		if(this.filename)
			e.filename = this.filename;
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

Compiler.prototype._compileDoctype = function(doctype) {
	var ns = this.templateNamespace;
	if(this.doctypes[doctype])
		this.buf.push(ns + ".push(" + JSON.stringify(this.doctypes[doctype]) + ");");
	else
		this.buf.push(ns + ".push(" + JSON.stringify('<!DOCTYPE ' + doctype + '>') + ");");
}

Compiler.prototype._compileNode = function(node) {
	var buf = this.buf, ns = this.templateNamespace;
	if(this.options.minify !== true && node.line != undefined &&
		(this.lastNode == null || this.lastNode.type != "code") )
		buf.push(ns + ".line=" + node.line + "," + ns + ".col=" + node.col + ";");
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
			buf.push(ns + ".push('<" + node.name + "');");
			//attributes
			var varAttrs = "";
			for(var i in attrs)
			{
				//take care of text attributes here
				if(attrs[i].text)
				{
					if(attrs[i].escape)
						buf.push(ns + ".push(' " + i + "=" + bladeutil.quote(
							JSON.stringify(runtime.escape(attrs[i].text)) ) + "');");
					else
						buf.push(ns + ".push(' " + i + "=" + bladeutil.quote(
							JSON.stringify(attrs[i].text) ) + "');");
				}
				else if(i == "class" && attrs[i].append)
					varAttrs += "," + i + ":{append:" + JSON.stringify(attrs[i].append) +
						",val:" + attrs[i].code + ", escape:" + attrs[i].escape + "}";
				else
					varAttrs += "," + i + ":{val:" + attrs[i].code + ", escape:" +
						attrs[i].escape + "}";
			}
			if(varAttrs.length > 0)
				buf.push(ns + ".r.attrs({" + varAttrs.substr(1) + "}, " + ns + ", this);");
			//child nodes and end tag
			if(selfClosingTags.indexOf(node.name) >= 0)
				buf.push(ns + ".push('/>');");
			else
			{
				buf.push(ns + ".push('>');");
				for(var i in node.children)
					this._compileNode(node.children[i]);
				buf.push(ns + ".push('</" + node.name + ">');");
			}
			break;
		case 'text':
			//Ensure we prepend a newline if the last node was a text node.
			if(this.lastNode && (this.lastNode.type == "text" ||
				this.lastNode.type == "filtered_text") )
				node.text = "\n" + node.text;
			//Interpolate #{stuff} and optionally escape the text
			if(node.escape)
				buf.push(ns + ".push(" + ns + ".r.escape(" + bladeutil.interpolate(
					JSON.stringify(node.text) ) + ") );");
			else
				buf.push(ns + ".push(" + bladeutil.interpolate(JSON.stringify(node.text) ) + ");");
			break;
		case 'code_output':
			/* This is a text block that contains code, which should be outputed into
			the view.  If the code ends in a semicolon, we just remove it for
			convenience. The extra semicolon can break things. :) */
			if(node.code_output.charAt(node.code_output.length - 1) == ";")
				node.code_output = node.code_output.substr(0, node.code_output.length - 1);
			if(node.escape)
				buf.push(ns + ".push(" + ns + ".r.escape(" + node.code_output + "));");
			else
				buf.push(ns + ".push(" + node.code_output + ");");
			break;
		case 'filtered_text':
			if(typeof this.filters[node.name] != "function")
			{
				var e = new Error("Invalid filter name: " + node.name);
				e.line = node.line, e.column = node.col;
				throw e;
			}
			var output = this.filters[node.name](node.filtered_text);
			//Ensure we prepend a newline if the last node was a text node.
			if(this.lastNode && (this.lastNode.type == "text" ||
				this.lastNode.type == "filtered_text") )
				output = "\n" + output;
			if(this.filters[node.name].interpolate === false)
				buf.push(ns + ".push(" + JSON.stringify(output) + ");");
			else
				buf.push(ns + ".push(" + bladeutil.interpolate(JSON.stringify(output) ) + ");");
			break;
		case 'comment':
			if(!node.hidden)
			{
				if(this.insideComment)
				{
					buf.push(ns + ".push('<!-!-');");
					buf.push(ns + ".push(" + JSON.stringify(node.comment) + ");");
					for(var i in node.children)
						this._compileNode(node.children[i]);
					buf.push(ns + ".push('-!->');");
				}	
				else
				{
					buf.push(ns + ".push('<!--');");
					this.insideComment = true;
					buf.push(ns + ".push(" + JSON.stringify(node.comment) + ");");
					for(var i in node.children)
						this._compileNode(node.children[i]);
					this.insideComment = false;
					buf.push(ns + ".push('-->');");
				}
			}
			break;
		case 'conditional_comment':
			buf.push(ns + ".push('<!--[');");
			buf.push(ns + ".push(" + JSON.stringify(node.comment) + ");");
			buf.push(ns + ".push(']>');");
			for(var i in node.children)
				this._compileNode(node.children[i]);
			buf.push(ns + ".push('<![endif]-->');");
			break;
		case 'code':
			/* A line of code, which does not output into the view.
			If the node has children, we use the curly brace to enclose them;
			otherwise, we terminate the code with a semicolon */
			buf.push(node.code + (node.children.length > 0 ? "{" : ";") );
			for(var i in node.children)
				this._compileNode(node.children[i]);
			if(node.children.length > 0)
				buf.push("}");
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
			if(node.filename)
				buf.push(ns + ".r.include(" + JSON.stringify(this.options.basedir) +
					"," + JSON.stringify(node.filename) + "," + ns + ", function(err) {");
			else
				buf.push(ns + ".r.include(" + JSON.stringify(this.options.basedir) +
					"," + node.code + "," + ns + ", function(err) {");
			if(this.options.minify !== true)
				buf.push("try{");
			buf.push("if(err) throw err;");
			break;
		case 'block':
			var paramStr = node.parameters == null ? "" : "," + node.parameters.join(",");
			buf.push(ns + ".r.blockDef(" + JSON.stringify(node.name) + ", __, function(__" +
				paramStr + ") {");
			for(var i in node.children)
				this._compileNode(node.children[i]);
			buf.push("});");
			break;
		case 'render':
			if(node.arguments.length > 0)
				buf.push(ns + ".r.blockRender(" + JSON.stringify(node.name) + ", __, " +
					node.arguments + ");");
			else
				buf.push(ns + ".r.blockRender(" + JSON.stringify(node.name) + ", __);");
			break;
		case 'append':
		case 'prepend':
		case 'replace':
			buf.push(ns + ".r.blockMod('" + node.type.charAt(0) + "', " +
				JSON.stringify(node.name) + ", __, " +
				"function(__) {");
			for(var i in node.children)
				this._compileNode(node.children[i]);
			buf.push("});");
			break;
		case 'function':
			var paramStr = node.parameters == null ? "" : node.parameters.join(",");
			buf.push(ns + ".func[" + JSON.stringify(node.name) + "]=function(" +
				paramStr + ") {");
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
			for(var i in node.children)
				this._compileNode(node.children[i]);
			//The buffer length before the function call is returned by the function
			buf.push("return this.pos;};");
			break;
		case 'call':
			//The buffer length before the function call is returned by the function
			if(node.output)
				buf.push(node.output.to + (node.output.append ? "+=" : "=") + ns +
					".r.capture(" + ns + ",");
			if(node.arguments != "")
				node.arguments = "," + node.arguments;
			buf.push(ns + ".func[" + JSON.stringify(node.name) + "].call({" +
				(node.id ? "id:" + JSON.stringify(node.id) + "," : "") +
				(node.classes.length > 0 ? "classes:" +
					JSON.stringify(node.classes) + "," : "") +
				//Pass the current buffer length to the function to be called
				(node.output ? "pos:" + ns + ".length," : "") +
				"}" + node.arguments + (node.output ? ") );" : ");") );
			break;
		default:
			var e = new Error("Unknown node type: " + node.type);
			e.line = node.line, e.column = node.col;
			throw e;
			break;
	}
	this.lastNode = node;
}
