/** Blade Public API and Middleware
	(c) Copyright 2012. Blake Miner. All rights reserved.	
	https://github.com/bminer/node-blade
	http://www.blakeminer.com/
	
	See the full license here:
		https://raw.github.com/bminer/node-blade/master/LICENSE.txt
*/
var fs = require('fs'),
	path = require('path'),
	Compiler = require('./compiler');

exports.compile = compile;
exports.compileFile = compileFile;
exports.Compiler = Compiler;
exports.renderFile = exports.__express = renderFile;
exports.middleware = middleware;

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
		if(options.filename != null)
			options.basedir = path.dirname(options.filename);
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
	filename = path.normalize(filename);
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
		if(err) return cb(err);
		tmpl(options, cb);
	});
}

/* Provides a nice Express middleware for compiling client-side templates
	and delivering them to the client. Weak caching is used by default.
*/
function middleware(sourcePath, options) {
	options = options || {};
	options.mount = options.mount || '/views/';
	if(options.clientNamespace == null)
		options.clientNamespace = "blade.templates";
	if(options.compileOptions == null)
		options.compileOptions = {
			'cache': process.env.NODE_ENV == "production",
			'minify': process.env.NODE_ENV == "production",
			'includeSource': process.env.NODE_ENV == "development"
		};
	if(options.clientCache == null)
		options.clientCache = process.env.NODE_ENV == "production";
	var cache = {}; //key=filename, value=file last modified timestamp
	return function(req, res, next) {
		if(req.url.substr(0, options.mount.length) == options.mount)
		{
			var filename = req.url.substr(options.mount.length);
			if(!options.compileOptions.cache && req.headers['if-modified-since'])
			{
				//Check cache
			}
			compileFile(sourcePath + "/" + filename, options.compileOptions, function(err, tmpl) {
				if(err) return next(err);
				res.type('application/javascript');
				res.send((options.clientCache ? "blade.cachedViews[" + JSON.stringify(filename) + "]=" : "") +
					options.clientNamespace + "[" + JSON.stringify(filename) + "]=" +
					tmpl.toString() + "; if(blade.cb[" + JSON.stringify(filename) +
					"]) blade.cb[" + JSON.stringify(filename) + "](" + options.clientNamespace + ");");
			});
		}
		else next();
	};
}
