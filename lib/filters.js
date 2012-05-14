exports['nl2br'] = function(text) {
	return require('./runtime').escape(text).replace(/\n/g, "<br/>");
}
exports['cdata'] = function(text) {
	return "<![CDATA[\n" + text + "\n]]>";
}
exports['markdown'] = exports['md'] = function(text) {
	var markdownLib;
	var markdownLibs = ['markdown', 'discount', 'markdown-js', 'marked'];
	for(var i in markdownLibs)
	{
		try {
			markdownLib = require(markdownLibs[i]);
		}
		catch(e) {}
	}
	if(markdownLib == null)
		throw new Error("Blade cannot find a markdown library. Please install one. (i.e. `npm install markdown`)");
	return markdownLib.parse(text);
};
exports['coffeescript'] = exports['cs'] = function(text) {
	return '<script type="text/javascript">\n' +
		require('coffee-script').compile(str) +
		'\n</script>';
};
exports['stylus'] = cssTemplate('stylus');
exports['less'] = cssTemplate('less');
function cssTemplate(lib) {
	return function(text) {
		var ret = '';
		require(lib).render(text, function(err, css) {
			if(err) throw err;
			ret = '<style type="text/css">\n' +
				css + '\n</style>';
		});
		return ret;
	};
};
exports['sass'] = function(text) {
	return '<style type="text/css">\n' +
		require('sass').render(text) +
		'\n</style>';
};
