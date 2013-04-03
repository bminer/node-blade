//Hopefully, sometime soon I'll be able to get rid of this horrible hack...
function requireHack() {
	var blade;
	function requireBlade(path, requireFunc) {
		if(blade) return;
		if(!requireFunc) requireFunc = require;
		try {
			blade = requireFunc(path);
		} catch(e) {}
	};
	requireBlade("blade");
	//It's likely that `__meteor_bootstrap__` will go away
	if(global.__meteor_bootstrap__)
	{
		requireBlade("blade", global.__meteor_bootstrap__.require);
		requireBlade("../", global.__meteor_bootstrap__.require);
	}
	// This block is for the core Meteor-installed package.
	// We actually have to give paths relative to
	// app/lib/packages.js, since that's who's evaling us.
	requireBlade("../../packages/blade/node_modules/blade");
	//The following lines should handle the Meteorite-installed package.
	requireBlade(process.cwd() + "/.meteor/meteorite/packages/blade/node_modules/blade");
	requireBlade(process.cwd() + "/../");
	requireBlade("../");
	return blade;
}
//-- end of horrible hack

Package.describe({
	summary: "Blade - HTML Template Compiler, inspired by Jade & Haml"
});

if(global.Npm)
	Npm.depends({"blade": ">=3"});

Package.register_extension("blade", function(bundle, srcPath, servePath, where) {
	var path, blade;
	if(global.Npm)
		path = Npm.require("path"), blade = Npm.require("blade");
	else
		path = require("path"), blade = requireHack();
	if(where !== "client") return; //get outta here, yo!
	//The template name does not contain ".blade" file extension or a beginning "/"
	var templateName = path.dirname(servePath).substr(1);
	templateName += (templateName.length > 0 ? "/" : "") + path.basename(servePath, ".blade");
	//Templates are assumed to be stored in "views/" or "client/views/"
	//so remove this from the name, if needed
	if(templateName.substr(0, 6) == "views/")
		templateName = templateName.substr(6);
	else if(templateName.substr(0, 13) == "client/views/")
		templateName = templateName.substr(13);
	//Remove directory prefix if not in views/ or client/views/
	else
		templateName = templateName.substr(templateName.lastIndexOf("/") + 1);
	//Finally, tell the Blade compiler where these views are stored, so that file includes work.
	//The location of meteor project = srcPath.substr(0, srcPath.length - servePath.length)
	var basedir = srcPath.substr(0, srcPath.length - servePath.length);
	blade.compileFile(srcPath, {
		'synchronous': true,
		'basedir': basedir,
		'cache': false, //disabled because we only compile each file once anyway
		'minify': false, //would be nice to have access to `no_minify` bundler option
		'includeSource': true //default to true for debugging
	}, function(err, tmpl) {
		if(err) throw err;
		if(templateName == "head")
			tmpl({}, function(err, html) {
				//This should happen synchronously due to compile options set above
				if(err) throw err;
				bundle.add_resource({
					type: templateName,
					data: html,
					where: where
				});
			});
		else
		{
			var data = "blade._cachedViews[" +
				//just put the template itself in blade._cachedViews
				JSON.stringify(templateName + ".blade") + "]=" + tmpl.toString() + ";" +
				//define a template with the proper name
				"Meteor._def_template(" + JSON.stringify(templateName) +
					//when the template is called...
					", function(data, obj) {data = data || {};" +
						//helpers work... even functions, thanks to Object.defineProperty!
						"for(var i in obj.helpers){" +
							"if(typeof obj.helpers[i] != 'function' || !Object.defineProperty)\n" +
								"data[i]=obj.helpers[i];\n" +
							"else\n" +
								"Object.defineProperty(data,i,{" +
									"get:obj.helpers[i],configurable:true,enumerable:true" +
								"});" +
						"}" +
						//Get `info` Object from the parent template (if any) and its length
						"var info = blade._includeInfo || [], startLen = info.length;" +
						//Expose `partials`
						"info.partials = obj.partials;" +
						/*call the actual Blade template here, passing in data
							`ret` is used to capture async results.
							Note that since we are using caching for file includes,
							there is no async. All code is ran synchronously. */
						"var ret = ''; blade._cachedViews[" + JSON.stringify(templateName + ".blade") +
						"](data, function(err,html,info) {" +
							"if(err) throw err;" +
							"html = info.slice(startLen).join('');" +
							//Remove event handler attributes
							'html = html.replace(/on[a-z]+\\=\\"return blade\\.Runtime\\.trigger\\(this\\,arguments\\)\\;\\"/g, "");' +
							//now bind any inline events and return
							"ret = blade.LiveUpdate.attachEvents(info.eventHandlers, html);" +
						"},info);\n" +
						//so... by here, we can just return `ret`, and everything works okay
						"return ret;" +
					"}" +
				");";
			if(templateName == "body")
				data += "Meteor.startup(function(){" +
						"document.body.appendChild(Spark.render(Template.body));" +
					"});"
			bundle.add_resource({
				type: 'js',
				path: "/views/" + templateName + ".js", //This can be changed to whatever
				data: data,
				where: where
			});
		}
	});
});

Package.on_use(function(api) {
	//The plain-old Blade runtime
	api.add_files('runtime.js', 'client');
	//The Blade runtime with overridden loadTemplate function, designed for Meteor
	api.add_files('runtime-meteor.js', 'client');
	//A hack to get Handlebars helpers to work with Blade
	api.add_files('helpers-hack.js', 'client');
});
