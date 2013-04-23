/** Blade language grammar for use with PEG.js
	(c) Copyright 2012. Blake Miner. All rights reserved.	
	https://github.com/bminer/node-blade
	http://www.blakeminer.com/
	
	See the full license here:
		https://raw.github.com/bminer/node-blade/master/LICENSE.txt

Sorry, the Blade language is not exactly simple, but it's better than looking
through parser code, IMHO. Read all about PEG.js syntax here:
	http://pegjs.majda.cz/documentation

Sample document (indented for readability):
	html
		head(foo="bar" bar="foo")
		//foobar
			.dude Test
				| foo
		#foo.foobar(class="yo")
**/

/************** Initializer, start rule, and doctype **************/
{
	//The current indent of the line being parsed
	var indent = 0;
	//The string to be consumed and treated as a single indent token
	var indentToken;
	//The parent node of the node being parsed
	var currentParentNode;
} start =
	doctypes:(doctype:doctype newline {return doctype;})*
	nodes:nodes?
	newline* //Trailing newlines in a file are certainly permitted
	{return {'doctypes': doctypes, 'nodes': nodes};}

nodes =
	first_node:node next_nodes:(newline+ node:node {return node;})*
	{next_nodes.unshift(first_node); return next_nodes;}

doctype "doctype" = 
		"doctype" whitespace? type:text_until_eol {return type;}
	/
		"!!!" whitespace? type:text_until_eol {return type;}

blank_line "blank line" =
	whitespace* & (newline)
	{return {"type": "blank_line"};}

/************** Node rules, which also handles indentation **************/
//Note: each node contains line and col for enhanced error reporting (YAY!)
node =
		include:include
		{
			include.line = line, include.col = column;
			return include;
		}
	/
		render:block_render
		{
			render.line = line, render.col = column;
			return render;
		}
	/
		call:function_call
		{
			call.line = line, call.col = column;
			return call;
		}
	/
		parent:parent_node children:(child_node)*
		{
			currentParentNode = parent.parent;
			delete parent.parent; //Don't need this back-reference anymore
			delete parent._indent; //Don't need this either
			parent.children = parent.children.concat(children);
			parent.line = line, parent.col = column;
			return parent;
		}
	/
		parent:text_block_parent children:(text_block_child)*
		{
			currentParentNode = parent.parent;
			delete parent.parent; //Don't need this back-reference anymore
			delete parent._indent; //Don't need this either
			if(parent[parent.type].length > 0 && children.length > 0)
				parent[parent.type] += "\n";
			parent[parent.type] += children.join("\n");
			parent.line = line, parent.col = column;
			return parent;
		}
	/
		comment:unparsed_comment
		{
			comment.line = line, comment.col = column;
			return comment;
		}
	/
		blank_line

/* Any node that might have children
Each parent node must contain the following properties:
	`_indent` - the level of indentation for the current node
	`children` - an array of child nodes (can be empty)
	`parent` - a reference to the parent node (currentParentNode)
Additionally, the `currentParentNode` must be updated
*/
parent_node =
	parent:parent_node_types {
		parent._indent = indent;
		if(!(parent.children instanceof Array) )
			parent.children = [];
		parent.parent = currentParentNode;
		currentParentNode = parent;
		return parent;
	}

parent_node_types =
		block_modifier
	/
		block
	/
		function_definition
	/
		isolate
	/
		constant
	/
		preserve
	/
		foreach
	/
		foreach_else
	/
		tag
	/
		comment
	/
		code

child_node "child node" =
	newline+ child_indent:indents & {
		return child_indent == currentParentNode._indent + 1;
	} child:node
	{return child;}

/************** Text blocks **************/
text_block_parent =
	parent:text_block_parent_types {
		parent._indent = indent;
		parent.parent = currentParentNode;
		currentParentNode = parent;
		return parent;
	}

text_block_parent_types =
		filter
	/
		line_of_text
	/
		event_handler

//Note: no whitespace is eaten at the beginning of a text block
text_block_child "text block" =
	newline child_indent:indents & {
		return child_indent > currentParentNode._indent;
	} text:text_until_eol?
	{
		//Add overeaten indents back to the text
		var pre = "";
		for(var i = 0; i < child_indent - currentParentNode._indent - 1; i++)
			pre += indentToken;
		return pre + text;
	}

