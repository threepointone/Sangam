var Events = require('./events.js').Events;

var _ = require('underscore'),
	fs = require('fs'),
	sys = require('sys'),
	ejs = require('ejs'),
	path = require('path'),
	util = require('util'),
	less = require('less'),
	watch = require('watch'),
	uglify = require('uglify-js'),
	crypto = require('crypto'),
	coffee = require('coffee-script'),
	cssmin = require('cssmin');
	
	
var templates = {
	js:fs.readFileSync(path.join(__dirname, 'templates/js.ejs'), 'utf8'),
	css:fs.readFileSync(path.join(__dirname, 'templates/css.ejs'), 'utf8'),
	wrap:{
		js:fs.readFileSync(path.join(__dirname, 'templates/jswrap.ejs'), 'utf8'),
		css:fs.readFileSync(path.join(__dirname, 'templates/csswrap.ejs'), 'utf8')
	}
};

var embed_mime_types = {
	'.png' : 'image/png',
	'.jpg' : 'image/jpeg',
	'.jpeg' : 'image/jpeg',
	'.gif' : 'image/gif',
	'.tif' : 'image/tiff',
	'.tiff' : 'image/tiff',
	'.ttf' : 'font/truetype',
	'.otf' : 'font/opentype',
	'.woff' : 'font/woff'
};


// functions to 'convert' one 'type' of file into another. 	
var  convert = {
	to:{
		js:{
			'.coffee':function(str, p, callback){
				callback = callback||_.identity;
				callback(coffee.compile(str));
			}
		},
		css:{
			'.less':function(str, p, callback){
				callback = callback||_.identity;
				
				new (less.Parser)({
					paths:[process.cwd(),path.dirname(p)]
				}).parse(str,function (err, tree) {
					if (err) { return console.error(err) }
					callback(tree.toCSS());
				})

			}
		}
	},
	//generic spits back whatever is passed in to the callback
	identity:function(str, p, callback){
		callback(str);
	}
};





