Sangam
======

[work in progress. very buggy, but I'll open to feedback/issues/help]

Asset package management for front end developers
-------------------------------------------------

I made this module for my own personal use to solve a few pain points - 

- Having to depend on the backend developers for compressing/minifying my code/assets.
- Having to reinvent the wheel with every project as to how to develop front end code, etc. 
- not being able to use a framework of my choice, and having to mess with the server side templates whenever I wanted to add/remove files, etc. 
- and so on.


The salient functionalities of this module are - 

- written in node js. I'm not *completely* happy about the performance yet, but for day to day work it's just fine. 
- being able to package javascript/css/templates into a single package. (Yes, embed your css in javascript if you'd like, it'll load automatically.)
- automatic compression, minification, image embedding in your css (note - image embedding does not work < IE8 yet. I'm not sure if I'll do it, but I'll keep you in the loop.)
- even if you don't do image embedding, it still copies off all images references in the css (with hashing!) to an img folder and references it.
- generated files are marked with a hash of their contents, so you can upload to your cdn and not worry about caching issues, etc.
- generates a tiny little wrapper file around these generated css and js files, so even if you upload your files to a cdn somewhere, you can keep this particular file on your real server and pass the link to that, and it'll import your files from the CDN.
- watches the input files and automatically regenerates the associated packages when they change. 
- and so on. 


Alright, let's have a look at this - 

common
======
you need to a write a config file to tell Sangam how to package your assets. Available options - 

```
compress:true 	: strips whitespace
minify:true,		: minifies you code by applying optimizations, shrinking variable names, etc. For JS, it uses uglify-js, and for CSS, cssmin. 
hashify:true,		: outputs files of the format xyz.[hash of file contents].js/css. eg - style.ad0bdd87a3836578787c62b5a22ced46.css This is useful for assets in the cloud, to make sure that you don't need to invlidate cache, etc. 
embed:true,			: embeds images into the css using data:uri scheme. (Note - won't work < IE8, and only does it for files <32KB)
lint:true,			: TODO js/csslints your files and logs output to console 
gzip:true,			: outputs gziped version of the generated assets. You could also possibly do this via your server settings, but it's good to have this option here. 
spritify:true,		: TODO generates sprites from images (I'm not really sure if I'll do this either, but I'll let you know)
domain:'http://spitleaf.com/',  		//used to generate absolute urls in css, wrap urls in scripts, etc. 
										//eg - http://spitleaf.com/assets
										// use if you're going to be putting css into a js file
										// on development, make sure this is either off, or pointing to your dev machine. 
wrap:true,			: generates wrapper files for the generated files (specifically if you're hashing the filenames) You can use this file if you'd like. Ideal for packaged assets that'll be put on other sites. 
debug:false,  		: disables most of the previous options, useful for checking the output quickly on a place other than development.

src:'./static/',	: base source path of your input files
dest:'./assets/',	: base destination of your output files. generated files will go into /img /css /js folders. 

js:{
	lib:['lib/jquery-1.6.4.js', 'css/style.less', './lib/underscore-1.1.7.js', './lib/backbone-0.5.3.js'],  //this is one "Package". Put whatever you'd like ot in here. Notice the .less file, that's fine too. 
	script:['js/main.js','../templates/footer.html']	//another js package
},
css:{
	style:['css/style.less']	//a css package. @import from less files works as expected, and will include the imported file into the generated file. 
},
spec:'output.json'	: details regarding the output files will be put into this file 

```

node js
=======

```
var Sangam = require('sangam').Sangam;

var myAssets = new Sangam (config);    //where config is ìn the above format

```

commandline TODO
================
sangam -config static/config/config.json --watch


tests TODO
==========
to run the tests, go to tests/ and run ```expresso ```


TODO list
=========

- make sure files are included in the right order
- support sass/scss/stylus
- automatic spritification of images
- make sure target folders [assets]/img /js /css exist before pumping out files to them
- use node's eventemitter(2?) class, and give more proper hooks into the process
- view helpers for expressjs




