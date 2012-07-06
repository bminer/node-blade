/** Blade definePropertyIE8 plugin
    (c) Copyright 2012. Blake Miner. All rights reserved.
    https://github.com/bminer/node-blade
    http://www.blakeminer.com/

    See the full license here:
        https://raw.github.com/bminer/node-blade/master/LICENSE.txt
	
	This plugin provides crappy defineProperty support for IE 8.
	
	If using the definePropertyIE8 plugin, include it into your HTML document
	using a conditional comment like this:
	<!--[if IE 8]>
		<script type="text/javascript" src="/blade/plugins/definePropertyIE8.js"></script>
	<![endif]-->
*/
(function() {
	var x = Object.defineProperty;
	Object.defineProperty = function() {
		var args = arguments;
		if(!(args[0] instanceof Element))
		{
			var dom = document.createElement('fake');
			for(var i in args[0])
				dom[i] = args[0][i];
			args[0] = dom;
		}
		if(args[2])
			delete args[2].enumerable;
		return x.apply(this, args);
	};
})();