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

You can also have line feeds or weird whitespace between attributes, just like in Jade.
Whatever. This works, for example:

```
input(
		type="text"
		name="email"
		value="Your email here"
	)
```

Yes... the `class` attribute is handled with extra special care. Pass an array or string. Yes,
classes (delimited by ".") from before will be merged with the value of the attribute.

`div#foo.bar.dummy(class="another dude")` renders as: `<div id="foo" class="bar dummy another dude"></div>`

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

Need `<br/>` tags inserted? Use a built-in filter, perhaps?

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
- :markdown (must have it installed)
- :coffeescript (must have it installed) (use :cs as an alias if you want)
- :stylus (must have it installed)

And, you can add custom filters at runtime using the API.

### Code

Use "-" to specify a code block.  Use "=" to specify code output.  A few examples, please?

Code blocks:

```
#taskStatus
	- if(task.completed)
		p You are done. Do more! >:O
	- else
		p Get to work, slave!
```

Code that outputs (i.e. in a text block or at the end of a tag)

```
#taskStatus= task.completed ? "Yay!" : "Awww... it's ok."
p
	| The task was due on
	= task.dueDate
```

When using code that outputs, the default is to escape all text. To turn off escaping, just
prepend a "!", as before:

```
p
	!= some_html
```

Extra "|" characters are okay, too.  Just don't forget that stuff after the "="
means JavaScript code!

```
p
	|= "escape me away & away"
```

renders `<p>escape me away &amp; away</p>

### Doctypes

Don't forget a doctype!  Actually, you can, whatever... defaults to HTML 5, of course.

Add a doctype using `doctype` keyword or `!!!` like this:

`!!! 5` means use HTML 5 doctype.

Use the list of built-in doctypes or pass your own like this:

```
doctype html PUBLIC "-//W3C//DTD XHTML Basic 1.1//EN
```

which renders as `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML Basic 1.1//EN>`

Put the doctype at the top of your Blade files, please. Here is the list of built-in doctypes:

```javascript
var doctypes = exports.doctypes = {
  '5': '<!DOCTYPE html>',
  'xml': '<?xml version="1.0" encoding="utf-8" ?>',
  'default': '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">',
  'transitional': '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">',
  'strict': '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">',
  'frameset': '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Frameset//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-frameset.dtd">',
  '1.1': '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">',
  'basic': '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML Basic 1.1//EN" "http://www.w3.org/TR/xhtml-basic/xhtml-basic11.dtd">',
  'mobile': '<!DOCTYPE html PUBLIC "-//WAPFORUM//DTD XHTML Mobile 1.2//EN" "http://www.openmobilealliance.org/tech/DTD/xhtml-mobile12.dtd">'
};
```

Yes, you can modify the list of built-in doctypes through the API. Why would you, though?

### Comments

Use "//" for a comment.  Use "//-" if you don't want the comment to be rendered.  Block comments work, too.

```
//Comment example 1
//-Comment example 2
//
	#wow
	p Block comments work, too
```

renders as:

```html
<!--Comment example 1--><!--<div id="wow"></div><p>Block comments work, too</p>-->
```

Conditional comments work like this:

```
head
	//if lt IE 8
		script(src="/ie-really-sux.js")
```

renders as:

```html
<head><!--[if lt IE 8]><script src="/ie-really-sux.js"></script><![endif]--></head>
```

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

Both examples would render:

```html
<form><input type="text" name="firstName" value="Blake"/></form>
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
work in included templates, too.  The order in which these keywords appear matters.

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

Hmmm... that wasn't so bad, actually.

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
	- `doctypes` - use this Object instead of `blade.doctypes`

Returns the template `tmpl` as a JavaScript function. You can render a
template by calling the function: `tmpl(locals, options)`
	- `locals` are the local variables to be passed to the view template
	- `options` include:
		`runtime` - specify an Object containing Blade runtime functions

### blade.doctypes

The list of built-in doctypes, which you can modify or whatever.

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
