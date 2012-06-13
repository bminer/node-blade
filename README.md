Blade - HTML Template Compiler
==============================

Blade is a HTML Template Compiler, inspired by Jade &amp; Haml, implemented in
JavaScript, so it will run on your microwave oven.

It works like this...

1. Write up your template in Blade (which is a Jade-like language)
2. Use the Blade compiler to generate a Blade template (which is a JavaScript function)
3. Pass variables into your generated template to produce HTML or XML

[View a simple example](#simple-example)

Never write HTML again. Please.

<img src="http://www.empireonline.com/images/features/100greatestcharacters/photos/47.jpg"
alt="Blade" width="150" height="169"/>

"Blade's blood is the key" :P Sorry... I had to...

### Migrating to Blade 1.3

The latest version of Blade makes several changes to the Meteor smart package. You may need
to reorganize your Meteor project to migrate to the new version. See the [Meteor wiki page]
(https://github.com/bminer/node-blade/wiki/Using-Blade-with-Meteor) for more information.

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
- [Meteor Support](#meteor-support)
- [API](#api)
- [Browser Usage](#browser-usage)
- [A Simple Example](#simple-example)
- [Implementation Details](#implementation-details)
- [Benchmarks](#benchmarks)
- [License](#license)

Why use Blade instead of Jade?
-----------------------

Here are the reasons Blade *might* be considered "better" than Jade:

- Jade is an ornamental stone. Blade is a badass vampire hunter.
- **Client-side templates** can be served to the browser, no problem.
	See [Browser Usage](#browser-usage) and [Blade Middleware]
	(#blademiddlewaresourcepath-options) for more info.
- **Meteor support** - Blade works well with [Meteor](http://meteor.com/). See the
	[documentation below](#meteor-support).
- **Compatibility** - The language syntax of Blade is very similar to Jade's. Jade is
	an awesome templating language, and if you are already familiar with it, getting
	started with Blade should take you very little time.
- **In Blade, file includes happen dynamically at run-time, instead of at compile-time.**
	This means that files compiled in Blade are generally smaller than Jade
	files when you are using file includes. In addition, if you re-use the same
	included file among multiple parent views, the included file does not need to
	be re-compiled. This can significantly decrease the size of client-side templates,
	and reduce the overall bandwidth required to transfer the templates over the
	Internet.
- **[Blocks](#blocks) in Blade are awesome.** We removed features from Jade like explicit template
	inheritance and static file includes and then added features like blocks and
	parameterized blocks. You might find our idea of a block to be similar to Jade's,
	but just wait until you realize how much more flexible they are!
- **Just [Functions](#functions), not mixins or partials.** In Blade, there are no "mixins"
	or partial templates. There are only functions, and they work just like regular JavaScript
	functions that you've come to know and love. You can put your functions into separate
	files and include them into other templates, you can take advantage of the `arguments`
	Array-like Object, closures (not necessarily recommended), or whatever you want!
- **Load function output into a variable.** Blade has a built-in syntax for taking
	content rendered by a function and loading it into a variable within your view template.
	Then, you can pass the rendered HTML content to another function, for example.

```
			Jade			vs.				Blade
```
<img src="http://www.pbs.org/wgbh/nova/diamond/images/gp08jade.jpg" alt="Jade" width="226" height="169"/> &nbsp;&nbsp; <img src="http://www.empireonline.com/images/features/100greatestcharacters/photos/47.jpg" alt="Blade" width="150" height="169"/>

OK... it's admittedly not as funny as I thought it would be. But, I tried.

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
- Nice error reporting to help you debug your broken templates
- Command-line tool to compile/render templates (try `blade --help`)
- Meteor smart package

Blade does more than Jade, and it does less than Jade. Your Jade templates
will probably need some modifications before they will work with Blade.

Project Status
--------------

I'd say that Blade 1.3 and above is **stable**. There are very few (if any)
[known issues](https://github.com/bminer/node-blade/issues), and I think that Blade
is ready for production environments. I use Blade for many of my projects.

If you find a bug, please [report it here]
(https://github.com/bminer/node-blade/issues). If you include the Blade code
that failed along with the expected HTML output, that is always splendid.

By all means, please feel free to submit pull requests for new features,
new tests, or whatever! For big changes, say ~100 lines of code, you
might want to contact me first or submit an issue before getting started.

Installation
------------

for Node (via npm): `sudo npm install -g blade`

Runtime for Browsers: `wget https://raw.github.com/bminer/node-blade/master/dist/blade-runtime.min.js`

Minified runtime is about 4-5 KB, uncompressed.

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

You cannot put whitespace, commas, newlines, or parentheses in the vanilla JavaScript code,
though. Blade uses these characters to separate each attribute or to end the tag definition.

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

You can start a tag name with a bashslash to escape Blade keywords.
Normally, `include test` would include a file, but `\include test` renders as:

```xml
<include>test</include>
```

This allows you to be flexible with tag names, so you are not restricted to rendering
HTML, for example. You can render any XML document with Blade.

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
Start a line of text with a `|`.

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

- Text is escaped by default.
- Want unescaped text? Precede with a `!`
- Precede with a `=` to evaluate and output some JavaScript.
- Large text block? Use `|` and indent properly.
- Unescaped text block? Use `|!` or even just `!` works.
- JavaScript code block? Use `|=` or even just `=` works.
- Unescaped JavaScript code block? Yep. Use `|!=` or `!=`.
- Newlines in text blocks are preserved.

Variable interpolation is supported for text blocks.  Use `#{var_name}` notation, and
anything between the curly braces is treated as vanilla JavaScript code.

For example, you can write:

(caution: indents are **required** on line 4 even though it is blank)

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

Assuming a local variable `whatever` is passed to the template with value "Blade",
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

- :nl2br - Escapes the content and converts newline characters to `<br/>`
- :cdata - Surrounds text like this: `<![CDATA[` ...text goes here... `]]>`
	Text should not contain `]]>`.
- :markdown (must have [markdown-js](https://github.com/evilstreak/markdown-js) installed)
- :md (alias for :markdown)
- :javascript - Generates a `<script>` tag for your JavaScript code. If `minify` compiler
	option is set and UglifyJS is installed, your code is uglified automatically.
- :js (alias for :javascript)
- :coffeescript - Generates a `<script>` tag for the generated JavaScript.
	(must have [coffee-script](https://github.com/jashkenas/coffee-script) installed)
- :cs (alias for :coffeescript)
- :stylus - Generates a `<style>` tag for the generated CSS. If `minify` compiler
	option is set, your CSS is compressed automatically.
	(must have [stylus](https://github.com/LearnBoost/stylus) installed)
- :less - Generates a `<style>` tag for the generated CSS.
	(must have [less](https://github.com/cloudhead/less.js) installed)
- :sass - Generates a `<style>` tag for the generated CSS.
	(must have [sass](https://github.com/visionmedia/sass.js) installed)

Filters are essentially functions that accept a text string and return HTML. They
cannot modify the AST directly. Also, you cannot inject JavaScript code into
filters.

You can add custom filters at compile-time using the API.

Variable interpolation is supported for certain text filters, as well.  If a text
filter returns text in `#{var_name}` notation, then anything between the curly braces
is replaced with vanilla JavaScript code. To avoid this behavior, text filters can
either escape the `#{stuff}` with a backslash, or it can set its `interpolation`
property to `false`.

### Code

Use dash (`-`) to indicate that JavaScript code follows, which will not output into
the template.  As before, use equals (`=`) to specify code output.  A few examples, please?

Using dash (`-`):

```
#taskStatus
	- if(task.completed)
		p You are done. Do more! >:O
	- else
		p Get to work, slave!
```

When inserting lines of code with `-`, curly braces or semicolons are inserted, as
appropriate.  In the example above, we have an `if` statement followed by an indented
paragraph tag.  In this case, Blade wraps the indented content with curly braces.
If there is no indented content beneath the line of code, then a semicolon is appended
instead.

Code that outputs (i.e. a code block or at the end of a tag).
As mentioned before, it's just like a text block, except with an `=`.

```
#taskStatus= task.completed ? "Yay!" : "Awww... it's ok."
p
	| The task was due on
	|= task.dueDate
```

When using code that outputs, the default is to escape all text. To turn off escaping, just
prepend a "!", as before:

```
p
	|!= some_var_containing_html
```

Missing "|" characters are okay, too.  Just don't forget that stuff after the "="
needs to be valid JavaScript code!

```
p
	= "escape me" + " away & away"
```

renders `<p>escape me away &amp; away</p>`

#### Variable names to avoid

Blade, like other template engines, defines local variables within every single view. You
should avoid using these names in your view templates whenever possible:

- `locals`
- `cb`
- `__` (that's two underscores)
- Any of the compiler options (i.e. `debug`, `minify`, etc.)

### Doctypes

Don't forget a doctype!  Actually, you can, whatever...

Add a doctype using the `doctype` keyword or `!!!` like this:

`!!! 5` means use HTML 5 doctype.

Use the list of built-in doctypes or pass your own like this:

```
doctype html PUBLIC "-//W3C//DTD XHTML Basic 1.1//EN"
html
```

which renders as `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML Basic 1.1//EN"><html></html>`

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

To comment out entire sections of Blade code, you can use non-rendering block comments
with a text block.

```
//-
	|
		anything can go here... Blade code, JavaScript code, whatever...
		just make sure that the indenting is right.
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

Note: when you define a block (see below) within a function, and you output the rendered
content to a variable, the block will be destroyed immediately after the function call.

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
//compiler might generate an error, or it might just ignore the id and classes
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

If you do not specifiy a file extension, `.blade` will be appended to your string
internally.

Due to various complications, you may *NOT* place an `include` inside of a `function`,
`block`, or `chunk`. This limitation is a bummer, and if you don't like it, you should
complain by opening an issue.

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
the location of a block, simply re-define a new block ([see below]
(#what-happens-if-i-define-the-same-block-more-than-once)).

In addition, when you replace a block, all previously appended and prepended content is
lost. The behavior is usually desired, but it can sometimes be a source of confusion.

If you replace a parameterized block (described below) with a regular block, you cannot
call "render" on that block.

You can replace a regular block with a parameterized block (described below). This will
also clear the contents of the block, as expected.

#### Parameterized blocks

The other type of block is called a parameterized block, and it looks like this:

```
block param_block_yo(headerText, text)
	h1= headerText
	p= text
```

Parameterized blocks do not render automatically because they require parameters.
Therefore, assuming nothing else happens to the block, the block will not be rendered
at all.

To render a block, use the "render" keyword like this:

```
render param_block_yo("Some header text", 'Some "paragraph" text')
```

Now, assuming nothing else happens to the block, the block will be rendered as:

```html
<h1>Some header text</h1><p>Some &quot;paragraph&quot; text</p>
```

You can `render` as many times as you wish, and by default, the rendered content will
be appended to the block. You can also prepend the rendered content to the block or
replace the contents of the block with rendered content. Here are the variations:

- `render param_block_yo("Some header text", 'Some "paragraph" text')`
- `render append param_block_yo("Some header text", 'Some "paragraph" text')`
	(same as above)
- `render prepend param_block_yo("Some header text", 'Some "paragraph" text')`
- `render replace param_block_yo("Some header text", 'Some "paragraph" text')`

Parameterized blocks are really cool because regular "append", "prepend", and "replace"
all work, too. Just remember that order matters.

Another example:

```
head
	block header(pageTitle)
		title= pageTitle
body
	h1 Hello
	render header("Page Title")
	append header
		script(type="text/javascript")
	render header("Page Title")
	prepend header
		meta
```

Will output:

```html
<head>
	<meta/>
	<title>Page Title</title>
	<script type="text/javascript"></script>
	<title>Page Title</title>
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

You may not render, append to, prepend to, or replace undefined blocks. If you do so,
an error message will occur.

When you define a block within a function, and you output the function's rendered
content to a variable, the defined block will be destroyed immediately after
the function call.

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

### Chunks

Chunks are simply functions that return HTML. They behave a bit differently than
conventional Blade functions.

Functions are called with `call` statements, and their contents are injected right
into the AST. You can also capture the HTML they render by outputting to a variable,
as described above. Chunks, on the other hand, always return HTML, and they cannot
be called using `call` statements. The only way to render a chunk is to call it
via your code (see example below).

One reason you might define a chunk is to pass it to
[Meteor's](http://meteor.com/) 
[`Meteor.ui.chunk` function](http://docs.meteor.com/#meteor_ui_chunk); however,
chunks can be used for other purposes, as well.
You can also use chunks to work with [`Meteor.ui.listChunk`]
(http://docs.meteor.com/#meteor_ui_listchunk).

Example:

```
chunk header(text)
	h1= text

!= __.chunk.header("Hello")
```

The above example defines a named chunk `header` with one parameter. Then, the chunk
is called by calling the `__.chunk.header` function. When defining a chunk, parameters
are optional, and if you omit the name, the chunk is simply named `last`.

Another example:

```
chunk
	h1 Hello!
div
	!= __.chunk.last()
```

renders as `<div><h1>Hello!</h1></div>`

If you override the `templateNamespace` compiler option, you will need to replace all
instances of the double underscore (`__`) variable with the `templateNamespace` variable.

## Meteor Support

Blade also provides a [Meteor smart package](http://docs.meteor.com/#smartpackages)
under the `meteor` directory. At the time of this writing, Blade is not a part of the
Meteor core smart package list. The easiest thing to do right now is to symlink that
directory into your Meteor packages directory like this:

`ln -s /path/to/.../blade/meteor /path/to/.../meteor/packages/blade`

Of course, the actual path where Blade and Meteor are installed on your system may vary.
You need to replace the above command with the correct paths, as appropriate.

Then, execute `meteor add blade` in your Meteor project directory.

**More documentation and examples for Meteor + Blade can be found [on this wiki page]
(https://github.com/bminer/node-blade/wiki/Using-Blade-with-Meteor)**

Also, Blade allows you to manually call `Meteor.ui.chunk` and `Meteor.ui.listChunk` as you
see fit.

The following example uses chunks and the special `__.chunk` reference. Remember that
unnamed chunks are simply named `last`.

```
chunk
    h1= Session.get("counter")
!=Meteor.ui.chunk(__.chunk.last);
```

Or, how about calling `Meteor.ui.listChunk`?

```
chunk else
	.empty! No records were found
chunk(post)
	- var x = Session.equals("selected", post._id) ? "selected" : "";
	div(class=x)= post.name
!= Meteor.ui.listChunk(Posts.find({tags: "frontpage"}),
	__.chunk.last, __.chunk.else, {
		events: {
			'click': function (event) {
				Session.set("selected", this._id);
			}
		}
	});
```

API
---

`var blade = require('blade');`

### blade.compile(string, [options,] cb)

Asynchronously compiles a Blade template from a string.

- `string` is a string of Blade
- `options` include:
	- `filename` - the filename being compiled (required when using [includes]
		(#dynamic-file-includes) or the `cache` option)
	- `cache` - if true, the compiled template will be cached (defaults to false)
	- `debug` - outputs debugging information to the console (defaults to false)
	- `minify` - if true, Blade generates a minified template without debugging
		information (defaults to true if `cache` option is set; false, otherwise)
		If [UglifyJS](https://github.com/mishoo/UglifyJS) is installed, Blade
		may automatically compress or prettify the template depending on whether
		`minify` is true or false.
	- `includeSource` - if true, Blade inserts the Blade source file directly into
		the compiled template, which can further improve error reporting, although
		the size of the template is increased significantly. (defaults to true if
		and only if `process.env.NODE_ENV` is "development" and minify is false;
		defaults to false, otherwise)
	- `doctypes` - use this Object instead of `blade.Compiler.doctypes`
	- `selfClosingTags` - use this array instead of `blade.Compiler.selfClosingTags`
	- `filters` - use this Object instead of `blade.Compiler.filters`
	- `templateNamespace` - the name of the reserved variable in the view
		(defaults to two underscores: __). Other reserved names are
		[listed here](#variable-names-to-avoid)
	- `basedir` - the base directory where Blade templates are located. This option is
		primarily used by the Blade middleware to allow the Blade runtime to properly
		load file includes.
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
	use this function. [UglifyJS](https://github.com/mishoo/UglifyJS) is now used
	if you have it installed.

### blade.compileFile(filename, [options,] cb)

Asynchronously compile a Blade template from a filename on the filesystem.

- `filename` is the filename
- `options` - same as `blade.compile` above, except `filename` option is always
	overwritten	with the `filename` specified. There is also a `synchronous`
	option that will tell Blade to read and compile the file synchronously
	instead of asynchronously. This option, while documented, is not recommended.
- `cb` - same as `blade.compile` above

### blade.renderFile(filename, options, cb)

Convenience function to asynchronously compile a template and render it.

- `filename` is the filename
- `options` - same as `blade.compileFile` above. This object is also passed
	to the view, so it should also contain your view's local variables.
	A few [reserved local variables](#variable-names-to-avoid) are removed
	before passing the locals to the view.
- `cb` - a function of the form `function(err, html)`

### blade.middleware(sourcePath, options)

Express middleware for serving compiled client-side templates to the browser.
For example, if you visit the URL "/views/homepage.blade" on your server, you
can compile the view stored at `sourcePath + "/homepage.blade"`

- `sourcePath` - the path on the server where your views are stored
- `options` include:
	- `mount` - the URL path where you can request compiled views (defaults to
		"/views/")
	- `clientNamespace` - the variable where downloaded client-side templates
		are stored (defaults to "blade.templates"). `blade.templates` is
		not defined by the Blade runtime, so be sure to define it yourself.
	- `clientCache` - turns on client-side caching of views (defaults to
		`process.env.NODE_ENV == "production"`). Caching works until the user
		navigates to another page. Then, you have to rely on the middleware
		to do things like [weak and strong caching]
		(https://developers.google.com/speed/docs/best-practices/caching).
	- `compileOptions` - options passed to `blade.compile()`. Defaults to:

```javascript
{
	'cache': process.env.NODE_ENV == "production",
	'minify': process.env.NODE_ENV == "production",
	'includeSource': process.env.NODE_ENV == "development"
};
````

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

Here is a sample Express application that uses Blade for server-side and client-side
templates:

```javascript
var express = require('express'),
	blade = require('blade');
var app = express.createServer();
app.use(blade.middleware(__dirname + '/views') );
app.use(express.static(__dirname + "/public") );
app.set('views', __dirname + '/views');
app.set('view engine', 'blade');
app.get('/', function(req, res, next) {
	res.render('homepage');
});
app.listen(8000);
```

Browser Usage
-------------

The Blade compiler doesn't work on browsers yet, but the runtime should work
on every browser. That means that you can compile your templates on the server
and serve them up to any browser. Blade provides a built-in Express middleware
to do just that (see above).

Once you have the middleware setup, you can now serve your compiled Blade views
to the client. Simply include the blade-runtime.js file in your `<script>`
tags, and then call `blade.runtime.loadTemplate`.

### blade.runtime.loadTemplate(filename, [compileOptions,] cb)

- `filename` - the filename of the view you wish to retrieve, relative to the
	`sourcePath` you setup in the Blade middleware.
- `compileOptions` - arguments to be passed to the compiler (these are ignored
	for now).
- `cb` - your callback of the form `cb(err, tmpl)` where `tmpl` is your compiled
	Blade template. Call the template like this:
	`tmpl(locals, function(err, html) {...});`

Your template will be stored in `blade.templates` or whatever you put as the
`clientNamespace` when you setup the Blade middleware. In addition, if
`clientCache` is set in the Blade middleware, then your templates will be stored
at `blade.cachedViews`.

Yes, included files work, too. Like magic.

Example client-side JavaScript:

```javascript
blade.templates = {};
blade.runtime.loadTemplate("homepage.blade", function(err, tmpl) {
	tmpl({'users': ['John', 'Joe']}, function(err, html) {
		console.log(html); //YAY! We have rendered HTML
	});
});
```

As a side note, you can override the `blade.runtime.loadTemplate` function with
your own implementation.

Simple Example
--------------

The following Blade document ...

```blade
!!! 5
html
	head
		title Blade
	body
		#nav
			ul
				- for(var i in nav)
					li
						a(href=nav[i])= i
		#content.center
			h1 Blade is cool
```

... compiles to this JavaScript function ...

```javascript
function tmpl(locals,cb,__){var __=__||[];__.r=__.r||blade.runtime,__.blocks=__.blocks||{},__.func=__.func||{},__.locals=locals||{};with(__.locals){__.push("<!DOCTYPE html>","<html",">","<head",">","<title",">",__.r.escape("Blade"),"</title>","</head>","<body",">","<div",' id="nav"',">","<ul",">");for(var i in nav)__.push("<li",">","<a"),__.r.attrs({href:{val:nav[i],escape:!0}},__,this),__.push(">",__.r.escape(i),"</a>","</li>");__.push("</ul>","</div>","<div",' id="content"',' class="center"',">","<h1",">",__.r.escape("Blade is cool"),"</h1>","</div>","</body>","</html>"),__.inc||__.r.done(__)}cb(null,__.join(""),__)}
```

... now you call the function like this...

```javascript
tmpl({
	'nav': {
		'Home': '/',
		'About Us': '/about',
		'Contact': '/contact'
	}
}, function(err, html) {
	if(err) throw err;
	console.log(html);
});
```

... and you get this:

```html
<!DOCTYPE html>
<html>
	<head>
		<title>Blade</title>
	</head>
	<body>
		<div id="nav">
			<ul>
				<li><a href="/">Home</a></li>
				<li><a href="/about">About Us</a></li>
				<li><a href="/contact">Contact</a></li>
			</ul>
		</div>
		<div id="content" class="center">
			<h1>Blade is cool</h1>
		</div>
	</body>
</html>
```

Implementation Details
----------------------

The Blade parser is built using [PEG.js](https://github.com/dmajda/pegjs).
Thanks to the PEG.js team for making this project much easier than I had
anticipated! To modify the parser, simply change `./lib/parser/blade-grammer.pegjs`,
and the new parser will be automatically built the next time you run tests.

To install all devDependencies, just do: `npm link` or install manually.
To run tests, ensure devDependencies are installed, then run: `npm test`

Also, I'd like to mention here that the Blade compiler and Blade runtime are rather
closely coupled. Unfortunately, that means that templates compiled with an older
Blade compiler might not be compatible with a newer runtime and vice versa.
To avoid issues, be sure that your Blade templates were compiled with the compiler of
the same version as the runtime on which they will run. If you think this is too
inconvenient, please feel free to complain, but I probably will ignore you. :)

Benchmarks
----------

See the [Benchmark wiki page](https://github.com/bminer/node-blade/wiki/Benchmarks)
for more information.

License
-------

See the [LICENSE.txt file](https://raw.github.com/bminer/node-blade/master/LICENSE.txt).
