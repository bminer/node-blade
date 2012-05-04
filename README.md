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
- Dynamic file includes
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

Tag attributes?  Yep, they work pretty much like Jade, too.
Put attributes in parenthesis, separate with a comma and/or spaces.

`a(href="/homepage", onclick="return false;")` renders as:

```html
<a href="/homepage" onclick="return false;"></a>
```

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

Also, tags without matching ending tag like `<img>` render properly.

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
		How about a block? (this is "escaped", btw)
		Yep. It just works!
		Neato.
```

renders as:

```html
<p>This will be <strong>unescaped</strong> text.
How about a block? (this is &quot;escaped&quot;, btw)
Yep. It just works!
Neato.</p>
```

Rules are:

- Text is escaped by default
- Want unescaped text? Precede with a `!`
- Large text block? Use `|` and indent properly.
- Unescaped text block? Use `|!` or even just `!` works.

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

### Functions

Functions are reusable mini-templates. They are similar to 'mixins' in Jade.

Defining a function:

```
function textbox(name, value)
	input(type="text", name=name, value=value)
```

Calling a function and inserting into template structure:

```
form
	!=functions.textbox("firstName", "Blake")
```

Or... maybe just putting the generated HTML into a variable?

```
- var text = functions.textbox("firstName", "Blake");
form
	!=text
```

Limitation: Don't use a local variable with the name `functions`... for obvious reasons.

### Dynamic file includes

`include "file.blade"`

This will dynamically (at runtime) insert "file.blade" right into the current view, as if it
was a single file

### Parameterized Blocks

Parameterized blocks allow you to mark places in your template with code that will be
rendered later.

- Use the `block` keyword to mark where the block will go.
- Use the `render` keyword to render the matching block.
- Use the `append` keyword to append to the matching block.
- Use the `prepend` keyword to prepend to the matching block.
- Use the `replace` keyword to replace to the matching block.

For example:

```
head
	block header(pageTitle)
		title= pageTitle
body
	h1 Hello
	render header("Page Title")
	append header
		script(src="text/javascript")
	prepend header
		meta
```

Will output:

```
<head>
	<meta/>
	<title>Page Title</title>
	<script src="text/javascript"></script>
</head>
<body>
	<h1>Hello</h1>
</body>
```

Parameters are optional. A simple, empty block looks like this: `block block_name`

If you do not insert a `render` call, the defined block will not render; however,
any `append`, `prepend`, or `replace` will still work. All of these keywords
work in child templates, too (see template inheritance).  A `render` call in a child
view, for example, will take precedence over a `render` call in a parent view;
that is, by calling `render title("Homepage")` in a child view, you will change
the title of the page to "Homepage".

For convenience, you can omit a `render` call by defining a rendered block like this:

```
rendered block foobar
	h1 Some text
```

Although, as one might expect, rendered blocks cannot accept parameters.

### Template Inheritance

There is no `extends` keyword.  Just do this:

layout.blade:

```
html
	head
		block title(pageTitle)
			title=pageTitle
	body
		block body
```

homepage.blade:

```
include "layout.blade"
render title("Homepage")
replace block body
	h1 Hello, World
```


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
