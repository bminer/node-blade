/** Blade Public API and Middleware
	(c) Copyright 2012. Blake Miner. All rights reserved.	
	https://github.com/bminer/node-blade
	http://www.blakeminer.com/
	
	See the full license here:
		https://raw.github.com/bminer/node-blade/master/LICENSE.txt
*/
var fs = require('fs'),
	path = require('path'),
	url = require('url'),
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
	
	if(options.filename)
		options.filename = path.resolve(options.filename);
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
	options.filename = path.resolve(filename);
	if(options.cache && cache[options.filename])
		cb(null, cache[options.filename]);
	else if(options.synchronous)
	{
		try {
			var data = fs.readFileSync(filename);
		} catch(err) {return cb(err);}
		compile(data.toString(), options, cb);
	}
	else
		fs.readFile(filename, function(err, data) {
			if(err) return cb(err);
			compile(data.toString(), options, cb);
		});
}

function renderFile(filename, options, cb) {
	compileFile(filename, options, function(err, tmpl) {
		if(err) return cb(err);
		//Make a copy of the options to be passed to the view, excluding reserved variables
		var locals = {};
		var reserved = ["locals", "cb", options.templateNamespace || "__"];
		for(var i in options)
			if(reserved.indexOf(i) < 0)
				locals[i] = options[i];
		tmpl(locals, cb);
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
	options.compileOptions.basedir = sourcePath;
	if(options.clientCache == null)
		options.clientCache = process.env.NODE_ENV == "production";
	return function(req, res, next) {
		var pathname = url.parse(req.url).pathname;
		if(pathname.substr(0, options.mount.length) == options.mount)
		{
			var filename = path.normalize(pathname.substr(options.mount.length) );
			var fullPath = path.join(sourcePath, filename);
			//fullPath may contain /../../../etc/passwd ... no good
			if(fullPath.indexOf(sourcePath) != 0)
				return res.type("text/plain").send("403 Forbidden", 403); //malicious filename
			compileFile(fullPath, options.compileOptions, function(err, tmpl) {
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
