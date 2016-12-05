/*
 * to-markdown - an HTML to Markdown converter
 *
 * Copyright 2011, Dom Christie
 * Licenced under the MIT licence
 *
 */

var toMarkdown = function(string) {
  
  var ELEMENTS = [
    {
      patterns: ['div'],
      type: 'div',
      replacement: function(str, attrs, innerHTML) {
      	innerHTML = trim(innerHTML);
        return innerHTML ? '\n\n' + innerHTML + '\n\n' : '';
      }
    },
    {
      patterns: ['p'],
      replacement: function(str, attrs, innerHTML) {
      	innerHTML = trim(innerHTML);
        return innerHTML ? '\n\n' + innerHTML + '\n\n' : '';
      }
    },
    {
      patterns: 'br',
      type: 'void',
      replacement: '\n\n'
    },
    {
      patterns: 'h([1-6])',
      replacement: function(str, hLevel, attrs, innerHTML) {
      	innerHTML = trim(innerHTML);
        var hPrefix = '';
        for(var i = 0; i < hLevel; i++) {
          hPrefix += '#';
        }
        return '\n\n' + hPrefix + ' ' + innerHTML + '\n';
      }
    },
    {
      patterns: 'hr',
      type: 'void',
      replacement: '\n\n* * *\n'
    },
    {
      patterns: 'a',
      replacement: function(str, attrs, innerHTML) {
      	innerHTML = trim(innerHTML);
        var href = attrs.match(attrRegExp('href')),
            title = attrs.match(attrRegExp('title'));
        return href ? '[' + innerHTML + ']' + '(' + href[1] + (title && title[1] ? ' "' + title[1] + '"' : '') + ')' : str;
      }
    },
    {
      patterns: ['b', 'strong'],
      replacement: function(str, attrs, innerHTML) {
      	innerHTML = trim(innerHTML);
        return innerHTML ? '**' + innerHTML + '**' : '';
      }
    },
    {
      patterns: ['i', 'em'],
      replacement: function(str, attrs, innerHTML) {
      	innerHTML = trim(innerHTML);
        return innerHTML ? '_' + innerHTML + '_' : '';
      }
    },
    {
      patterns: ['span'],
      replacement: function(str, attrs, innerHTML) {
      	innerHTML = trim(innerHTML);
        return innerHTML ? '' + innerHTML + '' : '';
      }
    },
    {
      patterns: ['script','noscript'],
      replacement: function(str, attrs, innerHTML) {
        return '\n\n';
      }
    },
    {
      patterns: 'code',
      replacement: function(str, attrs, innerHTML) {
        return innerHTML ? '`' + innerHTML + '`' : '';
      }
    },
    {
      patterns: 'img',
      type: 'void',
      replacement: function(str, attrs, innerHTML) {
        var src = attrs.match(attrRegExp('src')),
            alt = attrs.match(attrRegExp('alt')),
            title = attrs.match(attrRegExp('title'));
        return '![' + (alt && alt[1] ? alt[1] : '') + ']' + '(' + src[1] + (title && title[1] ? ' "' + title[1] + '"' : '') + ')';
      }
    }
  ];
  
  for(var i = 0, len = ELEMENTS.length; i < len; i++) {
    if(typeof ELEMENTS[i].patterns === 'string') {
      string = replaceEls(string, { 
	      	tag: ELEMENTS[i].patterns, 
	      	replacement: ELEMENTS[i].replacement, 
	      	type:  ELEMENTS[i].type 
      	});
    }
    else {
      for(var j = 0, pLen = ELEMENTS[i].patterns.length; j < pLen; j++) {
        string = replaceEls(string, {
	        	 tag: ELEMENTS[i].patterns[j], 
	        	 replacement: ELEMENTS[i].replacement, 
	        	 type:  ELEMENTS[i].type 
        	 });
      }
    }
  }
  
  function replaceEls(html, elProperties) {
    var pattern = "";
    if(elProperties.type === 'void'){
    	pattern = '<' + elProperties.tag + '\\b([^>]*)\\/?>' ;
    } else if(elProperties.type === 'div'){
    	// return
    	return replaceDiv(html, elProperties); 
    } else {
    	pattern = '<' + elProperties.tag + '\\b([^>]*)>([\\s\\S]*?)<\\/' + elProperties.tag + '>';
    }
        
    var regex = new RegExp(pattern, 'gi');
    var markdown = '';
    if(typeof elProperties.replacement === 'string') {
      markdown = html.replace(regex, elProperties.replacement);
    }
    else {
      markdown = html.replace(regex, function(str, p1, p2, p3) {
        return elProperties.replacement.call(this, str, p1, p2, p3);
      });
    }
    return markdown;
  };
  
  function replaceDiv(html, elProperties) {
  	if(!html){return html;}
  	// tanlan moshi
    var pattern = '<' + elProperties.tag + '\\b([^>]*)>([\\s\\S]*?)<\\/' + elProperties.tag + '>';
    // nested element replace
    var regex = new RegExp(pattern, 'gi');
    var markdown = '';
    // not equals, continue replace
    while(true){
	    if(typeof elProperties.replacement === 'string') {
	      markdown = html.replace(regex, elProperties.replacement);
	    }
	    else {
	      markdown = html.replace(regex, function(str, p1, p2, p3) {
	        return elProperties.replacement.call(this, str, p1, p2, p3);
	      });
	    }
	    //
	    if(markdown !== html){
	    	html = markdown;
	    } else {
	    	break; // important!! must break;
	    }
    }
    return markdown;
  }
  
  function attrRegExp(attr) {
    return new RegExp(attr + '\\s*=\\s*["\']?([^"\']*)["\']?', 'i');
  }
  
  // Pre code blocks
  // no tanlan
  string = string.replace(/<pre\b[^>]*>`([\s\S]*?)`<\/pre>/gi, function(str, innerHTML) {
    innerHTML = innerHTML.replace(/^\t+/g, '  '); // convert tabs to spaces (you know it makes sense)
    innerHTML = innerHTML.replace(/\n/g, '\n    '); // every line
    innerHTML = replaceGtLt(innerHTML);
    return '\n\n\n    ' + innerHTML + '\n\n\n';
  });
  //
  function replaceGtLt(string){
  	string = string.replace(/&gt;/g, ">");
  	string = string.replace(/&lt;/g, "<");
  	return string;
  };
  
  // Lists
  
  // Escape numbers that could trigger an ol
  string = string.replace(/(\d+)\\. /g, '$1\\. ');
  
  // Converts lists that have no child lists (of same type) first, then works it's way up
  var noChildrenRegex = /<(ul|ol)\b[^>]*>(?:(?!<ul|<ol)[\s\S])*?<\/\1>/gi;
  while(string.match(noChildrenRegex)) {
    string = string.replace(noChildrenRegex, function(str) {
      return replaceLists(str);
    });
  }
  
  function replaceLists(html) {
    
    html = html.replace(/<(ul|ol)\b[^>]*>([\s\S]*?)<\/\1>/gi, function(str, listType, innerHTML) {
      var lis = innerHTML.split('</li>');
      lis.splice(lis.length - 1, 1);
      
      for(i = 0, len = lis.length; i < len; i++) {
        if(lis[i]) {
          var prefix = (listType === 'ol') ? (i + 1) + ".  " : "*   ";
          lis[i] = lis[i].replace(/\s*<li[^>]*>([\s\S]*)/i, function(str, innerHTML) {
            
            innerHTML = innerHTML.replace(/^\s+/, '');
            innerHTML = innerHTML.replace(/\n\n/g, '\n\n    ');
            // indent nested lists
            innerHTML = innerHTML.replace(/\n([ ]*)+(\*|\d+\.) /g, '\n$1    $2 ');
            return prefix + innerHTML;
          });
        }
      }
      return lis.join('\n');
    });
    return '\n\n' + html.replace(/[ \t]+\n|\s+$/g, '');
  }
  
  // Blockquotes
  var deepest = /<blockquote\b[^>]*>((?:(?!<blockquote)[\s\S])*?)<\/blockquote>/gi;
  while(string.match(deepest)) {
    string = string.replace(deepest, function(str) {
      return replaceBlockquotes(str);
    });
  }
  
  function replaceBlockquotes(html) {
    html = html.replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, function(str, inner) {
      inner = inner.replace(/^\s+|\s+$/g, '');
      inner = cleanUp(inner);
      inner = inner.replace(/^/gm, '> ');
      inner = inner.replace(/^(>([ \t]{2,}>)+)/gm, '> >');
      return inner;
    });
    return html;
  }
  
  function cleanUp(string) {
    string = string.replace(/^[\t\r\n]+|[\t\r\n]+$/g, ''); // trim leading/trailing whitespace
    string = string.replace(/\n\s+\n/g, '\n\n');
    string = string.replace(/\n{3,}/g, '\n\n'); // limit consecutive linebreaks to 2
    return string;
  }
  function trim(string){
  	string = string || "";
    string = string.replace(/^[\t\r\n\s]+|[\t\r\n\s]+$/g, '');
    return string;
  };
  
  return cleanUp(string);
};