exports['nl2br'] = function(text) {
	return text.replace(/\n/g, "<br/>");
}
exports['cdata'] = function(text) {
	return "<![CDATA[\n" + text + "\n]]>";
}
exports['markdown'] = exports['md'] = function(text) {
	return require('markdown').markdown.toHTML(text);
};
