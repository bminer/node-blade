[ -d ./meteor/node_modules ] || mkdir ./meteor/node_modules
[ -h ./meteor/node_modules/blade ] || ln -s ../.. ./meteor/node_modules/blade
[ -h ./meteor/runtime.js ] || ln -s ../lib/runtime.js ./meteor/runtime.js
