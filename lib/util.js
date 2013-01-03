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
	return str.replace(/(\\)?#{([^}]*)}/g, function(match, escaped, code) {
		return escaped ? "#{" + code + "}" : "\"+((" + ns + ".z=" + code.replace(/\\"/g, '"') +
			") == null ? '' : " + ns + ".z)+\"";
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
		var ast = uglifyjs.parse(str);
		if(minify)
		{
			//compress
			ast.figure_out_scope();
			var comp = uglifyjs.Compressor();
			ast = ast.transform(comp);
			//mangle
			ast.figure_out_scope();
			ast.compute_char_frequency();
			ast.mangle_names();
		}
		//output
		var stream = uglifyjs.OutputStream({"beautify": !minify});
		ast.print(stream);
		str = stream.toString();
	}
	return str;
};