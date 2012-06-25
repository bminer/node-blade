var blade = require('../lib/blade'),
	util = require('util'),
	fs = require('fs'),
	path = require('path'),
	locals = require('./locals'),
	child_process = require('child_process');
if(!fs.existsSync)
	fs.existsSync = path.existsSync; //Node 0.6 compatibility

locals.includeSource = true;
locals.debug = true;

		(function(filename) {
			var inPath = __dirname + "/templates/" + filename;
			var outPath = __dirname + "/output/" + path.basename(filename, ".blade") + ".html";
			var copy = {};
			for(var i in locals)
				copy[i] = locals[i];
			blade.renderFile(inPath, copy, function(err, html, info) {
				if(err) throw err;
				if(fs.existsSync(outPath) )
				{
					var compare = child_process.spawn('diff', ['-u', outPath, '-']);
					var diff = "";
					compare.stdout.on('data', function(chunk) {
						diff += chunk;
					});
					compare.on('exit', function(code) {
						if(diff != "")
						{
							console.log("----Test failed for file:", filename,
								"\nTemplate:\n" + info.source,
								"\nHTML:\n" + html,
								"\nDiff:\n", diff);
						}
						else
							console.log("----Test passed for file:", filename);
					});
					compare.stdin.write(html);
					compare.stdin.end();
				}
				else
				{
					console.log("Review output for file:", filename,
						"\nTemplate:\n" + info.source,
						"\nHTML:\n" + html);
					console.log("-----------------------------------------------");
					console.log("File not written");
				}
			});
		})(process.argv[2] + ".blade");
