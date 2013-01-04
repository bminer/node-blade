(function() {
	//Helper function
	function resolveFilename(filename) {
		//Append .blade for filenames without an extension
		if(filename.split("/").pop().indexOf(".") < 0)
			filename += ".blade";
		return blade.Runtime.resolve(filename);
	}
	//Overwrite blade.Runtime.loadTemplate and include functions
	blade.Runtime.loadTemplate = function(baseDir, filename, compileOptions, cb) {
		filename = resolveFilename(filename);
		//Either pull from the cache or return an error
		if(blade._cachedViews[filename])
		{
			cb(null, blade._cachedViews[filename]);
			return true;
		}
		cb(new Error("Template '" + filename + "' could not be loaded.") );
		return false;
	};
	var oldInclude = blade.Runtime.include;
	blade.Runtime.include = function(relFilename, info) {
		var name = resolveFilename(info.rel + "/" + relFilename);
		//Remove .blade file extension
		if(name.substr(-6) == ".blade")
			name = name.substr(0, name.length - 6);
		//Add helpers to info.locals
		var tmpl = Template[name] || {};
		var tmplData = tmpl._tmpl_data || {};
		_.extend(info.locals, Meteor._partials[name], tmplData.helpers || {});
		//Now call original "include" function
		return oldInclude.apply(this, arguments);
	};
	
	//Use Spark as the live update engine
	for(var i in Spark)
		blade.LiveUpdate[i] = Spark[i];
})();