/************** Tag rules **************/
tag "tag" =
	"\\" ?
	prependSpace: "<" ?
	tagName: identifier?
	appendSpace: ">" ?
	id_class: id_class
	attrs: attributes?
	content: tag_content?
	{
		/* Special case: you must specify a tag name, id,
			or at least one class to be a valid tag */
		if(tagName == "" && !id_class.id &&
			id_class.classes.length == 0) return null;
		//Return the tag
		var tag = {
			'type': "tag",
			'name': tagName == "" ? "div" : tagName,
			'id': id_class.id,
			'classes': id_class.classes,
			'attributes': attrs == "" ? {} : attrs,
			'children': []
		};
		if(prependSpace)
			tag.prependSpace = true;
		if(appendSpace)
			tag.appendSpace = true;
		if(content != "")
			tag.children.push(content);
		return tag;
	}

//Can be re-used for other things
id_class =
	classes: ("." without_dot:class {return without_dot;})*
	id: ("#" id)?
	classes2: ("." without_dot:class {return without_dot;})*
	{return {
		'classes': classes.concat(classes2),
		'id': id == "" ? null : id[1]
	};}

class "class" =
	identifier

id "id" =
	identifier

//Attributes are contained within paretheses and separated by a comma and/or spaces
attributes "attribute list" =
		"()" {return {};}
	/
		"("
			newline_token* whitespace*
			first_attr:attribute
			next_attrs: (attribute_separator newline_token* whitespace* attr:attribute {return attr;})*
			newline_token* whitespace*
		")"
		{
			var attrs = {};
			attrs[first_attr.name] = first_attr.value;
			for(var i in next_attrs)
				attrs[next_attrs[i].name] = next_attrs[i].value;
			return attrs;
		}

attribute_separator =
	[, \t\r\n]

attribute "attribute" =
		name:identifier escape:"!"? "=" value:quoted_string & ( ")" / attribute_separator)
		{return {'name': name, 'value': {'escape': escape != "!", 'text': value} }; }
	/
		name:identifier escape:"!"? "=" value:attribute_code
		{return {'name': name, 'value': {'escape': escape != "!", 'code': value} }; }
	/
		name:identifier & ( ")" / attribute_separator)
		{return {'name': name, 'value': {'escape': false, 'text': name} }; }

