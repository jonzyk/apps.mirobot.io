var FnInstance = function(fn, el, mirobot){
  this.fn = fn;
  this.el = el;
  this.mirobot = mirobot;
  this.parent = false;
  this.children = []
}

FnInstance.prototype = {
  run: function(children){
    var self = this;
    if(self.fn){
      // This is a function
      self.fn.run(self, self.mirobot, function(state){ self.updateState(state)});
    }else{
      // This is the root container
      for(var i in self.children){
        self.children[i].run();
      }
    }
  },
  updateState: function(state){
    if(state === 'started'){
      $(this.el).addClass('active');
    }else if(state === 'complete'){
      $(this.el).removeClass('active');
    }
    if(this.parent && this.parent.el){
      this.parent.updateState(state);
    }
  },
  addChild: function(child){
    child.parent = this;
    this.children.push(child);
  },
  args: function(){
    var self = this;
    var args ={}
    if(this.fn){
      $.each(this.fn.content, function(i, item){
        if(typeof item === 'object'){
          args[item.name] = self.el.querySelector('[name='+ item.name + ']').value;
        }
      });
    }
    return args;
  },
  toObject: function(){
    var out = {
      fn: this.fn ? this.fn.name : 'root',
      parent: this.fn ? this.fn.type === 'parent' : true,
      args: this.args(),
      children: []
    }
    if(this.children.length){
      out.children = this.children.map(function(c){ return c.toObject(); });
    }
    return out;
  }
}

var Builder = function(el, mirobot, functions, disableLocalstorage){
  var self = this;
  this.el = el;
  this.mirobot = mirobot;
  this.fns = {};
  this.paused = false;
  this.following = false;
  this.colliding = false;
  this.functions = functions;
  this.store = !disableLocalstorage;
  this.init();

  $.each(this.functions, function(i, f){
    self.fns[f.name] = f;
  });
}

