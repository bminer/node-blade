//This is a horrible hack that will hopefully be corrected.
Meteor.startup(function() {
	_.each(Meteor._partials, function(partial, partialName) {
		_.each(Handlebars._default_helpers, function(helper, helperName) {
			//Expose other Handlebars helpers to Blade
			if(helperName != "constant" &&
				helperName != "each" &&
				helperName != "if" &&
				helperName != "isolate" &&
				helperName != "unless" &&
				helperName != "with"
			)
				partial[helperName] = function() {
					return helper({"hash": {} });
				};
		});
	});
});
