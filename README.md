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

**NOTE:** Users updating to Blade 3.0.0beta5 may notice that [chunk](#chunks) support
has been removed.

<img src="http://www.empireonline.com/images/features/100greatestcharacters/photos/47.jpg"
alt="Blade" width="150" height="169"/>

"Blade's blood is the key" :P Sorry... I had to...

This is *NOT* the Blade templating engine developed by [Laravel](http://laravel.com/).
Laravel Blade was added in Sept, 2011; whereas, I did not begin development on Blade
until May, 2012. Nevertheless, I still blame Laravel for choosing the same name
and for creating any confusion. :)

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
- [Browser Usage](#browser-usage)
- [A Simple Example](#simple-example)
- [Syntax Highlighting](#syntax-highlighting) for your favorite text editor
- [Plugins](#plugins)
- [Meteor Support](#meteor-support)
- [Implementation Details](#implementation-details)
- [Benchmarks](#benchmarks)
- [License](#license)

Why use Blade instead of Jade?
-----------------------

- Jade is an ornamental stone. Blade is a badass vampire hunter.
- **Client-side templates** can be served to the browser, no problem.
	See [Browser Usage](#browser-usage) and [Blade Middleware]
	(#blademiddlewaresourcepath-options) for more info.
- **Meteor support** - Blade works well with [Meteor](http://meteor.com/) and Spark.
	See the	[documentation below](#meteor-support).
- **Compatibility** - The language syntax of Blade is very similar to Jade's. Jade is
	an awesome templating language, and if you are already familiar with it, getting
	started with Blade should take you very little time.
- **[Smarter](#fileIncludeDetails) file includes** - 
	Files compiled in Blade can be much smaller than Jade files when you are using file
	includes because file includes happen at runtime instead of at compile-time. If you
	re-use the same included file across multiple views, the included file does not need to
	be reloaded multiple times.
- **[Blocks](#blocks) are more flexible.** We removed features from Jade like explicit
	template inheritance and then added features like blocks and parameterized blocks.
	You might find our idea of a block to be similar to Jade's, but just wait until you
	realize how much more flexible they are.
- **Just [Functions](#functions), not mixins or partials.** In Blade, there are no "mixins"
	or partial templates. There are only functions, and they work just like regular JavaScript
	functions that you've come to know and love. You can put your functions into separate
	files and include them into other templates, you can take advantage of the `arguments`
	Array-like Object, or whatever you want!
- **Other cool [features](#features)** For example, Blade provides built-in syntax
	to capture content rendered by a function and store it into a variable within your
	view template. This allows you to pass rendered HTML content to another function.
	Checkout the [list of features](#features) below for a more complete list of features

```
	Jade		vs.		Blade
```
<img src="http://i.imgur.com/je5Wd.png" alt="Jade" height="169"/> &nbsp;&nbsp; <img src="http://www.empireonline.com/images/features/100greatestcharacters/photos/47.jpg" alt="Blade" width="150" height="169"/>

OK... it's admittedly not as funny as I thought it would be. But, I tried.

Features
--------

- Write extremely readable [short-hand HTML](#syntax)
- Insert escaped and unescaped text and vanilla JavaScript code
- Code and text are escaped by default for security/convenience
- [Functions](#functions) (like Jade mixins)
- [Dynamic file includes](#dynamic-file-includes)
- [Regular blocks](#blocks) and [Parameterized blocks](#parameterized-blocks)
	(aids in supporting template inheritance)
- [True client-side template support](##browser-usage) with caching, etc.
- Supports Express.JS - just write `app.set("view engine", "blade");`
- [HTML Comments and block comments](#comments)
- [Text filters](#text-filters)
- [String interpolation](#interpolation)
- Nice error reporting to help you debug your broken templates
- Command-line tool to compile/render templates (try `blade --help`)
- [Meteor smart package](#meteor-support)
- Write DOM [event handlers right into your views](#event-handlers)
- Cool plugins (including [Live UI](https://github.com/bminer/node-blade/wiki/Live-UI-Blade-Plugin))

Project Status
--------------

I'd say that Blade itself is **stable**. There are very few (if any)
[known issues](https://github.com/bminer/node-blade/issues), and I think that Blade
is ready for production environments. I use Blade for many of my projects.
Meteor support for Blade is still in a **beta** or **release candidate**
stage until the final release of Blade 3.0.0. Please test Blade with Meteor
and report any bugs and/or weird behavior.

If you find a bug, please [report it here]
(https://github.com/bminer/node-blade/issues). If you include the Blade code
that failed along with the expected HTML output, that is always splendid. Full
stack traces for Errors are quite nice, too.

By all means, please feel free to submit pull requests for new features,
new tests, or whatever! For big changes, say ~100 lines of code, you
might want to contact me first or submit an issue before getting started.

Installation
------------

for Node (via npm): `sudo npm install -g blade`

Runtime for Browsers: `wget https://raw.github.com/bminer/node-blade/master/lib/runtime.js`
Minified runtime is about 7-8 KB, uncompressed.

Using Blade in a Meteor project? Check out [Meteor support](#meteor-support).

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

Tag attributes?  Yep, they work pretty much like Jade, too.  Even string [interpolation]
(#interpolation) works.
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

Boolean attributes are allowed, as well. If the attribute value is boolean `true`, then
the attribute is set; if the attribute value is boolean `false`, then the attribute is
ignored entirely.  For example:

`input(type="text" checked=true)` renders as: `<input type="text" checked="checked"/>`.

Or... you can write it [HTML 5 style](http://dev.w3.org/html5/html-author/#empty-attr) like this:

`input(type="text" checked)` which renders as: `<input type="text" checked="checked"/>`.

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

#### Escaping Blade keywords

Finally, you can start a tag name with a bashslash to escape Blade keywords.
Normally, `include test` would include a file, but `\include test` renders as:

```xml
<include>test</include>
```

This allows you to be flexible with tag names, so you are not restricted to rendering
HTML, for example. You can render any XML document with Blade.

### Indenting

Simply intent to put content inside of a tag.

You can indent with any number of spaces or with a single tab character. The
only rule is to be consistent within a given file.
Jade gives you a lot of weird indent flexibility. Blade, by design, does not.

```
html
	head
		title Welcome
	body
		#content
```

renders as:

```html
<html>
	<head>
		<title>Welcome</title>
	</head>
	<body>
		<div id="content"></div>
	</body>
</html>
```

### Text

Simply place content after the tag like this:

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

<a name="interpolation"></a>
String interpolation is supported for text blocks (and text attributes and text filters).
Use `#{var_name}` notation, and anything between the curly braces is treated as
vanilla JavaScript code.

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

Interpolation comes in two forms: escaped and unescaped.  If you want escaped (i.e.
the resulting string has &gt; &lt; &quot; and other HTML characters escaped), use
`#{foo}`; if you want unescaped, use `!{foo}`.  If you literally want to insert
"#{foo}" in your text, just prepend with a backslash like this: `\#{foo}`.

#### Whitespace between tags

In Blade, whitespace is only added when it's explicitly needed.
For example:

```blade
input(type="text")
input(type="text")
```

renders as: `<input type="text"><input type="text">`

If you need something like...
`<input type="text"> <input type="text">` (notice the space between the elements),
then you have some options...

One way is to use a text block:

```blade
input(type="text")
|  
input(type="text")
```

Notice on line 2 that the `|` is followed by **two** spaces.

Another way is to prepend a tag with a `<`:

```blade
input(type="text")
<input(type="text")
```

Or append the tagname with a `>`:

```blade
input>(type="text")
input(type="text")
```

Whatever you like!

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
filter returns text in `#{var_name}` or `!{var_name}` notation, then anything
between the curly braces is replaced with vanilla JavaScript code. To avoid this
behavior, text filters can either escape the `#{stuff}` with a backslash, or it
can set its `interpolation` property to `false`.  See `lib/filters.js` for some
examples if you want to write your own filter.

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

Put the doctype at the top of your Blade files, please. Please refer to [doctypes.js]
(https://github.com/bminer/node-blade/blob/master/lib/doctypes.js) for the list of built-in
doctypes.

You can modify the list of built-in doctypes through the API, if you insist.

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
		script(src="/dear-microsoft-plz-stop-making-browsers-kthxbye.js")
```

renders as:

```html
<head><!--[if lt IE 8]><script src="/dear-microsoft-plz-stop-making-browsers-kthxbye.js"></script><![endif]--></head>
```

To comment out entire sections of Blade code, you can use non-rendering block comments
with a text block.

```
//-
	|
		anything can go here... Blade code, JavaScript code, whatever...
		just make sure that the indenting is right.
```

or... even better... just use C-style block comments.  Begin with `/*` to generate
a non-rendering block comment, or begin with `/**` to generate a regular comment.
End the comment with `*/`.  These comments are not parsed like `//` comments.

```
/* h1 Testing */
/**
#header
	h3 Notice that this chunk of Blade code is not parsed
*/
```

renders as:

```html
<!--
#header
	h3 Notice that this chunk of Blade code is not parsed
-->
```

### Foreach

The exact syntax of a foreach region is the word "foreach", followed by the variable
name of the JavaScript Array or [Cursor Object](http://docs.meteor.com/#observe),
optionally followed by "as" and an item alias.  Finally, it is possible to follow the
foreach region by an "else" block, which is only rendered if there were no items in the
collection.

As a side note, a Cursor Object, as described above, is an Object with an `observe()`
method, as described by [`cursor.observe(callbacks)`](http://docs.meteor.com/#observe)

For example:

```
ul
	foreach users as user
		li #{user.firstName} #{user.lastName} (#{user.age})
	else
		li No users were found
```

Assuming that `users` is an Array, the above would produce the same as:

```
ul
	- for(var i = 0; i < users.length; i++)
		- var user = users[i];
		li #{user.firstName} #{user.lastName} (#{user.age})
	- if(users.length == 0)
		li No users were found
```

The foreach region is preferred over the example above not only because of readability
and brevity, but because it also provides Blade with the ability to better integrate
with live page updating engines (specifically [Meteor](http://www.meteor.com/) and 
[Spark](https://github.com/meteor/meteor/wiki/Spark)).
That is, if the live page update engine supports tracking reactive collections, the most
efficient DOM operations may occur to update the view's results in-place, without
re-rendering the entire Blade template.

Blocks don't work well inside of foreach regions.  Specifically, while inside of a
foreach region: (1) you cannot access blocks declared outside of the foreach region;
and (2) blocks declared inside of the foreach region are not accessible once you leave
the foreach region. If this causes a problem, just use regular JavaScript for loops.

### Event Handlers

You can write inline event handlers right into your Blade templates.
Here's an example:

```
form(method="post" action="/login")
	input(type="text" name="username")
		{change}
			//javascript code goes here
			//e refers to the browser's event Object
			//e.currentTarget refers to this DOM element
			validate(e.currentTarget.value);
	input(type="password" name="password")
		{change}
			checkPasswordStrength(this.value);
```

The above code will automatically register the 'onchange' event handler with
the corresponding `input` tags.

As shown in the example, your event handler may reference `e` (the browser's
event Object). Be aware that every browser's event Object might be slightly
different, especially in legacy browsers.

It is also worthwhile to note: If you are rendering the template in the browser
(i.e. using client-side templates), your event handler will have access to the
view's locals due to JavaScript closures. This can be rather convenient. :)

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

This will insert "file.blade" right into the current view at runtime, as if the contents
of the included file were copied right into the current view.

If you don't know the name of the file to be included until runtime, that's no problem.
The include statement can also be followed by the name of a JavaScript variable
containing the filename to be included.  These are called *dynamic filename includes*.

```
- var filename = "file.blade"
include filename
```

**CAUTION:** When using *dynamic filename includes* in the browser, be sure that you
have properly loaded all views that might be included into the browser's cache before
executing the view containing the *dynamic filename include*. See the [implementation
details](#fileIncludeDetails) for a more detailed explanation.

If you do not specifiy a file extension, `.blade` will be appended to your string
internally.

You may also place an `include` inside of a `function` or `block`.

Finally, you can specify which local variables should be passed to the included view
template by using the `exposing` keyword.  By default, Blade will pass the parent's
local variables to the included template; however, when using the `exposing` keyword,
you can specify exactly which variables are to be exposed to the included template.

For example:

```
- header = "Header: 1, 2, 3"
- text = "This is some text: 1, 2, 3"
- for(var i = 0; i < 10; i++)
	include "foobar" exposing i, text
```

In the example above, variables `i` and `text` are exposed to "foobar.blade";
the `header` variable will not be accessible from "foobar.blade".

Note: when using Meteor or another live page update engine, [preserve and constant
regions](#preserve-and-constant-regions) only work properly in an included template
if and only if the template does *not* define any blocks.  In other words, don't
include a template that declares blocks **and** has some preserve/constant regions.

### Blocks

Blocks allow you to mark places in your template with code that may or may not be
rendered later.

You can do a lot with blocks, including template inheritance, etc. They behave quite
differently from Jade.

**STOP!** If you are planning on using blocks with Meteor, beware! First of all,
blocks might not make much sense when building Meteor applications, and furthermore,
blocks don't work well with reactive HTML. For more information about why blocks are
not recommended for use with Meteor, checkout [this section]
(https://github.com/bminer/node-blade/wiki/Using-Blade-with-Meteor#wiki-block_limitations)
of the [Using Blade with Meteor wiki page]
(https://github.com/bminer/node-blade/wiki/Using-Blade-with-Meteor).

OK. I digress...

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
!!! 5
html
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
<!DOCTYPE html>
<html>
	<head>
		<meta/>
		<title>Page Title</title>
		<script type="text/javascript"></script>
		<title>Page Title</title>
	</head>
	<body>
		<h1>Hello</h1>
	</body>
</html>
```

Obviously, the example above is rather contrived, but it shows how blocks work.
A more [realistic example of using blocks](#template-inheritance) is below.

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
!!! 5
html
	head
		block title(pageTitle)
			title=pageTitle
		block scripts
			script(type="text/javascript" src="/js/jquery.min.js")
			script(type="text/javascript" src="/js/jquery-ui.min.js")
		block stylesheets
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

If you render layout.blade, you get:

```html
<!DOCTYPE html>
<html>
	<head>
		<script type="text/javascript" src="/js/jquery.min.js"></script>
		<script type="text/javascript" src="/js/jquery-ui.min.js"></script>
	</head>
	<body></body>
</html>
```

but if you render homepage.blade, you get:

```html
<!DOCTYPE html>
<html>
	<head>
		<title>Homepage</title>
		<script type="text/javascript" src="/js/jquery.min.js"></script>
		<script type="text/javascript" src="/js/jquery-ui.min.js"></script>
	</head>
	<body>
		<h1>Hello, World</h1>
	</body>
</html>
```

The idea here is that you can derive many pages in a website from a basic
template. In this case, `layout.blade` provides the generic template for
each page in your website. `homepage.blade` simply uses the layout and
modifies some blocks to generate the actual page.

### Preserve and constant regions

Preserve and constant regions are only useful when using a live page update engine.
Anything in a "constant" region is marked by the live page update engine as a
region that is not subject to re-rendering.

Example of constant region (using Meteor):

```
- console.log("Rendering header")
h1 This is a header
constant
	- console.log("Rendering constant...")
	p The current user is: #{Session.get("user")}
```

In the above example, "Rendering constant..." will only be printed once to the
console, even if the Session variable changes.

"Preserve" regions can be used to preserve certain DOM elements during re-rendering,
leaving the existing element in place in the document while replacing the surrounding
DOM nodes.  This means that re-rendering a template need not disturb text fields,
iframes, and other sensitive elements it contains.

Example of preserve region (using Meteor):

```
form
	preserve {"input[id]": function (node) {return node.id;}}
		label First Name
		input#firstName(type="text")
		label Last Name
		input#lastName(type="text")
```

The example above will preserve the `<input>` DOM elements when the template is
re-rendered. Notice that the code following the "preserve" keyword
`{"input[id]": function (node) {return node.id;}}` is passed
directly to the Landmark's "preserve" option (see [the Meteor documentation]
(http://docs.meteor.com/#template_preserve) for more info).

You must specify how elements in a preserve region are to be preserved. To do
this, you need to tell Blade how to uniquely identify each element that you
want to preserve in the block. In the example above, `<input>` fields with
`id` attributes are preserved, and their `id` is used to uniquely identify
them.

The following is an example of preserving a single element. Since there is only one
element in this preserve block, identifying it with the `*` selector is acceptable.

```
preserve ["*"]
	input(type="text")
```

If the "preserve" keyword is not followed by any code, then nothing is preserved.

### Isolates

Isolates are only useful when using a live page update engine. Creating an isolate
ensures that if data dependencies relating only to that isolate are updated, then only
the part of the template within isolate will be re-rendered. All other parts of the
Blade template will *not* be re-rendered.

Example (using Meteor):

```
- console.log("Rendering header...")
h1 This is a header
isolate
	p The current user is: #{Session.get("user")}
```

In the example above, "Rendering header..." will be printed to the console when the
whole template is rendered, but if the reactive variable is updated using
`Session.set("user", ...)`, only the isolate will be re-rendered. In this case,
nothing will print to the console.

Note: As with Blade functions, any [blocks](#blocks) defined within an isolate will be
deleted and unaccessible outside the isolate block.

See [Reactivity isolation](http://docs.meteor.com/#isolate) on the Meteor documentation
for more details.

### Chunks

Chunks are *no longer supported* as of Blade 3.0.0beta. You should use
[isolates](#isolates) instead.

API
---

`var blade = require('blade');`

### blade.compile(string, [options,] cb)

Compiles a Blade template from a string.

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
	- `doctypes` - an Object to specify additional doctypes or overwrite any built-in
		ones. This object is merged with `blade.Compiler.doctypes`
	- `selfClosingTags` - Array of self-closing tags to be used instead of
		`blade.Compiler.selfClosingTags`
	- `filters` - an Object to specify additional filters or overwrite any built-in
		ones. This object is merged with `blade.Compiler.filters`
	- `templateNamespace` - the name of the reserved variable in the view
		(defaults to two underscores: __). Other reserved names are
		[listed here](#variable-names-to-avoid)
	- `basedir` - the base directory where Blade templates are located. This option is
		primarily used by the Blade middleware to allow the Blade runtime to properly
		load file includes.
	- `middleware` - option reserved for the Blade middleware. Passing `true` tells
		the compiler that the template to be compiled is for client-side use, allowing
		it to mask the basedir (see issue #112 for details).
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
provide any line number or other information about the error. See issue #40 for
more details.

You can render a compiled template by calling the function: `tmpl(locals, cb)`

- `locals` are the local variables to be passed to the view template
- `cb` is a function of the form `function(err, html)` where `err` contains
		any runtime errors and `html` contains the rendered HTML.

In addition, a compiled template has these properties and methods:

- `template` - a function that also renders the template but accepts 3 parameters:
	`tmpl.template(locals, runtime, cb)`. This simply allows you to use a custom
	runtime environment, if you choose to do so.
- `filename` - the filename of the compiled template (if provided)
- `dependencies` - an array of files that might be included by this template at
	runtime, relative to the path of this template
- `unknownDependencies` - if true, this template uses *dynamic filename includes*
	and may include any file at any time.
- `reldir` - the path to this template, relative to the base/root path
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
	instead of asynchronously.
- `cb` - same as `blade.compile` above

### blade.renderFile(filename, options, cb)

Convenience function to compile a template and render it.

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
	- `runtimeMount` - the URL path where the minified Blade runtime is served
		to the browser (defaults to "/blade/blade.js"). Use `null` to disable
		this functionality.
	- `pluginsMount` - the URL path where Blade plugins will be served to the
		browser (defaults to "/blade/plugins/"). Use `null` to disable this
		functionality.
	- `returnErrors` - if true, compilation errors are exposed to the client
		(i.e. passed to the callback function that was passed to
		`blade.Runtime.loadTemplate`); if false, compilation errors are passed
		to the [error-handling middleware]
		(http://expressjs.com/guide.html#error-handling). Defaults to
		`process.env.NODE_ENV == "development"` if unspecified.
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
app.use(blade.middleware(__dirname + '/views') ); //for client-side templates
app.use(express.static(__dirname + "/public") ); //maybe we have some static files
app.set('views', __dirname + '/views'); //tells Express where our views are stored
app.set('view engine', 'blade'); //Yes! Blade works with Express out of the box!
app.get('/', function(req, res, next) {
	res.render('homepage');
});
app.listen(8000);
```

Browser Usage
-------------

The Blade runtime should work on every browser, and since Blade provides an
Express middleware for serving compiled templates to the browser ([see above]
(#blademiddlewaresourcepath-options)), rendering Blade templates in the browser
is a breeze.

Once you have the middleware setup, you can now serve your compiled Blade views
to the client. Simply include the /blade/blade.js file in your `<script>`
tags, and then call `blade.Runtime.loadTemplate`.

### blade.Runtime.loadTemplate(filename, cb)

- `filename` - the filename of the view you wish to retrieve, relative to the
	`sourcePath` you setup in the Blade middleware.
- `cb` - your callback of the form `cb(err, tmpl)` where `tmpl` is your compiled
	Blade template. Call the template like this:
	`tmpl(locals, function(err, html) {...});`

Your template will be stored in `blade.cachedViews` and will be cached until the
user reloads the page or navigates to another page.

Yes, included files work, too. Like magic.

Example client-side JavaScript:

```javascript
blade.Runtime.loadTemplate("homepage.blade", function(err, tmpl) {
	tmpl({'users': ['John', 'Joe']}, function(err, html) {
		console.log(html); //YAY! We have rendered HTML
	});
});
```

Additionally, you can set `blade.Runtime.options` to control how the templates are
loaded:

- `blade.Runtime.options.mount` - the URL path where you can request compiled views
	(defaults to "/views/")
- `blade.Runtime.options.loadTimeout` - the maximum number of milliseconds to wait
	before `loadTemplate` throws an error (defaults to 15 seconds).

As a side note, you can override the `blade.Runtime.loadTemplate` function with
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
function tmpl(locals,cb,__){__=__||[],__.r=__.r||blade.Runtime,__.func||(__.func={},__.blocks={}),__.locals=locals||{};with(__.locals){__.push("<!DOCTYPE html>","<html",">","<head",">","<title",">","Blade","</title>","</head>","<body",">","<div",' id="nav"',">","<ul",">");for(var i in nav)__.push("<li",">","<a"),__.r.attrs({href:{v:nav[i],e:1}},__),__.push(">",__.r.escape(i),"</a>","</li>");__.push("</ul>","</div>","<div",' id="content"',' class="center"',">","<h1",">","Blade is cool","</h1>","</div>","</body>","</html>")}__.inc||__.r.done(__),cb(null,__.join(""),__)}
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

... and you get this (indented for readability):

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

Syntax Highlighting
-------------------

There are a few resources available to get syntax highlighting for your favorite text
editor.

- [Sublime Text 2](http://www.sublimetext.com/2):
	https://github.com/kenvunz/js-blade-package (maybe thank kenvunz
	[here](https://github.com/bminer/node-blade/issues/78))
- [Textmate](https://github.com/textmate/textmate): the syntax highlighting files for
	Sublime Text 2 may also be compatible with Textmate? See the link above.
- [Notepad++](http://notepad-plus-plus.org/): [notepad++.xml]
	(https://github.com/bminer/node-blade/blob/master/syntax-highlighting/notepad%2B%2B.xml)

If you find (or create yourself) syntax highlighting plugins for other text editors,
please write me, and I will post the links here. Or, simply submit a pull request.

Plugins
-------

**Live UI**

Blade provides a Live UI plugin that allows Blade to use the [Spark live page update
engine](https://github.com/meteor/meteor/wiki/Spark) independently from Meteor.

Live UI provides automatic two-way synchronization between your models and views on a
given web page.  That is, when data in your Model is updated, the rendered Blade views
on the client's browser are automatically updated with the new content, and similarly,
when a Blade view is rendered in the browser, the Blade [event handlers](#event-handlers)
can update data in the model.

**Complete documentation for the Live UI plugin (including several examples)
can be found on the [Live UI Plugin wiki page]
(https://github.com/bminer/node-blade/wiki/Live-UI-Blade-Plugin).**

**definePropertyIE8**

This plugin is a prerequisite for the Live UI plugin if you plan on using Live UI in
Internet Explorer 8.

Meteor Support
--------------

Blade provides a [Meteor smart package](http://docs.meteor.com/#smartpackages)
under the `meteor` directory. At the time of this writing, Blade is not a part of the
Meteor core smart package list.

Fortunately, an [Atmosphere smart package](https://atmosphere.meteor.com/package/blade)
is available, which you can install using Meteorite.

To install Blade's smart package from Atmosphere, simply [install Meteorite]
(https://atmosphere.meteor.com/wtf/app), navigate to your Meteor project directory,
and type `mrt add blade`. Then, don't forget to run your project using `mrt` instead
of `meteor`.

Also check out these Blade features that work well with Meteor:

- [Preserve and constant regions](#preserve-and-constant-regions)
- [Isolates](#isolates)
- [Foreach](#foreach)

**More documentation and examples for Meteor + Blade can be found [on this wiki page]
(https://github.com/bminer/node-blade/wiki/Using-Blade-with-Meteor).**

Implementation Details
----------------------

**PEG.js**

The Blade parser is built using [PEG.js](https://github.com/dmajda/pegjs).
Thanks to the PEG.js team for making this project much easier than I had
anticipated! To modify the parser, simply change `./lib/parser/blade-grammer.pegjs`,
and the new parser will be automatically built the next time you run tests.

**Running tests**

To install all devDependencies, just do: `npm link` or install manually.
To run tests, ensure devDependencies are installed, then run: `npm test`

**Compiler-runtime relationship**

Also, I'd like to mention here that the Blade compiler and Blade runtime are rather
closely coupled. Unfortunately, that means that templates compiled with an older
Blade compiler might not be compatible with a newer runtime and vice versa.
To avoid issues, be sure that your Blade templates were compiled with the compiler of
the same version as the runtime on which they will run. If you think this is too
inconvenient, please feel free to complain, but I probably will ignore you. :)

<a name="fileIncludeDetails"></a>
**File Includes**

Included Blade templates MUST be loaded synchronously, and if this is not possible, an
error will be thrown.  Obviously, when rendering views on the server, this is not a
problem since Node provides synchronous file system calls; however, on the client, it is
only possible to include a file synchronously when the file is already in the browser's
cache.  When the name of the file to be included is known at compile-time (i.e. you are
not using a *dynamic filename include*), the compiler will notify the Blade middleware
of a particular view's dependencies.  This allows the client-side template loader to
also load and cache any dependent views in advance, preventing any issues from occurring.
Nevertheless, when *dynamic filename includes* are used, the compiler has no way of
determining which views will be included at runtime, and if a dynamically included view
is not loaded into the browser's cache when the include statement is reached, the
included view must be be loaded asynchronously and, as such, an error will be thrown.

Loading and compiling files synchronously may temporarily reduce your application's
responsiveness, but because compiled views are often cached, this is not really much
of an issue.

**Event Handlers**

Event handlers in Blade work by injecting the event handler function as an HTML comment
directly before the bound element.  Then, the appropriate event attribute (i.e.
onclick, onchange, etc.) on the element is set to call `blade.Runtime.trigger`.  The
`trigger` function basically grabs the HTML comment, passes the contents through eval(),
and binds the event handler directly to the element.  This means that the event handlers
work on templates rendered on the browser or on the server. Everything gets wired up the
first time that the event occurs on the browser.

The Blade runtime also keeps track of any event handlers bound to a specific element
by assigning each element an 'id' attribute, if necessary.  When the view has
finished rendering, the Blade runtime will pass a bunch of information (blocks,
functions, or event handlers that were defined, etc.) to the 3rd (undocumented) argument
of the render callback function.  If you are rendering Blade templates on the browser,
you can access the list of event handlers and bind the defined event handler directly
to the element by looking up the element by its 'id' instead of letting the `trigger`
function do its magic.  The advantage of binding direclty to the defined event handler is
that (thanks to closures) you can still reference the locals that were passed to your
view and modify them, as needed... directly from your event handler. This allows your view
code to automatically synchronize with your model, providing one-way view-to-model
synchronization capabilties. Very cool!  For examples of this and for more information,
check out the [Live UI plugin]
(https://github.com/bminer/node-blade/wiki/Live-UI-Blade-Plugin).

Benchmarks
----------

See the [Benchmark wiki page](https://github.com/bminer/node-blade/wiki/Benchmarks)
for more information.

License
-------

See the [LICENSE.txt file](https://raw.github.com/bminer/node-blade/master/LICENSE.txt).