Builder.prototype = {
  prog:null,
  setMirobot: function(mirobot){
    this.mirobot = mirobot;
    this.initMirobot();
  },
  initMirobot: function(){
    if(typeof this.mirobot === 'undefined') return;
    var self = this;
    this.mirobot.addEventListener('programComplete', function(){ self.progCompleteHandler() });
    this.mirobot.addEventListener('readyStateChange', function(){ self.updateMirobotState() });
    this.updateMirobotState();
  },
  init: function(){
    var self = this;
    var adjustment;
    this.el.addClass('editor');
    this.el[0].innerHTML = this.mainUI;
    this.setSize();
    window.addEventListener('resize', function(){self.setSize();});

    // Stop the whole page scrolling in touch browsers except in the program
    document.addEventListener('touchmove', function(e) {
      var el = e.target;
      while(el = el.parentElement){
        if(el.id === 'program'){
          return;
        }
      }
      e.preventDefault();
    }, false);
    
    this.runner = $('.editor .run');
    this.pause = $('.editor .pause');
    this.stop = $('.editor .stop');
    this.clear = $('.editor .clear');
    this.follow = $('.editor #follow');
    this.collide = $('.editor #collide');
    this.runner.click(function(e){self.runProgram()});
    this.pause.click(function(e){self.pauseProgram()});
    this.stop.click(function(e){self.stopProgram()});
    this.clear.click(function(e){self.clearProgram()});
    this.follow.click(function(e){self.followClick()});
    this.collide.click(function(e){self.collideClick()});
    
    this.initMirobot();

    this.initProgram();
    this.addFunctions();
    this.resumeProgram();
  },
  updateMirobotState: function(){
    if(this.mirobot.ready()){
      this.el.addClass('ready');
      this.el.removeClass('notReady');
    }else{
      this.el.removeClass('ready');
      this.el.addClass('notReady');
    }
  },
  supportsLocalStorage: function(){
    try {
      localStorage.setItem('test', true);
      localStorage.removeItem('test');
      return true;
    } catch (e) {
      return false;
    }
  },
  saveProgram: function(){
    var prog = new FnInstance(null, null, null);
    this.generate($('.editor ol.program')[0], prog);
    return JSON.stringify(prog.toObject());
  },
  loadProgram: function(input){
    this.clearProgram();
    var prog = JSON.parse(input);
    if(prog.fn === 'root' && prog.children && prog.children.length > 0){
      this.instantiateProgram(prog.children, document.querySelectorAll('.editor .program')[0]);
      /*this.showHints();*/
      this.sortLists();
    }
  },
  storeProgram: function(){
    if(this.supportsLocalStorage() && this.store){
      localStorage['mirobot.currentProgram'] = this.saveProgram();
    }
  },
  resumeProgram: function(){
    if(this.supportsLocalStorage() && localStorage['mirobot.currentProgram'] && this.store){
      this.loadProgram(localStorage['mirobot.currentProgram'])
    }
  },
  instantiateProgram: function(fns, el){
    var self = this;
    if(fns && fns.length){
      for(var i = 0; i< fns.length; i++){
        var newEl = document.querySelectorAll('.functionList .fn-' + fns[i].fn)[0].cloneNode(true);
        el.appendChild(newEl);
        for(var arg in fns[i].args){
          if(fns[i].args.hasOwnProperty(arg)){
            var input = newEl.querySelector("[name='" + arg + "']");
            input.value = fns[i].args[arg];
          }
        }
/*        self.checkForChanges(newEl);
        $(newEl).draggableList({
          target: 'ol.program',
          placeholder: '<li class="placeholder"/>',
          copy: false,
          ondrag: function(){self.showHints()},
          onchange: function(){self.storeProgram(); self.sortLists();}
        });*/
        if(fns[i].parent){
          this.instantiateProgram(fns[i].children, newEl.getElementsByTagName('ol')[0]);
        }
      }
    }
  },
  setSize: function(){
    var w = window,
      d = document,
      e = d.documentElement,
      g = d.getElementsByTagName('body')[0],
      x = w.innerWidth || e.clientWidth || g.clientWidth,
      y = w.innerHeight|| e.clientHeight|| g.clientHeight;
    var right = this.el[0].getElementsByClassName('right')[0];
    var prog = this.el[0].getElementsByClassName('programWrapper')[0];
    var buttons = this.el[0].getElementsByClassName('buttons')[0];
    right.style.height = y - right.offsetTop - 27 + 'px';
    prog.style.height = buttons.offsetTop - prog.offsetTop + 'px';
  },
  progCompleteHandler: function(e){
    this.runner.show();
    this.pause.hide();
  },
/*  showHints: function(){
    $('.editor .programWrapper ol').each(function(i, el){
      el.getElementsByClassName('hint')[0].style.display = (el.children.length === 1 ? 'block' : 'none')
    });
  },*/
  sortLists: function(){
    var ends = this.el[0].querySelectorAll('.programWrapper li.end')
    $.each(ends, function(i, end){
      end.parentNode.appendChild(end);
    });
  },
/*  checkForChanges: function(elem){
    var self = this;
    var inputs = elem.querySelectorAll('input, select');
    $.each(inputs, function(i, el){
      el.addEventListener('change', function(){ self.storeProgram();});
    });
  },*/
/*  generateInput: function(conf){
    if(conf != undefined) {
		if(conf.input === 'number'){
		  return '<input type="number" size="4" name="' + conf.name + '" value="' + conf.default + '" />';
		}else if(conf.input === 'option'){
		  var select = '<select name="'+ conf.name +'">';
		  for(var j in conf.values){
		    select += '<option value="' + conf.values[j] + '"';
		    if(conf.default === conf.values[j]){
		      select += 'selected="selected"';
		    }
		    select += '>' + l(':'+conf.values[j]) + '</option>';
		  }
		  select += '</select>';
		  return select;
		}
	}
  },*/
  initProgram: function(){
    var self = this;
	  $( "#program" ).sortable({
		  revert: false,
		  placeholder: "hint",
		  receive: function(event, ui) {
			  sortableIn = 1;
			  /*self.checkForChanges(ui);*/
		  },
		  over: function(event, ui) {
			  sortableIn = 1;
		  },
		  out: function(event, ui) {
			  sortableIn = 0;
		  },
		  beforeStop: function(event, ui) {
			  if (sortableIn == 0) {
				  ui.item.remove();
			  }
		  },
		  change: function(event, ui) {
			  self.storeProgram();
			  self.sortLists();
		  }
	  });
  },
  addFunctions: function(){
    var self = this;
    $.each(this.functions, function(i, f){
      //f = self.functions[i];
      var fn = '<li class="function fn-' + f.name + ' draggable" data-fntype="' + f.name + '">';
      var content = f.content.str;
/*      var re = /\[\[([^\ ]*)\]\]/g; 
      while ((m = re.exec(content)) !== null) {
          if (m.index === re.lastIndex) {
              re.lastIndex++;
          }
          content = content.replace('[[' + m[1] + ']]', self.generateInput(f.content[m[1]]));
      }*/
      fn += '<span class="content">'+content+'</span>';
      
      if(f.type === 'parent'){
        fn += '<ol><li class="end"><div class="hint">Drag functions into here!</div></li></li></ol>';
      }
      if( f.color ) {
        fn += '<svg xmlns="http://www.w3.org/2000/svg" style="width: 80px; height: 80px">';
        switch( f.shape ) {
        case "TriangleUp":
          fn += '<polygon points="0 80, 80 80, 40 0" style="fill: '+f.color+';"/>';
          break;
        case "TriangleDown":
          fn += '<polygon points="0 0, 80 0, 40 80" style="fill: '+f.color+';"/>';
          break;
        case "Circle":
          fn += '<circle r="40" cx="40" cy="40" style="fill: '+f.color+';"/>';
          break;
        case "Square":
        default:
          fn += '<polygon points="0 0, 80 0, 80 80, 0 80" style="fill: '+f.color+';"/>';
          break;
        }
        switch( f.icon ) {
        case "Up":
          fn += '<path style="fill:none;fill-rule:evenodd;stroke:#ffffff;stroke-width:8;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" d="M 27.633469,43.066326 39.702591,29.829072 51.714447,42.941195" /><path style="fill:none;fill-rule:evenodd;stroke:#ffffff;stroke-width:8;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" d="m 39.642857,35.660243 0,26.138412" />';
          break;
        case "Down":
          fn += '<path style="fill:none;fill-rule:evenodd;stroke:#ffffff;stroke-width:8;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" d="M 27.633469,36.618564 39.702591,49.855818 51.714447,36.743695" /><path style="fill:none;fill-rule:evenodd;stroke:#ffffff;stroke-width:8;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" d="m 39.642857,44.024647 0,-26.138412" />';
          break;
        case "Left":
          fn += '<path style="fill:none;fill-rule:evenodd;stroke:#ffffff;stroke-width:8;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" d="M 37.18114,21.268464 23.630197,32.984289 36.420977,45.337766" /><path style="opacity:1;fill:none;fill-opacity:0.77813505;fill-rule:nonzero;stroke:#ffffff;stroke-width:8;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" d="M 55.098581,54.278835 C 54.845202,42.50773 45.097361,33.170806 33.326259,33.424319" />';
          break;
        case "Right":
          fn += '<path style="fill:none;fill-rule:evenodd;stroke:#ffffff;stroke-width:8;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1" d="M 41.549448,21.268464 55.100391,32.984289 42.309611,45.337766" /><path style="opacity:1;fill:none;fill-opacity:0.77813505;fill-rule:nonzero;stroke:#ffffff;stroke-width:8;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" d="M 23.632007,54.278835 C 23.885386,42.50773 33.633227,33.170806 45.404329,33.424319" />';
          break;
        case "Beep":
          fn += '';
          break;
        case "Function":
          fn += '';
          break;
        case "PenUp":
          fn += '';
          break;
        case "PenDown":
          fn += '';
          break;
        }
        fn += '</svg>';
      } else if( f.shapeCode ) {
        fn += f.shapeCode;
      }
      fn += '</li>';
      $('.editor .functionList')[0].innerHTML += fn;
    });

    $('.editor .functionList')[0].innerHTML += '<li class="spacer"></li>';

/*    $('.functionList li.draggable').draggableList({
      target: 'ol.program',
      placeholder: '<li class="placeholder"/>',
      copy: true,
      ondrag: function(){self.showHints()},
      onchange: function(){self.storeProgram(); self.sortLists();},
      onaddelem: function(elem){self.checkForChanges(elem);}
    });*/
	  $( ".functionList li.draggable" ).draggable({
		  connectToSortable: "#program",
		  helper: "clone",
		  revert: "invalid",
      /*drag: function(){self.showHints()}*/
	  });
	  $( "ul, li" ).disableSelection();
  },
  runProgram: function(){
    if(!this.mirobot.ready()) return;
    if(this.following || this.colliding || !this.mirobot){ return; }
    if(this.paused){
      this.mirobot.resume();
    }else{
      this.prog = new FnInstance(null, null, null);
      this.generate($('.editor ol.program')[0], this.prog);
      this.prog.run()
    }
    this.pause.show();
    this.runner.hide();
    this.paused = false;
  },
  pauseProgram: function(){
    if(!this.mirobot.ready()) return;
    var self = this;
    this.paused = true;
    if(!this.mirobot){ return; }
    this.mirobot.pause(function(){
      self.runner.show();
      self.pause.hide();
    });
  },
  stopProgram: function(cb){
    if(!this.mirobot.ready()) return;
    var self = this;
    if(!this.mirobot){ return; }
    this.mirobot.stop(function(){
      self.runner.show();
      self.pause.hide();
      self.paused = false;
      self.colliding = false;
      self.following = false;
      self.updateState();
      cb && cb();
    });
  },
  clearProgram: function(){
    this.stopProgram();
    $('.editor ol.program li.function').remove();
    this.storeProgram();
    /*this.showHints();*/
  },
  updateState: function(){
    this.follow[0].innerHTML = this.following ? "&#9724; Stop Following Lines" : "&#9654; Start Following Lines";
    this.collide[0].innerHTML = this.colliding ? "&#9724; Stop Collision Detection" : "&#9654; Start Collision Detection";
    this.runner[0].className = (this.colliding || this.following) ? "run disabled" : "run";
  },
  followClick: function(e){
    var self = this;
    if(self.following){
      self.stopProgram();
    }else{
      self.stopProgram(function(){
        self.mirobot.follow(function(){
          self.following = true;
          self.updateState();
        });
      });
    }
  },
  collideClick: function(e){
    var self = this;
    if(this.colliding){
      this.stopProgram();
    }else{
      this.stopProgram(function(){
        self.mirobot.collide(function(){
          self.colliding = true;
          self.updateState();
        });
      });
    }
  },
  generate: function(el, parent){
    var self = this;
    $.each(el.childNodes, function(i, el){
      if(el.nodeName.toLowerCase() === 'li' && el.className.match(/function/) && el.dataset.fntype){
        var fn = self.fns[el.dataset.fntype];
        var inst = new FnInstance(fn, el, self.mirobot);
        parent.addChild(inst);
        if(fn.type === 'parent'){
          var children = el.childNodes;
          for(var i = 0; i< children.length; i++){
            if(children[i].nodeName.toLowerCase() === 'ol'){
              self.generate(children[i], inst);
            }
          }
        }
      }
    });
  },
  functions:[]
}

Builder.prototype.mainUI = '\
<div class="left container">\
  <h2>' + l(':toolbox') + '</h2>\
  <ol class="functionList"></ol>\
  <div class="extra">\
    <button id="follow">&#9654; ' + l(':start-following') + '</button>\
    <button id="collide">&#9654; ' + l(":start-collision") + '</button>\
  </div>\
</div>\
<div class="right container">\
  <h2>' + l(':program') + '</h2>\
  <div class="programWrapper">\
    <ol class="program" id="program">\
    </ol>\
  </div>\
  <div class="buttons">\
<button class="run">&#9654; ' + l(':run') + '</button>\
<button class="pause" style="display:none;">&#10074;&#10074; ' + l(':pause') + '</button>\
<button class="stop">&#9724; ' + l(':stop') + '</button>\
<button class="clear">&#10006; ' + l(':clear') + '</button>\
  </div>\
</div>\
';

