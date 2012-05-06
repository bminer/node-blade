var fs = require('fs'),
	Compiler = require('./compiler');

exports.compile = compile;
exports.compileFile = compileFile;
exports.Compiler = Compiler;
exports.renderFile = exports.__express = renderFile;

//Cache of compiled template functions
var cache = {};

function compile(string, options, cb) {
	if(typeof options == "function")
		cb = options, options = {};
	
	if(options.cache && !options.filename)
		cb(new Error('The `filename` option is required for caching'));
	else if(options.cache && cache[options.filename])
		cb(null, cache[options.filename]);
	else
	{
		var compiler = new Compiler(string, options);
		compiler.compile(function(err, tmpl) {
			if(err) return cb(err);
			if(options.cache)
				cache[options.filename] = tmpl;
			cb(null, tmpl);
		});
	}
}

function compileFile(filename, options, cb) {
	if(typeof options == "function")
		cb = options, options = {};
	options.filename = filename;
	if(options.cache && cache[options.filename])
		cb(null, cache[options.filename]);
	else
		fs.readFile(filename, function(err, data) {
			if(err) return cb(err);
			compile(data.toString(), options, cb);
		});
}

function renderFile(filename, options, cb) {
	compileFile(filename, options, function(err, tmpl) {
		if(err) cb(err);
		try {
			tmpl(options, cb);
		} catch(err) {
			cb(err);
		}
	});
}