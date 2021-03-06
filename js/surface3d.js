(function(){
  var Surface=function(node){
    var heightFunction,colorFunction,timer,timer,transformPrecalc=[];
    var displayWidth=300, displayHeight=300, zoom=1;
    var trans;


    this.setZoom=function(zoomLevel){
      zoom=zoomLevel;
      if(timer) clearTimeout(timer);
      timer=setTimeout(renderSurface);
    };
    var getHeights=function(){
      var data=node.datum();
      var output=[];
      var xlength=data.length;
      var ylength=data[0].length;
      for(var x=0;x<xlength;x++){
        output.push(t=[]);
        for(var y=0;y<ylength;y++){
            var value=heightFunction(data[x][y],x,y);
            t.push(value);
        }
      }
      return output;
    };
    var transformPoint=function(point){
      var x=transformPrecalc[0]*point[0]+transformPrecalc[1]*point[1]+transformPrecalc[2]*point[2];
      var y=transformPrecalc[3]*point[0]+transformPrecalc[4]*point[1]+transformPrecalc[5]*point[2];
      var z=transformPrecalc[6]*point[0]+transformPrecalc[7]*point[1]+transformPrecalc[8]*point[2];
      return [x,y,z];
    };
    var getTransformedData=function(){
      var data=node.datum();
      if(!heightFunction) return [[]];
      var t, output=[];
      var heights=getHeights();
      var xlength=data.length;
      var ylength=data[0].length;
      for(var x=0;x<xlength;x++){
        output.push(t=[]);
        for(var y=0;y<ylength;y++){
          t.push(transformPoint([(x-xlength/2)/(xlength*1.41)*displayWidth*zoom, heights[x][y]*zoom, (y-ylength/2)/(ylength*1.41)*displayWidth*zoom]));
        }
      }
      return output;
    };
    var renderSurface=function(){
      var originalData=node.datum();
      var data=getTransformedData();
      var xlength=data.length;
      var ylength=data[0].length;
      var d0=[];
      var idx=0;
      for(var x=0;x<xlength-1;x++){
        for(var y=0;y<ylength-1;y++){
          var depth=data[x][y][2]+data[x+1][y][2]+data[x+1][y+1][2]+data[x][y+1][2];
          d0.push({
            path:
              'M'+(data[x][y][0]+displayWidth/2).toFixed(10)+','+(data[x][y][1]+displayHeight/2).toFixed(10)+
              'L'+(data[x+1][y][0]+displayWidth/2).toFixed(10)+','+(data[x+1][y][1]+displayHeight/2).toFixed(10)+
              'L'+(data[x+1][y+1][0]+displayWidth/2).toFixed(10)+','+(data[x+1][y+1][1]+displayHeight/2).toFixed(10)+
              'L'+(data[x][y+1][0]+displayWidth/2).toFixed(10)+','+(data[x][y+1][1]+displayHeight/2).toFixed(10)+'Z',
            depth: depth, data: originalData[x][y]
          });
        }
      }
      d0.sort(function(a, b){return b.depth-a.depth});
      var dr=node.selectAll('path').data(d0);
      dr.enter().append("path");
      if(trans){
        dr=dr.transition().delay(trans.delay()).duration(trans.duration());
      }
      dr.attr("d",function(d){return d.path;});
      if(colorFunction){
        dr.attr("fill",function(d){return colorFunction(d.data)});
      }
      trans=false;
    };
    this.renderSurface=renderSurface;
    this.setTurtable=function(yaw, pitch){
      var cosA=Math.cos(pitch);
      var sinA=Math.sin(pitch);
      var cosB=Math.cos(yaw);
      var sinB=Math.sin(yaw);
      transformPrecalc[0]=cosB;
      transformPrecalc[1]=0;
      transformPrecalc[2]=sinB;
      transformPrecalc[3]=sinA*sinB;
      transformPrecalc[4]=cosA;
      transformPrecalc[5]=-sinA*cosB;
      transformPrecalc[6]=-sinB*cosA;
      transformPrecalc[7]=sinA;
      transformPrecalc[8]=cosA*cosB;
      if(timer) clearTimeout(timer);
      timer=setTimeout(renderSurface);
      return this;
    };
    this.setTurtable(0.5,0.1);
    this.surfaceColor=function(callback){
      colorFunction=callback;
      if(timer) clearTimeout(timer);
      timer=setTimeout(renderSurface);
      return this;
    };
    this.surfaceHeight=function(callback){
      heightFunction=callback;
      if(timer) clearTimeout(timer);
      timer=setTimeout(renderSurface);
      return this;
    };
    this.transition=function(){
      var transition=d3.selection.prototype.transition.bind(node)();
      colourFunction=null;
      heightFunction=null;
      transition.surfaceHeight=this.surfaceHeight;
      transition.surfaceColor=this.surfaceColor;
      trans=transition;
      return transition;
    };
    this.setHeight=function(height){
      if(height) displayHeight=height;
    };
    this.setWidth=function(width){
      if(width) displayWidth=width;
    };
  };
  d3.selection.prototype.surface3D=function(width,height){
    if(!this.node().__surface__) this.node().__surface__=new Surface(this);
    var surface=this.node().__surface__;
    this.turntable=surface.setTurtable;
    this.surfaceColor=surface.surfaceColor;
    this.surfaceHeight=surface.surfaceHeight;
    this.zoom=surface.setZoom;
    surface.setHeight(height);
    surface.setWidth(width);
    this.transition=surface.transition.bind(surface);
    return this;
  };
})();

var yaw=0.5, pitch=0.1, width=700, height=400, drag=false;

function dataFromFormular(func){
  var output=[];
  for(var x=-20;x<20;x++){
    var f0=[];
    output.push(f0);
    for(var y=-20;y<20;y++){
        f0.push(func(x,y));
    }
  }
  return output;
}

var surfaces=[
  {
    name: 'Dataset 1',
    data: dataFromFormular(function(x,y){
        return Math.cos(x/15*Math.PI)*Math.cos(y/15*Math.PI)*60+Math.cos(x/8*Math.PI)*Math.cos(y/10*Math.PI)*40;
      })
  }
];
var selected=surfaces[0];


var svg=d3.select('svg.surface')
        .append('svg')
          .attr('height',height)
          .attr('width',width);

var group = svg.append("g");

var md=group.data([surfaces[0].data])
  .surface3D(width,height)
    .surfaceHeight(function(d){
      return d;
    }).surfaceColor(function(d){
      var c=d3.hsl((d+250), 0.9, 0.7).rgb();
      return "rgb("+parseInt(c.r)+","+parseInt(c.g)+","+parseInt(c.b)+")";
    });

svg.on("mousedown",function(){
  drag=[d3.mouse(this),yaw,pitch];
}).on("mouseup",function(){
  drag=false;
}).on("mousemove",function(){
  if(drag){
    var mouse=d3.mouse(this);
    yaw=drag[1]-(mouse[0]-drag[0][0])/50;
    pitch=drag[2]+(mouse[1]-drag[0][1])/50;
    pitch=Math.max(-Math.PI/2,Math.min(Math.PI/2,pitch));
    md.turntable(yaw,pitch);
  }
});
