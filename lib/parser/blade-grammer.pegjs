/* Blade language grammar for use with PEG.js
(c) Copyright 2012. Blake Miner. All rights reserved.

See LICENSE.txt included with this project for more details.

Sorry, the Blade language is not exactly simple, but it's better than looking
through parser code, IMHO. Read all about PEG.js syntax here:
	http://pegjs.majda.cz/documentation

TODO: Commenting out Blade code doesn't work so well
TODO: Comments should not be allowed in other comment blocks
TODO: `include= variable` to include a variable filename

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
	doctype:(doctype newline)?
	nodes:nodes
	newline* //Trailing newlines in a file are certainly permitted
	{return {'doctype': doctype[0], 'nodes': nodes};}

nodes =
	first_node:node next_nodes:(newline+ node:node {return node;})*
	{next_nodes.unshift(first_node); return next_nodes;}

doctype "doctype" = 
		"doctype" whitespace? type:text_until_eol {return type;}
	/
		"!!!" whitespace? type:text_until_eol {return type;}

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
		tag
	/
		comment
	/
		code

child_node "child node" =
	newline child_indent:indents & {
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
	tagName: identifier?
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
			newline* whitespace*
			first_attr:attribute
			next_attrs: ([, \t\r\n] newline* whitespace* attr:attribute {return attr;})*
			newline* whitespace*
		")"
		{
			var attrs = {};
			attrs[first_attr.name] = first_attr.value;
			for(var i in next_attrs)
				attrs[next_attrs[i].name] = next_attrs[i].value;
			return attrs;
		}

attribute "attribute" =
		name:identifier escape:"!"? "=" value:quoted_string
		{return {'name': name, 'value': {'escape': escape != "!", 'text': value} }; }
	/
		name:identifier escape:"!"? "=" value:[^, \t\r\n\(\)]+
		{return {'name': name, 'value': {'escape': escape != "!", 'code': value.join("")} }; }

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
	"render" (whitespace "block")? whitespace+ name:identifier whitespace*
		args:(
			"(" args:matched_parentheses? ")" {return args;}
		)?
	{return {'type': 'render', 'name': name, 'arguments': args}; }

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
		data:[^\"\'\(\)]+
		{return data.join("");}

block_modifier "block modifier (i.e. append, prepend, or replace)" =
	keyword:block_modifier_keyword (whitespace "block")? whitespace+
		name:identifier whitespace* params:parameters?
	{return {'type': keyword, 'name': name, 'parameters': params == "" ? [] : params};}

block_modifier_keyword =
		"append"
	/
		"prepend"
	/
		"replace"

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
		{
			var func = {'type': 'call', 'name': name, 'arguments': args};
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
			output:(
				whitespace+ ">" append:">"? whitespace* var_name:identifier
				{return {'to': var_name, 'append': append != ""}; }
			)?
		{
			var func = {'type': 'call', 'name': name, 'arguments': args};
			if(output != "")
				func.output = output;
			return func;
		}

/************** Includes, code, comments, and text rules **************/
include "include" =
		"include" whitespace+ filename:quoted_string
		{return {'type': 'include', 'filename': filename};}
	/
		"include" whitespace+ filename:identifier
		{return {'type': 'include', 'code': filename};}

parameters "parameter list" =
		"()" {return [];}
	/
		"("
			newline* whitespace*
			first_param:identifier
			next_params:([, \r\n] newline* whitespace* param:identifier {return param;})*
			newline* whitespace*
		")"
		{return [first_param].concat(next_params);}

//May eat one token of whitespace following the "-"
code "code" =
	"-" whitespace? code: text_until_eol
	{return {'type': 'code', 'code': code}; }

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

//May eat one token of whitespace following the "|"
line_of_text "line of text" =
		& [!=] content:content_prefix whitespace? data:text_until_eol?
		{content[content.type] = data; return content;}
	/
		"|" content:content_prefix whitespace? data:text_until_eol?
		{content[content.type] = data; return content;}

filter "filter" =
	":" data: identifier
	{return {'type': 'filtered_text', 'name': data, 'filtered_text': ""};}

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
		data: ("\\" escaped:. {return "\\" + escaped;} / [^'])+
		"'" {return eval("'" + data.join("") + "'");}
	/
		'"'
		data: ("\\" escaped:. {return "\\" + escaped;} / [^"])+
		'"' {return eval('"' + data.join("") + '"');}

text_until_eol "some text before the end of the line" = 
	text: [^\r\n]+
	{return text.join("");}

//Will reset the `indent` global variable
newline "newline" =
	"\r" ? "\n" {indent = 0;}

//Will update `indent` global variable and return the # of indents
indents "indents" =
		data: "\t"+ & {
			//Predicate accepts \t token if it matches `indentToken`
			if(indentToken == undefined)
				indentToken = "\t";
			return indentToken == "\t";
		} {
			return indent = data.length; //Return the indent value
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