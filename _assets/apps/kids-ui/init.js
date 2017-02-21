var functions = [
    {
      name:'moveForward',
      type:'child',
      content:{str: "F"},
      shape:"TriangleUp",
      icon:"Up",
      color:"#55B726",
      run: function(node, mirobot, cb){
        mirobot.move('forward', 150, cb);
      }
    },
/*    {
      name:'moveBackward',
      type:'child',
      content:{str: "B"},
      shape:"TriangleDown",
      icon:"Down",
      color:"#D3992B",
      run: function(node, mirobot, cb){
        mirobot.move('back', 100, cb);
      }
    },*/
    {
      name:'turnLeft',
      type:'child',
      content:{str: "L"},
      shape:"Circle",
      icon:"Left",
      color:"#284A8D",
      run: function(node, mirobot, cb){
        mirobot.turn('left', 90, cb);
      }
    },
    {
      name:'turnRight',
      type:'child',
      content:{str: "R"},
      shape:"Circle",
      icon:"Right",
      color:"#C52847",
      run: function(node, mirobot, cb){
        mirobot.turn('right', 90, cb);
      }
    },
/*    {
      name:'pendown',
      type:'child',
      content:{str: "PenDown"},
      shape:"Square",
      icon:"PenDown",
      color:"#3D9114",
      run: function(node, mirobot, cb){
        mirobot.pendown(cb);
      }
    },
    {
      name:'penup',
      type:'child',
      content:{str: "PenUp"},
      shape:"Square",
      icon:"PenUp",
      color:"#A87517",
      run: function(node, mirobot, cb){
        mirobot.penup(cb);
      }
    },
    {
      name:'beep',
      type:'child',
      content:{ str: "Beep"},
      shape:"Square",
      icon:"Beep",
      color:"#18376F",
      run: function(node, mirobot, cb){
        mirobot.beep(500, cb);
      }
    },*/
  ];


var builder = new Builder($('#code'), undefined, functions, true);
var app  = new MirobotApp({
  l10n: true,
  languages: baseLanguages,
  simulation: true
});
builder.setMirobot(app.mirobot);

app.initPersistence({
  saveHandler: function(){ return builder.saveProgram(); },
  loadHandler: function(prog){ return builder.loadProgram(prog); },
  clearHandler: function(){ return builder.clearProgram(); }
});


