/* Installs symlinks in ./meteor smart package directory since Meteor does not ship
with Blade just yet...
I'm hoping that I can get rid of this script someday... */
var fs = require('fs');
if(!fs.existsSync)
	fs.existsSync = require('path').existsSync; //Node 0.6 compatibility
if(!fs.existsSync("./meteor/node_modules") )
	fs.mkdirSync("./meteor/node_modules");
//bash: [ -h ./meteor/node_modules/blade ] || ln -s ../.. ./meteor/node_modules/blade
if(!fs.existsSync("./meteor/node_modules/blade") )
	fs.symlink("../..", "./meteor/node_modules/blade");
//bash: [ -h ./meteor/runtime.js ] || ln -s ../lib/runtime.js ./meteor/runtime.js
if(!fs.existsSync("./meteor/runtime.js") )
	fs.symlink("../lib/runtime.js", "./meteor/runtime.js");
