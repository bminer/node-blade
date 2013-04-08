/* Installs symlinks in ./meteor smart package directory since Meteor does not ship
with Blade just yet...
I'm hoping that I can get rid of this script someday... */
var fs = require('fs');
if(!fs.existsSync)
	fs.existsSync = require('path').existsSync; //Node 0.6 compatibility
//bash: [ -h ./meteor/runtime.js ] || ln -s ../lib/runtime.js ./meteor/runtime.js
if(!fs.existsSync("./meteor/runtime.js") )
	fs.symlink("../lib/runtime.js", "./meteor/runtime.js");
