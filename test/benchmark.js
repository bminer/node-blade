console.log("Stupid tests...\n---------------");
console.log("Test # 1 - String concatenate vs. Array.push - 1000 concatenations performed 10000 times.");
console.time('String concat');
for(var j = 0; j < 10000; j++)
{
	var str = "";
	for(var i = 0; i < 1000; i++)
		str += "this is only a test\n\n";
}
console.timeEnd('String concat');

console.time('Array concat');
for(var j = 0; j < 10000; j++)
{
	var arr = [];
	for(var i = 0; i < 1000; i++)
		arr.push("this is only a test\n\n");
	var str = arr.join("");
}
console.timeEnd('Array concat');

console.time('Array concat with fewer push() calls');
for(var j = 0; j < 10000; j++)
{
	var arr = [];
	for(var i = 0; i < 250; i++)
		arr.push("this is only a test\n\n", "this is only a test\n\n",
			"this is only a test\n\n", "this is only a test\n\n");
	var str = arr.join("");
}
console.timeEnd('Array concat with fewer push() calls');

console.log("\nBlade performance:\n------------------");
var fs = require('fs');
var filesTemp = fs.readdirSync(__dirname + "/templates"), files = [];
for(var i in filesTemp)
	if(filesTemp[i].substr(-6) == ".blade")
		files.push(filesTemp[i]);
var blade = require('../');
var numLines = 0;
for(var i in files)
{
	files[i] = {'filename': __dirname + "/templates/" + files[i],
		'data': fs.readFileSync(__dirname + "/templates/" + files[i]).toString()};
	numLines += files[i].data.split("\n").length;
}
var Compiler = blade.Compiler;

var times = 40;
console.log("Blade test suite statistics:");
console.log("\tFiles: " + files.length + "\n\tTotal number of lines: " + numLines + "\n");
console.time("Parse the entire test suite " + times + " times");
for(var i = 0; i < times; i++)
	for(var j in files)
		Compiler.parse(files[j].data);
console.timeEnd("Parse the entire test suite " + times + " times");

var tests = [];
function generateTest(test, times, command)
{
	var i = 0, j = -1;
	var cb = function(err) {
		if(++j >= files.length)
		{
			j = 0;
			if(++i >= times)
			{
				console.timeEnd(test + " " + times + " times");
				i = j = 0;
				var next = tests.shift();
				if(next) next();
				return;
			}
		}
		process.nextTick(function() {
			command(j, cb);
		});
	};
	tests.push(function() {
		console.time(test + " " + times + " times");
		cb();
	});
}
var locals = require('./locals');
locals.minify = true;

generateTest("Compile (cache off, minify on) the entire test suite", 40, function(j, cb) {
	blade.compileFile(files[j].filename, {'cache': false, 'minify': true}, cb);
});
generateTest("Render (cache off, minify on) the entire test suite", 40, function(j, cb) {
	blade.renderFile(files[j].filename, locals, cb);
});
generateTest("Compile and cache the entire test suite", 1, function(j, cb) {
	blade.compileFile(files[j].filename, {'cache': true, 'minify': true}, cb);
});
generateTest("Compile (cache on, minify on) the entire test suite", 1000, function(j, cb) {
	blade.compileFile(files[j].filename, {'cache': true, 'minify': true}, cb);
});
generateTest("Render (cache on, minify on) the entire test suite", 1000, function(j, cb) {
	locals.cache = true;
	blade.renderFile(files[j].filename, locals, cb);
});
tests.shift()();
