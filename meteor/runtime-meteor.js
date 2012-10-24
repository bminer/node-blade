blade.Runtime.loadTemplate = function(baseDir, filename, compileOptions, cb) {
	//Append .blade for filenames without an extension
	if(filename.split("/").pop().indexOf(".") < 0)
		filename += ".blade";
	//Either pull from the cache or return an error
	filename = blade.Runtime.resolve(filename);
	if(blade._cachedViews[filename])
	{
		cb(null, blade._cachedViews[filename]);
		return true;
	}
	cb(new Error("Template '" + filename + "' could not be loaded.") );
	return false;
};
if(Spark)
	for(var i in Spark)
		blade.LiveUpdate[i] = Spark[i];
