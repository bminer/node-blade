node-blade
==========

Blade - HTML Template Compiler, inspired by Jade &amp; Haml, implemented in
JavaScript, so it will run on your microwave oven (only modern ones, like mine).

Never write HTML again. Please.

Features
--------

- Write extremely readable short-hand HTML
- True client-side template support with caching, etc.
- Functions (like Jade mixins)
- Parameterized blocks
- Filters
- Code and text are escaped by default for security/convenience

Installation
------------

for Node (via npm): `npm install blade`
for Browsers:
Runtime only: `wget https://raw.github.com/bminer/node-blade/master/dist/blade-runtime.min.js`
Compiler + Runtime: `wget https://raw.github.com/bminer/node-blade/master/dist/blade.min.js`

Syntax
------

### Tags

Like Jade, a tag is simply a word. For example, the string `html` will render to `<html></html>`.

You can have 'id's:

```
div#awesome
```

which renders as `<div id="awesome"></div>`.

Any number of classes work, separated by "."

```
div.task-details.container
```

which renders as `<div class="task-details container"></div>`.

div div div is annoying... so we can omit this if we specify an id or some classes:

```
#foo
.bar
#this.is.cool
```

renders as:

```html
<div id="foo"></div><div class="bar"></div><div id="this" class="is cool"></div>
```

Also, tags without matching ending tag like `img` render properly, depending on the doctype.

### Indenting

It works.

```
html
	head
	body
		#content
```

renders as:

```html
<html><head></head><body><div id="content"></div></body></html>
```

### Text

It works, too. Simply place content after the tag like this:

```
p This text is "escaped" by default. Kinda neat.
```

renders as:

```html
<p>This text is &quot;escaped&quot; by default. Kinda neat.</p>
```

Want unescaped text?  Large blocks of text? Done.

```
p! This will be <strong>unescaped</strong> text.
	|
		How about a block?
		Yep. It just works!
		Neato.
```

renders as:

```html
<p>This will be <strong>unescaped</strong> text.
How about a block?
Yep. It just works!
Neato.</p>
```

### Filters

Need <br/> tags inserted? Use a built-in filter, perhaps?

```
p
	:nl2br
		How about some text with some breaks?
		
		Yep! It works!
```

renders as:

```html
<p>How about some text with some breaks?<br/><br/>Yep! It works!</p>
```

Built-in filters include:

- :nl2br
- :cdata
- :markdown
- :coffeescript (use :cs as an alias)
- :stylus (must have it installed)

And, you can add custom filters at runtime using the API.

API
---

### var tmpl = blade.compile(string, options)

- `string` is a string of Blade
- `options` include:
	- `filename` - the filename being compiled (optional, but recommended)
	- `fileLoader` - a function that loads external files referenced in `string`.
		should be of the form `function(filename, cb)` where cb is of the form
		`cb(err, string)`
	- `debug` - generates templates with debugging info

Returns the template `tmpl` as a JavaScript function. You can render a
template by calling the function: `tmpl(locals, options)`
	- `locals` are the local variables to be passed to the view template
	- `options` include:
		`runtime` - specify an Object containing Blade runtime functions

### blade.parse(string)

Just generates the parse tree for the string. For debugging purposes only.

### blade.filters(name, function)

Filters can be added at runtime. Templates with missing filters will compile,
but they will not render properly.

- `name` is the customized name of the filter
- `function` is of the form: `function(text, cb)` accepting `text`
	as input and passing the filtered output back to Blade by calling `cb`
	of the form `cb(err, html)`


```javascript
var blade = require('blade');
var template = blade.compile(, options);
var html = template(locals);
```

Implementation Details
----------------------

The Blade parser is built using [PEG.js](https://github.com/dmajda/pegjs).
Thanks to the PEG.js team for making this project much easier than I had
anticipated!