var Package = Events.extend({
	initialize:function(config){				//single package config
		this.config = _.defaults(config, {
			name:'',
			src:'./static/',
			dest:'./assets/',
			files:[],
			compress:false,
			minify:false,
			hashify:false,
			embed:false,
			lint:false,
			gzip:false,
			spritify:false,
			debug:true,
			write:true	//send write == false if all you want is to get the result via pkg.result after whichever evt in the step is triggered
		});
		
		this.name = this.config.name;
		this.result = '';
		this.path = '';
		
		this.images = [];
		
		this.extension = '';	//PLEASE OVERRIDE
		
		this.mutex = false; // set to true when processing?
		
		

	},
	process:function(callback){
		var self = this;
		
		var _script = '';
		var _css = '';
		var _templates = {};
		
		var fileCtr = this.config.files.length;
		
		_(this.config.files).each(function(f, i){

			var text = fs.readFileSync(f, 'utf8');

			var ext = path.extname(f);
			

			if(self.isStyle(f)){
				//TODO make sure they get put in the right order, dammit.
				(convert.to.css[ext]||convert.identity)(text, f, function(css){
					
					//get all images in the file 
					
					//todo break up the stuff in this block and make separate functions
					
					var regex = /url\(['"]?([^\s)]+\.[a-z]+)(\?\d+)?['"]?\)/img;  //via jammit.
					var indexes = [];
					var match;

					while (match = regex.exec(css)){
						indexes.push({
							url:match[1].replace(/(^')|('$)/g, "").replace(/(^")|("$)/g, ""),
							str:match[0],
							index:match.index
						});
						
						
						var image_src_path = path.join(path.dirname(f), _(indexes).last().url);
						var image_src_filename = path.basename(image_src_path).split('.');
						var image_buffer = fs.readFileSync(image_src_path);
						var image_dest_path = path.join(self.config.dest, 
								'img', 
								image_src_filename[0]  + 
									(self.config.hashify? ('.' + crypto.createHash('sha1').update(image_buffer.toString('utf8')).digest('hex') ):('') ) + 
									('.' + image_src_filename[1]) );

						var image_css_path = 'url(' + (self.config.domain? self.config.domain:'../') + 'img/' + path.basename(image_dest_path) + ')';

						if(self.config.embed && (image_buffer.length/1024 < 32) ){
							image_css_path = 'url(data:' + embed_mime_types['.' + image_src_filename[1] ] + ';base64,' +  image_buffer.toString('base64') + ')';
						}

						//write to this path anyway, even if embedding, will be useful for ie6/7
						fs.writeFileSync(image_dest_path, image_buffer);

						css = css.replace(_(indexes).last().str, image_css_path);
						
					}

					
					_css += '\n' + css + '\n';

					finish();
				});
			}
			else if(self.isTemplate(f)){
				//TODO make sure they get put in the right order, dammit.
				//TODO - handle partials? 

				_templates[path.join(self.name, path.basename(f, ext))] = text;		//simple template namespacing
				
				finish();
				
			}
			else if(self.isScript(f)){
				(convert.to.js[ext]||convert.identity)(text,f, function(js){
					//TODO make sure they get put in the right order, dammit.
					_script+= '\n' + js + '\n';
					finish()
				});
			}

		});
		
		
		function finish(){
			fileCtr--;
			if(fileCtr==0){
				self.result = ejs.render(self.output_template, {
					locals:{
						css:_css,
						templates:_templates,
						script: _script
					}
				});
				callback();
			}

		}
		
		//convert all files to native form here and get a string.
		
	},
	steps:[ 'lint', 'embed', 'spritify', 'compress', 'minify', 'write', 'gzip'],
	bundle:function(fn){
		
		//basically write to files, and trigger an output json with details. 
		var self = this;
		
		this.process(function(){
			//assuming these are synchronous steps
			_(self.steps).each(function(step){
				if(self.config[step] && self[step]){
					self[step]();
				}
			});
			
			self.trigger('bundle');
		});
	},
	lint:function(){
		if(!this.config.debug && this.config.lint){
			this.trigger('lint');
		}
		return this;
		
	},
	embed:function(){		//assume css. 
		if(!this.config.debug && this.config.embed){
			this.trigger('embed');
		}
		return this;
		
	},
	spritify:function(){	//assume css
		if(!this.config.debug && this.config.spritify){
			this.trigger('spritify');
		}
		return this;
		
	},
	compress:function(){
		//please override
	},
	minify:function(){
		//please override		
	},
	gzip:function(){
		if(!this.config.debug && this.config.gzip){
			//generate gzipped file. MUST be last step, if at all. 
			this.trigger('gzip');
		}
		return this;

	},
	write:function(){
		this.filename = path.join(
			this.config.dest, 
			this.type, 
			this.name + 
				( (!this.config.debug && this.config.hashify) ? ('.' + crypto.createHash('md5').update(this.result).digest('hex') ) : '' ) +				 
				this.extension
		);
		
		if(this.config.wrap && templates.wrap[this.type]  && !(this.config.debug || !this.config.hashify) ){
			var wrap_filename = path.join(this.config.dest, this.type, this.name + this.extension);
			fs.writeFileSync(wrap_filename, ejs.render(templates.wrap[this.type], {locals:{
				domain:this.config.domain, 
				path:this.filename
			}}));
		}

		//TODO make this async
		fs.writeFileSync(this.filename, this.result);
		this.trigger('write');
		
	},
	isStyle:function(p){
		return (['.css', '.less'].indexOf(path.extname(p))>-1);
	},
	isTemplate:function(p){
		return(['.html', '.ejs'].indexOf(path.extname(p))>-1);
	},
	isScript:function(p){
		return(['.js', '.coffee'].indexOf(path.extname(p))>-1);

	}
});

Package.JS = Package.extend({
	initialize:function(config){
		this.type = 'js';
		this.output_template = templates.js;
		Package.prototype.initialize.apply(this, arguments);
		this.extension = '.js';
	},
	
	lint:function(){
		
	},
	compress:function(){
		if(!this.config.debug && this.config.compress){
			//compress
			var jsp = uglify.parser;
			var pro = uglify.uglify;
			
			if(!this.config.minify){
				this.result = pro.gen_code(pro.ast_squeeze(jsp.parse(this.result)));
			}
			this.trigger('compress');
		}
		return this;
		
	},
	minify:function(){
		if(!this.config.debug && this.config.minify){
			
			var jsp = uglify.parser;
			var pro = uglify.uglify;

			this.result =  pro.gen_code(pro.ast_squeeze(pro.ast_mangle(jsp.parse(this.result))));
			
			this.trigger('minify');
		}
		return this;
	}
});

Package.CSS = Package.extend({
	initialize:function(config){
		this.type = 'css';
		this.output_template = templates.css;
		Package.prototype.initialize.apply(this, arguments);
		this.extension = '.css';
	},

	lint:function(){

		return this;
	},
	embed:function(){		//assume css. 
		//took care of this in the process step itself.
		return this;
	},
	compress:function(){
		if(!this.config.debug && this.config.compress){
			
			this.result = cssmin.cssmin(this.result);
			this.trigger('compress');
		}
		return this;
	},
	minify:function(){
		if(!this.config.debug && this.config.minify){
			//TODO introduce minification step
			this.trigger('minify');
		}
		return this;
	}

});

var Sangam = Events.extend({
	initialize:function(config){
		this.config = _.defaults(config, {
			src:'./static/',
			dest:'./assets/',
			js:{},
			css:{},
			compress:false,
			minify:false,
			hashify:false,
			embed:false,
			lint:false,
			gzip:false,
			spritify:false,
			debug:true,
			spec:'assets.json'
		});
		
		//TODO do some checking to make sure no clashes, make sure config is valid, etc 
		
		
		
		this.make_packages();
		this.start();
		
		this.trigger('start');
		
		
	},
	watch:function(){
		var self = this;
		_(this.files).chain().keys().each(function(f){
			var file = f;
			fs.watchFile(file, function(curr, prev){
				_(self.files[file]).each(function(pkg){
					var type = pkg.split(':')[0];
					var name = pkg.split(':')[1];
					self.packages[type][name].bundle();
				})
			});
		});
	},
	
	output_spec:function(pkg){
		
		if(!this.output){ 			//store output spec here - generated filenames, basically. 
			this.output = {js:{}, css:{}};
		}
		
		this.output[pkg.type][pkg.name] = pkg.filename;
		fs.writeFileSync(path.join(this.config.dest, this.config.spec), JSON.stringify(this.output, null, '\t'));
		
		this.trigger('output');
	},
	make_packages:function(){
		var self = this;
		
		this.packages = {
			js:{},css:{}
		};
		
		this.files = {};
		
		_(['js', 'css']).each(function(type){
			_(self.config[type]).each(function(arr, name){
				var filepaths = _(arr).map(function(p, i){
					var fullpath = path.join(self.config.src, p);
					//maintain a reverse hash to immmediately know which packages have been affected by a file change
					self.files[fullpath] = _.union(self.files[fullpath]||[], [type + ':' + name]);
					return fullpath;
				});

				self.packages[type][name] = new (Package[type.toUpperCase()])(_.extend(_.clone(self.config), {
					files:filepaths,
					name:name
				}));
				
				self.packages[type][name].bind('bundle', function(){
					self.output_spec(this);
				});

			});
			
			
			_(self.packages[type]).invoke('bundle');
		});
	},
	start:function(){
		
		//start watching
		this.watch();
		
		this.trigger('start');
		
	},
	stop:function(){		//possibly destroy self after this   HAHAHAHAHA destroy self
		this.trigger('stop');
	}	
});


exports.Sangam = Sangam;

