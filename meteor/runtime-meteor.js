blade.Runtime.loadTemplate = function(baseDir, filename, compileOptions, cb) {
	//Append .blade for filenames without an extension
	if(filename.split("/").pop().indexOf(".") < 0)
		filename += ".blade";
	//Either pull from the cache or return an error
	filename = blade.Runtime.resolve(filename);
	if(blade.cachedViews[filename])
	{
		cb(null, blade.cachedViews[filename]);
		return true;
	}
	cb(new Error("Template '" + filename + "' could not be loaded.") );
	return false;
};