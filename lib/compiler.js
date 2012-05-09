var path = require('path'),
	util = require('util'),
	parser = require('./parser'),
	runtime = require('./runtime'),
	bladeutil = require('./util'),
	doctypes = require('./doctypes'),
	inlineTags = require('./inline-tags'),
	selfClosingTags = require('./self-closing-tags'),
	filters = require('./filters');

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
		this.filename = this.options.filename;
		this.basedir = path.dirname(this.options.filename);
		this.includes = 0;
	}
	else
		this.includes = -1;
}

/* static */ Compiler.parse = function(string) {
	return parser.parse(string);
}
Compiler.doctypes = doctypes;
Compiler.inlineTags = inlineTags;
Compiler.selfClosingTags = selfClosingTags;
Compiler.filters = filters;

Compiler.prototype.compile = function(cb) {
	//Update options in runtime environment for "includes"
	runtime.compileOptions = this.options;
	if(this.options.debug)
		console.log("Compiling:\n" + this.string +
			"\n---------------------------------------------");
	var ast;
	try {
		ast = this.ast = Compiler.parse(this.string);
		if(this.options.debug)
			console.log("AST:\n" + util.inspect(ast, false, 15, true) +
				"\n---------------------------------------------");
	} catch(e) {
		if(this.filename)
			e.filename = this.filename;
		e.message = "Parser error: " + e.message;
		if(this.options.includeSource)
			e.source = this.string;
		return cb(runtime.rethrow(e) );
	}
	try {
		//Convert to JS function
		var template = 'runtime = runtime || blade.runtime; ' +
			'var buf = [], __ = {buf: buf, blocks: {}, func: {}, locals: locals || {}};';
		if(this.options.minify !== true && this.options.includeSource)
			template += '__.source = ' + JSON.stringify(this.string) + ";";
		if(this.options.minify !== true)
			template += "__.filename = " + JSON.stringify(this.filename) + "; try {";
		template += 'with(__.locals) {';
		if(ast.doctype != null)
			template += this._compileDoctype(ast.doctype);
		for(var i in ast.nodes)
			template += this._compileNode(ast.nodes[i]);
		//End of template callback
		template += 'runtime.done(__); cb(null, buf.join(""), __);';
		//Wrap up inner includes
		for(var i = 0; i < this.includes; i++)
			if(this.options.minify !== true)
				template += "} catch(e){return cb(runtime.rethrow(e, __) );} });";
			else
				template += "});";
		//Close brace for `with`
		template += "}";
		//Close `try` and insert `catch`
		if(this.options.minify !== true)
			template += "} catch(e){return cb(runtime.rethrow(e, __) );}";
		if(this.options.debug)
			console.log("Template:\n" + template +
				"\n---------------------------------------------");
		//Wrapper only accepts `locals` and `cb`
		var wrapper = function(locals, cb) {
			wrapper.template(locals, runtime, cb);
		}
		try {
			//The actual template exepects `locals`, `runtime`, and `cb`
			if(this.options.debug)
				console.log("Compiling template...");
			wrapper.template = new Function("locals", "runtime", "cb", template);
			if(this.options.debug)
				console.log("Template compiled successfully!");
			wrapper.filename = this.filename;
			wrapper.toString = function() {
				return wrapper.template.toString();
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
		if(this.options.includeSource)
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
	if(this.doctypes[doctype])
		return "buf.push(" + JSON.stringify(this.doctypes[doctype]) + ");";
	else
		return "buf.push(" + JSON.stringify(doctype) + ");";
}

Compiler.prototype._compileNode = function(node) {
	var str = "";
	if(this.options.minify !== true && node.line != undefined &&
		(this.lastNode == null || this.lastNode.type != "code") )
		str += "__.line=" + node.line + ", __.col=" + node.col + ";";
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
			str += "buf.push('<" + node.name + "');";
			//attributes
			var varAttrs = "";
			for(var i in attrs)
			{
				//take care of text attributes here
				if(attrs[i].text)
				{
					if(attrs[i].escape)
						str += "buf.push(' " + i + "=" +
							JSON.stringify(runtime.escape(attrs[i].text)) + "');";
					else
						str += "buf.push(' " + i + "=" +
							JSON.stringify(attrs[i].text) + "');";
				}
				else if(i == "class" && attrs[i].append)
					varAttrs += "," + i + ":{append:" + JSON.stringify(attrs[i].append) +
						",val:" + attrs[i].code + ", escape:" + attrs[i].escape + "}";
				else
					varAttrs += "," + i + ":{val:" + attrs[i].code + ", escape:" +
						attrs[i].escape + "}";
			}
			if(varAttrs.length > 0)
				str += "runtime.attrs({" + varAttrs.substr(1) + "}, buf);";
			//child nodes and end tag
			if(selfClosingTags.indexOf(node.name) >= 0)
				str += "buf.push('/>');"
			else
			{
				str += "buf.push('>');";
				for(var i in node.children)
					str += this._compileNode(node.children[i]);
				str += "buf.push('</" + node.name + ">');"
			}
			break;
		case 'text':
			//Ensure we prepend a newline if the last node was a text node. I think this works right?
			if(this.lastNode && this.lastNode.type == "text")
				node.text = "\n" + node.text;
			//Interpolate #{stuff} and optionally escape the text
			if(node.escape)
				str += "buf.push(runtime.escape(" + bladeutil.interpolate(
					JSON.stringify(node.text) ) + ") );";
			else
				str += "buf.push(" + bladeutil.interpolate(JSON.stringify(node.text) ) + ");";
			break;
		case 'code_output':
			/* This is a text block that contains code, which should be outputed into
			the view.  If the code ends in a semicolon, we just remove it for
			convenience. The extra semicolon can break things. :) */
			if(node.code_output.charAt(node.code_output.length - 1) == ";")
				node.code_output = node.code_output.substr(0, node.code_output.length - 1);
			if(node.escape)
				str += "buf.push(runtime.escape(" + node.code_output + "));";
			else
				str += "buf.push(" + node.code_output + ");";
			break;
		case 'filtered_text':
			if(typeof this.filters[node.name] != "function")
				throw new Error("Invalid filter name: " + node.name);
			var output = this.filters[node.name](node.filtered_text);
			str += "buf.push(" + JSON.stringify(output) + ");";
			break;
		case 'comment':
			if(!node.hidden)
			{
				str += "buf.push('<!--');";
				str += "buf.push(" + JSON.stringify(node.comment) + ");";
				for(var i in node.children)
					str += this._compileNode(node.children[i]);
				str += "buf.push('-->');";
			}
			break;
		case 'conditional_comment':
			str += "buf.push('<!--[');";
			str += "buf.push(" + JSON.stringify(node.comment) + ");";
			str += "buf.push(']>');";
			for(var i in node.children)
				str += this._compileNode(node.children[i]);
			str += "buf.push('<![endif]-->');";
			break;
		case 'code':
			/* A line of code, which does not output into the view.
			If the node has children, we use the curly brace to enclose them;
			otherwise, we terminate the code with a semicolon */
			str += node.code + (node.children.length > 0 ? "{" : ";");
			for(var i in node.children)
				str += this._compileNode(node.children[i]);
			if(node.children.length > 0)
				str += "}";
			break;
		case 'include':
			if(this.includes == -1)
				throw new Error("Includes will not work unless the `filename` property" +
					" is passed to the compiler.");
			this.includes++;
			if(node.filename)
				str += "runtime.include(" +
					JSON.stringify(this.basedir + "/" + node.filename) +
					", __, function(err) {";
			else
				str += "runtime.include(" + JSON.stringify(this.basedir + "/") +
					"+" + node.code + ", __, function(err) {";
			if(this.options.minify !== true)
				str += "try{";
			str += "if(err) throw err;";
			break;
		case 'block':
			var paramStr = node.parameters == null ? "" : node.parameters.join(",");
			str += "runtime.blockDef('" + node.name + "', __, function(" +
				paramStr + ") {var buf = [];";
			for(var i in node.children)
				str += this._compileNode(node.children[i]);
			str += "return buf;});";
			break;
		case 'render':
			if(node.arguments.length > 0)
				str += "runtime.blockRender('" + node.name + "', __, " + node.arguments + ");";
			else
				str += "runtime.blockRender('" + node.name + "', __);";
			break;
		case 'append':
		case 'prepend':
		case 'replace':
			str += "runtime.blockMod('" + node.type + "', '" + node.name + "', __, " +
				"function() {var buf = [];";
			for(var i in node.children)
				str += this._compileNode(node.children[i]);
			str += "return buf;});";
			break;
		case 'function':
			var paramStr = node.parameters == null ? "" : node.parameters.join(",");
			str += "__.func[" + JSON.stringify(node.name) + "]=function(" +
				paramStr + ") {var buf = [];";
			for(var i in node.children)
				str += this._compileNode(node.children[i]);
			str += "return buf.join('');};";
			break;
		case 'call':
			if(node.output)
				str += node.output.to + (node.output.append ? "+" : "") +
					"=__.func[" + JSON.stringify(node.name) + "](" +
					node.arguments + ");"
			else
				str += "buf.push(__.func[" + JSON.stringify(node.name) + "](" +
					node.arguments + ") );"
			break;
		default:
			throw new Error("Unknown node type: " + node.type)
			break;
	}
	this.lastNode = node;
	return str;
}