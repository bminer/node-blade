/** Blade utility functions
	(c) Copyright 2012. Blake Miner. All rights reserved.	
	https://github.com/bminer/node-blade
	http://www.blakeminer.com/
	
	See the full license here:
		https://raw.github.com/bminer/node-blade/master/LICENSE.txt
*/
/* Used by the Blade compiler to support variable interpolation for a
double quoted string with double quotes escaped.
(which matches the output of JSON.stringify)

Usage: interpolate(JSON.stringify(some_string) )
*/
exports.interpolate = function interpolate(str, ns) {
	return str.replace(/(\\)?([#!]){([^}]*)}/g, function(match, escaped, escFlag, code) {
		return escaped ? match.substr(1) :
			"\"+" + (escFlag == "#" ? ns + ".r.escape" : "") + "((" +
			ns + ".z=" + code.replace(/\\"/g, '"') +
			") == null ? '' : " + ns + ".z)+\"";
	});
};

/* This function is used before parsing `str` with UglifyJS to allow
the resulting JavaScript code to be parsable by UglifyJS.

`#{foo}` and `\#{foo}` are not valid JavaScript code.  What's worse is
that `var x = "\#{foo}"` results in JavaScript code that is semantically
the same as `var x = "#{foo}"`, which UglifyJS may or may not detect.
This means that the necessary backslash could be removed.

For escaped interpolation strings, we simply remove the backslash
For normal interpolation strings, `#{foo}` is replaced with
`{__interpolate__esc__:foo}`, which is valid JavaScript. */
exports.interpolatePreparse = function(str, ns) {
	return str.replace(/(\\)?([#!]){([^}]*)}/g, function(match, escaped, escFlag, code) {
		return escaped ? match.substr(1) : "{__interpolate__" +
			(escFlag == "#" ? "esc__" : "") + ":" + code + "}";
	});
};

// Inverse of interpolatePreparse
exports.interpolatePostparse = function(str, ns) {
	return str.replace(/([#!]){([^}]*)}/g, function(match) {
		return "\\" + match;
	}).replace(/{\s*__interpolate__(esc__)?\s*\:\s*([^}]*)}/g, function(match, escFlag, code) {
		return (escFlag ? "#" : "!") + "{" + code.trim() + "}";
	});
};

/* Escapes single quotes in the string */
exports.quote = function quote(str) {
	return str.replace(/'/g, "\\'");
};

/* Use uglify-js to obfuscate and optimize JavaScript code */
var uglifyjs = null;
try {
	uglifyjs = require("uglify-js");
} catch(e) {}
exports.uglify = function(str, minify) {
	if(uglifyjs)
	{
		if(uglifyjs.minify)
		{
			//Version 2.3+
			var opts = {"fromString": true};
			if(!minify)
			{
				opts.compress = opts.mangle = false;
				opts.output = {
					"beautify": true,
					"comments": true
				}
			}
			str = uglifyjs.minify(str, opts).code;
		}
		else if(uglifyjs.parser)
		{
			//Version 1.x - kept for legacy support and to work with Meteor
			var ast = uglifyjs.parser.parse(str),
				ugly = uglifyjs.uglify;
			if(minify)
			{
				ast = ugly.ast_mangle(ast);
				ast = ugly.ast_squeeze(ast);
			}
			str = ugly.gen_code(ast, {'beautify': !minify});
		}
	}
	return str;
};
