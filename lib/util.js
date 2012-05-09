/* Used by the Blade compiler to support variable interpolation for a
double quoted string with double quotes escaped.
(which matches the output of JSON.stringify)

Usage: interpolate(JSON.stringify(some_string) )
*/
exports.interpolate = function interpolate(str) {
	return str.replace(/(\\)?#{(.*)}/g, function(match, escaped, code) {
		return escaped ? str : "\"+((__.z=" + code.replace(/\\"/g, '"') +
			") == null ? '' : __.z)+\"";
	});
};

/* Escapes single quotes in the string */
exports.quote = function quote(str) {
	return str.replace(/'/g, "\\'");
}