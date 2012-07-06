/** Blade Extra Runtime plugin
    (c) Copyright 2012. Blake Miner. All rights reserved.
    https://github.com/bminer/node-blade
    http://www.blakeminer.com/

    See the full license here:
        https://raw.github.com/bminer/node-blade/master/LICENSE.txt
	
	Adds the following functions to `blade.runtime`:
		- render(viewName, locals, cb)
			Asynchronously loads (if necessary) and renders the specified view
			using the specified locals. If the Live UI plugin is available, this
			function generates a new Context in which the view shall be rendered.
			- viewName is the name of the view to be loaded and rendered
			- locals is the locals Object. If this is a Model, as specified in the
				Live UI plugin, then the Model's `observable` property is passed
				to the view
			- cb of the form cb(err, html [, info])
		- renderTo(element, viewName, locals, cb)
			Same as render(), except the output of the view is immediately passed
			to the specified element.  In addition, any event handlers created by
			the view are bound.
	Adds the following functions to jQuery.fn:
		- render(viewName, locals [, cb])
			Asynchronously renders the specified view using the specified locals.
			
*/
blade.runtime.render = function(viewName, locals, cb) {
	//Append .blade for filenames without an extension
	var ext = viewName.split("/");
	ext = ext[ext.length-1].indexOf(".");
	if(ext < 0)
		viewName += ".blade";
	//Load and render the template
	blade.runtime.loadTemplate(viewName, function(err, tmpl) {
		if(err) return cb(err);
		(function renderTemplate() {
			function renderIt() {
				tmpl(locals ? locals.observable || locals : {}, cb);
			}
			if(blade.Context)
			{
				var context = new blade.Context();
				context.on_invalidate(renderTemplate); //recurse
				context.run(renderIt);
			}
			else
				renderIt();
		})();
	});
};
blade.runtime.renderTo = function(el, viewName, locals, cb) {
	blade.runtime.render(viewName, locals, function(err, html, info) {
		if(err) return cb(err);
		el.html(html);
		//Register event handlers
		for(var i in info.eventHandlers)
		{
			var events = info.eventHandlers[i].events.split(" "),
				elem = document.getElementById(i);
			for(var j in events)
				elem['on' + events[j]] = info.eventHandlers[i].handler;
			//Delete comment before element
			elem.parentNode.removeChild(elem.previousSibling);
		}
		cb(null);
	});
};

if(jQuery)
	jQuery.fn.render = function(viewName, locals, cb) {
		blade.runtime.renderTo(this, viewName, locals, cb);
	};