attribute_code =
		code:[^, \t\r\n\(\)\"\']+ moreStuff:attribute_code?
		{return code.join("") + moreStuff;}
	/
		str:quoted_string moreStuff:attribute_code?
		{return JSON.stringify(str) + moreStuff;}

tag_content "tag content" =
		& [!=] content:content_prefix whitespace? data:text_until_eol
		{content[content.type] = data; return content;}
	/
		content:content_prefix whitespace data:text_until_eol
		{content[content.type] = data; return content;}

/************** Block rules (yes, blocks rule!) **************/
block "block definition" =
	"block" whitespace+ name:identifier whitespace* params:parameters?
	{return {'type': 'block', 'name': name, 'parameters': params == "" ? null : params};}

block_render "block render" =
	"render" keyword:(whitespace keyword:block_modifier_keyword {return keyword;})?
		(whitespace "block")? whitespace+ name:identifier whitespace*
		args:(
			"(" args:matched_parentheses? ")" {return args;}
		)?
	{return {'type': 'render', 'name': name, 'arguments': args,
		'behavior': keyword == "" ? "append" : keyword}; }

block_modifier "block modifier (i.e. append, prepend, or replace)" =
	keyword:block_modifier_keyword (whitespace "block")? whitespace+
		name:identifier whitespace* params:parameters?
	{return {'type': keyword, 'name': name, 'parameters': params == "" ? null : params};}

block_modifier_keyword =
	"append" / "prepend" / "replace"

/************** Functions **************/
function_definition "function definition" =
	"function" whitespace+ name:identifier whitespace* params:parameters?
	{return {'type': 'function', 'name': name, 'parameters': params == "" ? null : params};}

function_call "function call" =
		"call" (whitespace "function")? whitespace+
			output:(
				var_name:identifier whitespace* append:"+"? "=" whitespace*
				{return {'to': var_name, 'append': append != ""}; }
			)
			name:identifier whitespace*
			args:(
				"(" args:matched_parentheses? ")" {return args;}
			)?
			id_class:id_class
		{
			var func = {'type': 'call', 'name': name, 'arguments': args,
				'id': id_class.id, 'classes': id_class.classes};
			if(output != "")
				func.output = output;
			return func;
		}
	/
		"call" (whitespace "function")? whitespace+
			name:identifier whitespace*
			args:(
				"(" args:matched_parentheses? ")" {return args;}
			)?
			id_class:id_class
			output:(
				whitespace+ ">" append:">"? whitespace* var_name:identifier
				{return {'to': var_name, 'append': append != ""}; }
			)?
		{
			var func = {'type': 'call', 'name': name, 'arguments': args,
				'id': id_class.id, 'classes': id_class.classes};
			if(output != "")
				func.output = output;
			return func;
		}

matched_parentheses =
		& '"' quote:quoted_string data:matched_parentheses*
		{return '"' + quote + '"' + data.join("");}
	/
		& "'" quote:quoted_string data:matched_parentheses*
		{return "'" + quote + "'" + data.join("");}
	/
		"(" data:matched_parentheses* ")"
		{return "(" + data.join("") + ")";}
	/
		data:[^\"\'\(\)]+ more:matched_parentheses*
		{return data.join("") + more;}

parameters "parameter list" =
		"()" {return [];}
	/
		"("
			newline_token* whitespace*
			first_param:identifier
			/* attribute_separator was used for flexibility, but I suppose commas could be used, too */
			next_params:(attribute_separator newline_token* whitespace* param:identifier {return param;})*
			newline_token* whitespace*
		")"
		{return [first_param].concat(next_params);}

/************** Chunks, isolates, constant/preserve areas, and foreach **************/
chunk "chunk" =
	"chunk" name:(whitespace+ name:identifier {return name;})?
		whitespace* params:parameters?
	{
		return {'type': 'chunk', 'name': name == "" ? "last" : name,
			'parameters': params == "" ? null : params};
	}

isolate "isolate" =
	"isolate"
	{return {'type': 'isolate'};}

constant "constant block" =
	"constant"
	{return {'type': 'constant'};}

preserve "preserve block" =
	"preserve" preserved:text_until_eol?
	{return {'type': 'preserve', 'preserved': preserved};}

foreach "foreach list block" =
	"foreach" whitespace+ cursor:[a-zA-Z0-9_:\-\.\[\]\'\"\(\) \t]+
	{
		var ret = {'type': 'foreach', 'cursor': cursor.join("")};
		/* Remove itemAlias from the cursor, if found
			/[ \t]+as[ \t]+([a-zA-Z_][a-zA-Z0-9_:-]*)$/
			
			whitespace+ "as" whitespace+ identifier $
			where identifier = [a-zA-Z_] next_chars: [a-zA-Z0-9_:-]*
		*/
		var itemAliasRegex = /[ \t]+as[ \t]+([a-zA-Z_][a-zA-Z0-9_:-]*)$/
		var data = ret.cursor.match(itemAliasRegex);
		if(data != null)
		{
			ret.itemAlias = data[1];
			ret.cursor = ret.cursor.substr(0, ret.cursor.length - data[0].length);
		}
		return ret;
	}

foreach_else "foreach else block" =
	"else"
	{return {'type': 'foreach_else'};}

/************** File includes **************/
include "include" =
		"include" whitespace+ filename:quoted_string exposing:exposed_locals?
		{
			var ret = {'type': 'include', 'filename': filename};
			if(exposing != "")
				ret.exposing = exposing;
			return ret;
		}
	/
		"include" whitespace+
		filename:(
			id:identifier
			prop:("." prop:identifier {return "." + prop;})*
			{return id + prop.join("");}
		) exposing:exposed_locals?
		{
			var ret = {'type': 'include', 'code': filename};
			if(exposing != "")
				ret.exposing = exposing;
			return ret;
		}

exposed_locals "include exposing local variables" =
	whitespace+ ("exposing" / "and expose") whitespace+ first_var:identifier
	next_vars:([, \t] whitespace* next_var:identifier {return next_var;})*
	{return [first_var].concat(next_vars);}

/************** Comments (parsed and unparsed) **************/
//May eat one token of whitespace following the "//" or "//-"
comment "comment" =
		"//if " comment: text_until_eol & {
			return comment.indexOf("IE") >= 0;
		} {return {
			'type': 'conditional_comment',
			'comment': "if " + comment
		}; }
	/
		"//" hidden: "-"? whitespace? comment: text_until_eol?
		{return {
			'type': 'comment',
			'comment': comment,
			'hidden': hidden != ""
		}; }

unparsed_comment "c-style block comment" =
	"/*" output: "*"? whitespace? comment: (!"*/" char:. {return char;})+ "*/"
	{
		if(comment.length > 0 && (comment[comment.length - 1] == " " ||
			comment[comment.length - 1] == "\t") )
				comment.pop();
		return {
			'type': 'comment',
			'comment': comment.join(""),
			'hidden': output == ""
		};
	}

/************** Code/text rules and text filters **************/
//May eat one token of whitespace following the "-"
code "code" =
	"-" whitespace* code: text_until_eol
	{return {'type': 'code', 'code': code}; }

event_handler "event handler" =
	"{" events:[^\}\r\n]+ "}"
	{return {
		'type': 'event_handler',
		'events': events.join(""),
		'event_handler': ""
	};}

//May eat one token of whitespace following the "|"
line_of_text "line of text" =
		& [!=] content:content_prefix whitespace? data:text_until_eol?
		{content[content.type] = data; return content;}
	/
		"|" content:content_prefix whitespace? data:text_until_eol?
		{content[content.type] = data; return content;}

/* Specifies the type of content that follows (code or text) and
	whether or not it should be escaped. Also, eats an optional
	trailing whitespace character.
*/
content_prefix = 
	escape:"!"? code:"="?
	{return {
		'escape': escape != "!",
		'type': code == "=" ? 'code_output' : 'text'
	};}

filter "filter" =
	":" data: identifier
	{return {'type': 'filtered_text', 'name': data, 'filtered_text': ""};}

/************** Lexer & other basic rules **************/
identifier =
	first_char: [a-zA-Z_]
	next_chars: [a-zA-Z0-9_:-]*
	{return first_char + next_chars.join("");}

alpha "letters" =
	data: [a-zA-Z]+ {return data.join("");}

alphanumeric "letters and numbers" =
	data: [a-zA-Z0-9]+ {return data.join("");}

whitespace "whitespace (space or horizontal tab)" =
	[ \t] {/* Do nothing */}

quoted_string "quoted string" =
		"'"
		data: ("\\" escaped:. {return "\\" + escaped;} / [^'])*
		"'" {return eval("'" + data.join("") + "'");}
	/
		'"'
		data: ("\\" escaped:. {return "\\" + escaped;} / [^"])*
		'"' {return eval('"' + data.join("") + '"');}

text_until_eol "some text before the end of the line" = 
	text: [^\r\n]+
	{return text.join("");}

//Will reset the `indent` global variable
//Note: Only Linux and Windows line feeds are supported; Old Mac-style "\r" is not a newline
newline "newline" =
	newline_token {indent = 0;}

//Will not reset the `indent` global variable
newline_token "newline" =
	"\r" ? "\n"

//Will update `indent` global variable and return the # of indents
indents "indents" =
		tabs: "\t"+ & {
			//Predicate accepts \t token if it matches `indentToken`
			if(indentToken == undefined)
				indentToken = "\t";
			return indentToken == "\t";
		} {
			return indent = tabs.length; //Return the indent value
		}
	/
		spaces: " "+ & {
			/* Predicate accepts space tokens if `indentToken` contains
				spaces and divides evenly into the number of spaces in
				the `indentToken`.
				This ensures that files indented with 3 spaces cannot
				have lines indented with 5 spaces.  Only multiples of
				3 spaces would be permitted, in this case.
			*/
			if(indentToken == undefined)
				indentToken = spaces.join("");
			if(indentToken.charAt(0) != " ")
				return false;
			else
				return spaces.length % indentToken.length == 0;
		} {
			//Return the indent value
			return indent = spaces.length / indentToken.length;
		}
