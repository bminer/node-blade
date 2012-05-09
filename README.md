Blade - HTML Template Compiler
==============================

Blade is a HTML Template Compiler, inspired by Jade &amp; Haml, implemented in
JavaScript, so it will run on your microwave oven.

Never write HTML again. Please.

Table of Contents
-----------------

- [Why use Blade instead of Jade?](#why-use-blade-instead-of-jade)
- [Features](#features)
- [Project Status](#project-status)
- [Installation](#installation)
- [Language Syntax](#syntax)
	- [The Basics](#syntax)
	- [Functions](#functions)
	- [Dynamic File Includes](#dynamic-file-includes)
	- [Blocks](#blocks)
- [API](#api)
- [Implementation Details](#implementation-details)
- [License](#license)

Why use Blade instead of Jade?
-----------------------

Here are the reasons Blade *might* be considered "better" than Jade:

- **In Blade, file includes happen dynamically at run-time, instead of at compile-time.**
	This means that files compiled in Blade are generally smaller than Jade
	files when you are using file includes. In addition, if you re-use the same
	included file among multiple parent views, the included file does not need to
	be re-compiled. This can significantly decrease the size of client-side templates,
	and reduce the overall bandwidth required to transfer the templates over the
	Internet.
- **Blocks in Blade are awesome.** We removed features from Jade like explicit template
	inheritance and static file includes and then added features like blocks and
	parameterized blocks. You might find our idea of a block to be similar to Jade's,
	but just wait until you realize how much more flexible they are!
- **Just Functions, not mixins or partials.** In Blade, there are no "mixins" or partial
	templates. There are only functions, and they work just like regular JavaScript
	functions that you've come to know and love. You can put your functions into separate
	files and include them into other templates, you can take advantage of the `arguments`
	Array-like Object, closures (not necessarily recommended), or whatever you want!
	Can you define functions within other functions? Yep.
- **Load function output into a variable.** Blade has a built-in syntax for taking
	content rendered by a function and loading into a variable within your view template.
	Then, you can pass the rendered HTML content to another function, for example.

Features
--------

- Write extremely readable short-hand HTML
- Insert escaped and unescaped text and vanilla JavaScript code
- Code and text are escaped by default for security/convenience
- Functions (like Jade mixins)
- Dynamic file includes
- Regular blocks and Parameterized blocks (aids in supporting template inheritance)
- True client-side template support with caching, etc.
- Supports Express.JS
- HTML Comments and block comments
- Text filters

Blade does more than Jade, and it does less than Jade. Your Jade templates
will probably need some modifications before they will work with Blade.

Project Status
--------------

I'd say that Blade is in **beta**. There are some [known issues]
(https://github.com/bminer/node-blade/issues), and I would not recommend Blade
for production environments. That being said, I am using Blade for a few
projects, and it will be receiving more and more test coverage.

If you find a bug, please [report it here]
(https://github.com/bminer/node-blade/issues). If you include the Blade code
that failed along with the expected HTML output, that is always splendid.

By all means, please feel free to submit pull requests for new features,
new tests, or whatever! For big changes, say ~100 lines of code, you
might want to contact me first or submit an issue before getting started.

Installation
------------

for Node (via npm): `npm install blade`

for Browsers:

Runtime only: `wget https://raw.github.com/bminer/node-blade/master/dist/blade-runtime.min.js`

Syntax
------

### Tags

Like Jade, a tag is simply a word. For example, the string `html` will render to `<html></html>`.

You can have 'id's:

```
div#awesome
```

which renders as `<div id="awesome"></div>`.

Any number of classes work, separated by a dot (`.`)

```
div.task-details.container
```

which renders as `<div class="task-details container"></div>`.

Tag attributes?  Yep, they work pretty much like Jade, too.
Put attributes in parenthesis, separate attributes with a comma, space, newline, or whatever.

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

You can also put substitute an attribute value with vanilla JS code like this:
`input(type="text" name="contact-"+name value=value)`.  For example, if you passed the object
`{name: "fred", value: "testing"}` to your view, the above would render to:
`<input type="text" name="contact-fred" value="testing"/>`

You cannot put whitespace in the vanilla JavaScript code, though. Blade uses whitespace to
separate each attribute.

And, yes... the `class` attribute is handled with extra special care. Pass an array or string.
Classes (delimited by ".") from before will be merged with the value of the `class` attribute.

For example:

`div#foo.bar.dummy(class="another dude")` renders as: `<div id="foo" class="bar dummy another dude"></div>`

div, div, div can get annoying... so, we can omit the tag specifier if we specify an
id or some classes:

```
#foo
.bar
#this.is.cool
```

renders as:

```html
<div id="foo"></div><div class="bar"></div><div id="this" class="is cool"></div>
```

Blade just assumes anything without a tag name specifier is a `<div>` tag.

Also, tags without matching ending tags like `<img/>` render properly.

### Indenting

It works. You can indent with any number of spaces or with a single tab character. The
only rule is to be consistent within a given file.
Jade gives you a lot of weird indent flexibility. Blade, by design, does not.

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

Variable interpolation is supported for text blocks.  Use `#{var_name}` notation, and
anything between the curly braces is treated as vanilla JavaScript code.

For example, you can write:

```
p
	|
		I am just testing #{whatever + ", alright?"}
		
		Relax...
```

instead of writing the equivalent, but arguably less awesome...

```
p
	|=
		"I am just testing " + whatever + ", alright?" +
		"\n\n" +
		"Relax..."
```

Assuming a local variable `whatever` is passed to the value with value "Blade",
both of the examples above will render to this:

```html
<p>I am just testing Blade, alright?

Relax...</p>
```
		

### Text filters

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

Built-in text filters include:

- :nl2br - Converts newline characters to `<br/>`
- :cdata - Surrounds text like this: `<![CDATA[` ...text goes here... `]]>`
	Text should not contain `]]>`.
- :markdown (must have [markdown-js](https://github.com/evilstreak/markdown-js) installed)
- :md (alias for :markdown)

Filters are essentially functions that accept a text string and return HTML. They
cannot modify the AST directly.

And, you can add custom filters at runtime using the API.

### Code

Use dash (`-`) to specify a code block.  Use equals (`=`) to specify code output.  A few examples, please?

Code blocks:

```
#taskStatus
	- if(task.completed)
		p You are done. Do more! >:O
	- else
		p Get to work, slave!
```

Code that outputs (i.e. in a text block or at the end of a tag).
It's just like a text block, except with an `=`.

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
	!= some_var_containing_html
```

Extra "|" characters are okay, too.  Just don't forget that stuff after the "="
means JavaScript code!

```
p
	|= "escape me" + " away & away"
```

renders `<p>escape me away &amp; away</p>`

#### Variable names to avoid

Blade, like other template engines, defines local variables within every single view. You
should avoid using these names in your view templates whenever possible:

- `locals`
- `runtime`
- `cb`
- `buf`
- `__` (that's two underscores)
- Any of the compiler options (i.e. `debug`, `minify`, etc.)
- `blade`

### Doctypes

Don't forget a doctype!  Actually, you can, whatever...

Add a doctype using the `doctype` keyword or `!!!` like this:

`!!! 5` means use HTML 5 doctype.

Use the list of built-in doctypes or pass your own like this:

```
doctype html PUBLIC "-//W3C//DTD XHTML Basic 1.1//EN
```

which renders as `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML Basic 1.1//EN>`

Put the doctype at the top of your Blade files, please. Here is the list of built-in doctypes:

```javascript
exports.doctypes = {
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

Use `//` for a line comment.  Use `//-` if you don't want the comment to be rendered.
Block comments work, too.

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
	call textbox("firstName", "Blake")
```

Or... maybe just putting the generated HTML into a variable?

```
call textbox("firstName", "Blake") > text
//alternative syntax: call text = textbox("firstName", "Blake")
form
	!=text
```

Both examples would render:

```html
<form><input type="text" name="firstName" value="Blake"/></form>
```

You can also append content rendered by a function to a variable:
`call textbox("firstName", "Blake") >> text`
	or... alternatively...
`call text += textbox("firstName", "Blake")`

Yes, you can use `arguments` within your function, just like a "real" JavaScript function.
In fact, functions are "real" JavaScript functions, so even closures work! Although, remember
that functions have access to the variables in scope at the time the function was defined, not
the variables in scope when the function is called.

Example:

```
- var x = 12;
function test(foo)
	h1=foo
	- if(x)
		p=x
#example
	call test("Header")
```

would render: `<div id="example"><h1>Header</h1><p>12</p></div>`

#### Adding classes or an id to rendered function content

Yes, you can add a class name or id to the first element rendered by a function:

```
function dialog(msg)
	.dialog
		= msg
call dialog("Blade is awesome")#foobar.foo.bar
```

which would render as `<div id="foobar" class="dialog foo bar">Blade is awesome</div>`.

Although, if you try it with something like this, you get an error because the first
child rendered by the function is not a tag.

```
function dialog(msg)
	= msg
call dialog("Blade is awesome")#foobar.foo.bar
//compiler will generate an error
```

### Dynamic file includes

`include "file.blade"`

This will dynamically (at runtime) insert "file.blade" right into the current view, as if it
was a single file.

The include statement can also be followed by the name of a JavaScript variable containing
the filename to be included.

```
- var filename = "file.blade"
include filename
```

### Blocks

Blocks allow you to mark places in your template with code that may or may not be
rendered later.

You can do a lot with blocks, including template inheritance, etc. They behave quite
differently from Jade.

There are two types of blocks: regular blocks and parameterized blocks.

#### Regular blocks

Regular blocks are defined using the "block" keyword followed by a block name. Then,
you optionally put indented block content below. Like this:

```
block regular_block
	h1 Hello
	p This is a test
```

Assuming nothing else happens to the block, it will be rendered as
`<h1>Hello</h1><p>This is a test</p>` as expected. Empty blocks are also permitted.
A simple, empty block looks like this: `block block_name`

Of course, the purpose of declaring/defining a block is to possibly modify it later.
You can modify a block using three different commands:

- Use the `append` keyword to append to the matching block.
- Use the `prepend` keyword to prepend to the matching block.
- Use the `replace` keyword to replace the matching block.

Example:

```
append regular_block
	p This is also a test
```

#### Replacing a block

Replacing a block is somewhat confusing, so I will explain further. If you replace
a block, you are not changing the location of the defined block; you are only
replacing the content of the block at its pre-defined location. If you want to change
the location of a block, simply re-define a new block (see below).

In addition, when you replace a block, all previously appended and prepended content is
lost. The behavior is usually desired, but it can sometimes be a source of confusion.

If you replace a parameterized block (described below), you cannot call "render" on
that block anymore.

At this time, you cannot replace a block with a parameterized block. The "replace"
command will not accept parameters.

#### Parameterized blocks

The other type of block is called a parameterized block, and it looks like this:

```
block regular_block(headerText, text)
	h1= headerText
	p= text
```

Parameterized blocks do not render automatically because they require parameters.
Therefore, assuming nothing else happens to the block, the block will not be rendered
at all.

To render a block, use the "render" keyword like this:

```
render regular_block("Some header text", 'Some "paragraph" text')
```

Now, assuming nothing else happens to the block, the block will be rendered as:

```html
<h1>Some header text</h1><p>Some &quot;paragraph&quot; text</p>
```

Parameterized blocks are really cool because "append", "prepend", and "replace"
all work, too. You don't need to "render" the block to use "append", "prepend", and
"replace".

Another example:

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

```html
<head>
	<meta/>
	<title>Page Title</title>
	<script src="text/javascript"></script>
</head>
<body>
	<h1>Hello</h1>
</body>
```

#### What happens if I define the same block more than once?

You can re-define a block that has already been defined with another "block"
statement. This completely destroys the previously defined block.
Previously executed "append", "prepend", "replace", and "render" blocks do not affect the
re-defined block.

In summary...

- Use the `block` keyword to mark where the block will go (block definition).
- Use the `render` keyword to render the matching "parameterized" block.
	Do not use this on a regular block.
- Use the `append` keyword to append to the matching block.
- Use the `prepend` keyword to prepend to the matching block.
- Use the `replace` keyword to replace the matching block.

You may render, append to, prepend to, and replace undefined blocks; however,
this, of course, has no effect. No error messages occur if you do this because
a compiled view can also be included, and the parent view may have the block
defined.

### Template Inheritance

There is no `extends` keyword.  Just use blocks and includes:

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

If you render layout.blade, you get: `<html><head></head><body></body></html>`, but if you
render homepage.blade, you get:

```html
<html>
	<head>
		<title>Homepage</title>
	</head>
	<body>
		<h1>Hello, World</h1>
	</body>
</html>
```

API
---

`var blade = require('blade');`

### blade.compile(string, [options,] cb)

Asynchronously compiles a Blade template from a string.

- `string` is a string of Blade
- `options` include:
	- `filename` - the filename being compiled (required when using includes
		or the `cache` option)
	- `cache` - if true, the compiled template will be cached
	- `debug` - outputs debug info to the console (defaults to false)
	- `minify` - if true, Blade generates a minified template without debugging
		information (defaults to false)
	- `includeSource` - if true, Blade inserts the Blade source file directly into
		the compiled template, which can further improve error reporting, although
		the size of the template is increased significantly. (defaults to false)
	- `doctypes` - use this Object instead of `blade.Compiler.doctypes`
	- `inlineTags` - use this array instead of `blade.Compiler.inlineTags`
	- `selfClosingTags` - use this array instead of `blade.Compiler.selfClosingTags`
	- `filters` - use this Object instead of `blade.Compiler.filters`
- `cb` is a function of the form: `cb(err, tmpl)` where `err` contains
	any parse or compile errors and `tmpl` is the compiled template.
	If an error occurs, `err` may contain the following properties:
	- `message` - The error message
	- `expected` - If the error is a 'SyntaxError', this is an array of expected tokens
	- `found` - If the error is a 'SyntaxError', this is the token that was found
	- `filename` - The filename where the error occurred
	- `offset` - The offset in the string where the error occurred
	- `line` - The line # where the error occurred
	- `column` - The column # where the error occurred

Note: if there is a problem with the Blade compiler, or more likely, if there
is a syntax error with the JavaScript code in your template, Node.js will not
provide any line number or other information about the error. At the time of this
writing, this is a limitation of the Google V8 engine.

You can render a compiled template by calling the function: `tmpl(locals, cb)`
	- `locals` are the local variables to be passed to the view template
	- `cb` is a function of the form `function(err, html)` where `err` contains
		any runtime errors and `html` contains the rendered HTML.

In addition, a compiled template has these properties and methods:
	- `template` - a function that also renders the template but accepts 3 parameters:
		`tmpl.template(locals, runtime, cb)`. This simply allows you to use a custom
		runtime environment, if you choose to do so.
	- `filename` - the filename of the compiled template (if provided)
	- `toString()` - a function that converts the view template function into a string
		of JavaScript code. If you need a client-side template for example, you can
		use this function.

### blade.compileFile(filename, [options,] cb)

Asynchronously compile a Blade template from a filename on the filesystem.

- `filename` is the filename
- `options` - same as `blade.compile` above, except `filename` option is always
	overwritten	with the `filename` specified.
- `cb` - same as `blade.compile` above

### blade.renderFile(filename, options, cb)

Convenience function to asynchronously compile a template and render it.

- `filename` is the filename
- `options` - same as `blade.compileFile` above. This object is also passed
	directly to the view, so it should also contain your view's local variables.
- `cb` - a function of the form `function(err, html)`

### blade.Compiler

The compiler itself. It has some useful methods and properties.

### blade.Compiler.parse(string)

Just generates the parse tree for the string. For debugging purposes only.

Example using the API:

```javascript
var blade = require('blade');
blade.compile("string of blade", options, function(err, tmpl) {
	tmpl(locals, function(err, html) {
		console.log(html);
	});
});
```

Implementation Details
----------------------

The Blade parser is built using [PEG.js](https://github.com/dmajda/pegjs).
Thanks to the PEG.js team for making this project much easier than I had
anticipated! To modify the parser, simply change `./lib/parser/blade-grammer.pegjs`,
and the new parser will be automatically built the next time you run tests.

To install all devDependencies, just do: `npm link` or install manually
To run tests, ensure devDependencies are installed, then run: `npm test`

License
-------

See the [LICENSE.txt file](https://raw.github.com/bminer/node-blade/master/LICENSE.txt).
