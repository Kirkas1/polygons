var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

var stats_canvas = document.getElementById("stats_canvas");
var stats_ctx = stats_canvas.getContext("2d");

var NONCONFORM = 1.00;
var BIAS = 0.33;
var TILE_SIZE = 30;
var PEEP_SIZE = 30;
var GRID_SIZE = 20;
var DIAGONAL_SQUARED = (TILE_SIZE+5)*(TILE_SIZE+5) + (TILE_SIZE+5)*(TILE_SIZE+5);



window.RATIO_TRIANGLES = 0.25;
window.RATIO_SQUARES = 0.25;
window.RATIO_PENTAGONS = 0.25;
window.EMPTINESS = 0.25;


var assetsLeft = 0;
var onImageLoaded = function(){
	assetsLeft--;
};

var images = {};
function addAsset(name,src){
	assetsLeft++;
	images[name] = new Image();
	images[name].onload = onImageLoaded;
	images[name].src = src;
}
addAsset("yayTriangle","../img/yay_triangle.png");
addAsset("mehTriangle","../img/meh_triangle.png");
addAsset("sadTriangle","../img/sad_triangle.png");
addAsset("yaySquare","../img/yay_square.png");
addAsset("mehSquare","../img/meh_square.png");
addAsset("sadSquare","../img/sad_square.png");
addAsset("yayPentagon","../img/yay_pentagon.png");
addAsset("mehPentagon","../img/meh_pentagon.png");
addAsset("sadPentagon","../img/sad_pentagon.png");

var IS_PICKING_UP = false;
var lastMouseX, lastMouseY;

function Draggable(x,y){
	
	var self = this;
	self.x = x;
	self.y = y;
	self.gotoX = x;
	self.gotoY = y;

	var offsetX, offsetY;
	var pickupX, pickupY;
	self.pickup = function(){

		IS_PICKING_UP = true;

		pickupX = (Math.floor(self.x/TILE_SIZE)+0.5)*TILE_SIZE;
		pickupY = (Math.floor(self.y/TILE_SIZE)+0.5)*TILE_SIZE;
		offsetX = Mouse.x-self.x;
		offsetY = Mouse.y-self.y;
		self.dragged = true;

		// Dangle
		self.dangle = 0;
		self.dangleVel = 0;

		// Draw on top
		var index = draggables.indexOf(self);
		draggables.splice(index,1);
		draggables.push(self);

	};

	self.drop = function(){

		IS_PICKING_UP = false;

		var px = Math.floor(Mouse.x/TILE_SIZE);
		var py = Math.floor(Mouse.y/TILE_SIZE);
		if(px<0) px=0;
		if(px>=GRID_SIZE) px=GRID_SIZE-1;
		if(py<0) py=0;
		if(py>=GRID_SIZE) py=GRID_SIZE-1;
		var potentialX = (px+0.5)*TILE_SIZE;
		var potentialY = (py+0.5)*TILE_SIZE;

		var spotTaken = false;
		for(var i=0;i<draggables.length;i++){
			var d = draggables[i];
			if(d==self) continue;
			var dx = d.x-potentialX;
			var dy = d.y-potentialY;
			if(dx*dx+dy*dy<10){
				spotTaken=true;
				break;
			}
		}

		if(spotTaken){
			self.gotoX = pickupX;
			self.gotoY = pickupY;
		}else{
			
			STATS.steps++;
			writeStats();

			self.gotoX = potentialX;
			self.gotoY = potentialY;
		}

		self.dragged = false;

	}

	var lastPressed = false;
	self.update = function(){

		// Shakiness?
		self.shaking = false;
		self.bored = false;

		if(!self.dragged){
			var neighbors = 0;
			var same = 0;
			for(var i=0;i<draggables.length;i++){
				var d = draggables[i];
				if(d==self) continue;
				var dx = d.x-self.x;
				var dy = d.y-self.y;
				if(dx*dx+dy*dy<DIAGONAL_SQUARED){
					neighbors++;
					if(d.color==self.color){
						same++;
					}
				}
			}
			if(neighbors>0){
				self.sameness = (same/neighbors);
			}else{
				self.sameness = 1;
			}
			if(self.sameness<BIAS || self.sameness>NONCONFORM){
				self.shaking = true;
			}
			if(self.sameness>0.99){
				self.bored = true;
			}
			if(neighbors==0){
				self.shaking = false;
			}
		}

		// Dragging
		if(!self.dragged){
			if((self.shaking||window.PICK_UP_ANYONE) && Mouse.pressed && !lastPressed){
				var dx = Mouse.x-self.x;
				var dy = Mouse.y-self.y;
				if(Math.abs(dx)<PEEP_SIZE/2 && Math.abs(dy)<PEEP_SIZE/2){
					self.pickup();
				}
			}
		}else{
			self.gotoX = Mouse.x - offsetX;
			self.gotoY = Mouse.y - offsetY;
			if(!Mouse.pressed){
				self.drop();
			}
		}
		lastPressed = Mouse.pressed;

		// Going to where you should
		self.x = self.x*0.5 + self.gotoX*0.5;
		self.y = self.y*0.5 + self.gotoY*0.5;

	};

	self.frame = 0;
	self.draw = function(){
		ctx.save();
		ctx.translate(self.x,self.y);
		
		if(self.shaking){
			self.frame+=0.07;
			ctx.translate(0,20);
			ctx.rotate(Math.sin(self.frame-(self.x+self.y)/200)*Math.PI*0.05);
			ctx.translate(0,-20);
		}

		// Draw thing
		var img;
		if(self.color=="triangle"){
			if(self.shaking){
				img = images.sadTriangle;
			}else if(self.bored){
				img = images.mehTriangle;
			}else{
				img = images.yayTriangle;
			}
		}else if(self.color=="square"){
			if(self.shaking){
				img = images.sadSquare;
			}else if(self.bored){
				img = images.mehSquare;
			}else{
				img = images.yaySquare;
			}
		}else{
			if(self.shaking){
				img = images.sadPentagon;
			}else if(self.bored){
				img = images.mehPentagon;
			}else{
				img = images.yayPentagon;
			}
        }

		// Dangle
		if(self.dragged){
			self.dangle += (lastMouseX-Mouse.x)/100;
			ctx.rotate(-self.dangle);
			self.dangleVel += self.dangle*(-0.02);
			self.dangle += self.dangleVel;
			self.dangle *= 0.9;
		}

		ctx.drawImage(img,-PEEP_SIZE/2,-PEEP_SIZE/2,PEEP_SIZE,PEEP_SIZE);
		ctx.restore();
	};

}

window.START_SIM = false;

var draggables;
var STATS;
window.reset = function(){

	STATS = {
		steps:0,
		offset:0
	};
	START_SIM = false;

	stats_ctx.clearRect(0,0,stats_canvas.width,stats_canvas.height);

	draggables = [];
	for(var x=0;x<GRID_SIZE;x++){
		for(var y=0;y<GRID_SIZE;y++){
            var rand = Math.random();
			if(rand<(1-window.EMPTINESS)){
				var draggable = new Draggable((x+0.5)*TILE_SIZE, (y+0.5)*TILE_SIZE);
                if(rand<window.RATIO_TRIANGLES){
                    draggable.color = "triangle";
                }else if(rand<(window.RATIO_TRIANGLES+window.RATIO_SQUARES)){
                    draggable.color = "square";
                }else{
                    draggable.color = "pentagon";
                }
				draggables.push(draggable);
			}
		}
	}

	// Write stats for first time
	for(var i=0;i<draggables.length;i++){
		draggables[i].update();
	}
	writeStats();

}

window.render = function(){

	if(assetsLeft>0 || !draggables) return;
	
	// Is Stepping?
	if(START_SIM){
		step();
	}

	// Draw
	Mouse.isOverDraggable = IS_PICKING_UP;
	ctx.clearRect(0,0,canvas.width,canvas.height);
	for(var i=0;i<draggables.length;i++){
		var d = draggables[i];
		d.update();

		if(d.shaking || window.PICK_UP_ANYONE){
			var dx = Mouse.x-d.x;
			var dy = Mouse.y-d.y;
			if(Math.abs(dx)<PEEP_SIZE/2 && Math.abs(dy)<PEEP_SIZE/2){
				Mouse.isOverDraggable = true;
			}
		}

	}
	for(var i=0;i<draggables.length;i++){
		draggables[i].draw();
	}

	// Done stepping?
	if(isDone()){
		doneBuffer--;
		if(doneBuffer==0){
			doneAnimFrame = 30;
			START_SIM = false;
			console.log("DONE");
			writeStats();
		}
	}else if(START_SIM){
		
		STATS.steps++;
		doneBuffer = 30;

		// Write stats
		writeStats();

	}
	if(doneAnimFrame>0){
		doneAnimFrame--;
		var opacity = ((doneAnimFrame%15)/15)*0.2;
		canvas.style.background = "rgba(255,255,255,"+opacity+")";
	}else{
		canvas.style.background = "none";
	}

	// Mouse
	lastMouseX = Mouse.x;
	lastMouseY = Mouse.y;

}
var segregation_text = document.getElementById("segregation_text");
if(!segregation_text){
    var segregation_text = document.getElementById("stats_text");
}
var shaking_text = document.getElementById("sad_text");
var bored_text = document.getElementById("meh_text");

var tmp_stats = document.createElement("canvas");
tmp_stats.width = stats_canvas.width;
tmp_stats.height = stats_canvas.height;

window.writeStats = function(){

	if(!draggables || draggables.length==0) return;

	// Average Sameness Ratio
	// Average shaking 
	// Average bored 
	var total = 0;
    var total_shake = 0;
    var total_bored = 0;
	for(var i=0;i<draggables.length;i++){
		var d = draggables[i];
		total += d.sameness || 0;
        total_shake += (d.shaking?1:0);
        total_bored += (d.bored?1:0);
	}
	var avg = total/draggables.length;
	var avg_shake = total_shake/draggables.length;
	var avg_bored = total_bored/draggables.length;
	if(isNaN(avg)) debugger;

	// If stats oversteps, bump back
	if(STATS.steps>320+STATS.offset){
		STATS.offset += 120;
		var tctx = tmp_stats.getContext("2d");
		tctx.clearRect(0,0,tmp_stats.width,tmp_stats.height);
		tctx.drawImage(stats_canvas,0,0);
		stats_ctx.clearRect(0,0,stats_canvas.width,stats_canvas.height);
		stats_ctx.drawImage(tmp_stats,-119,0);
	}

	// AVG -> SEGREGATION
	var segregation = (avg-0.5)*2;
	var segregation = avg;
	if(segregation<0) segregation=0;

	// Graph it
	stats_ctx.fillStyle = "#cc2727";
	var x = STATS.steps - STATS.offset;
	var y = 250 - segregation*250+10;
	stats_ctx.fillRect(x,y,1,5);
	// Text
	segregation_text.innerHTML = Math.floor(segregation*100)+"%";
	segregation_text.style.top = Math.round(y-15)+"px";
	segregation_text.style.left = Math.round(x+35)+"px";

	stats_ctx.fillStyle = "#2727cc";
	y = 250 - avg_shake*250+10;
	stats_ctx.fillRect(x,y,1,5);
	// Text
    if(shaking_text){
        shaking_text.innerHTML = Math.floor(avg_shake*100)+"%";
        shaking_text.style.top = Math.round(y-15)+"px";
        shaking_text.style.left = Math.round(x+35)+"px";
    }

	stats_ctx.fillStyle = "#cccc27";
	y = 250 - avg_bored*250+10;
	stats_ctx.fillRect(x,y,1,5);
	// Text
    if(bored_text){
	bored_text.innerHTML = Math.floor(avg_bored*100)+"%";
	bored_text.style.top = Math.round(y-15)+"px";
	bored_text.style.left = Math.round(x+35)+"px";
    }

	// Button
	if(START_SIM){
		document.getElementById("moving").classList.add("moving");
	}else{
		document.getElementById("moving").classList.remove("moving");
	}

}

var doneAnimFrame = 0;
var doneBuffer = 30;
function isDone(){
	if(Mouse.pressed) return false;
	for(var i=0;i<draggables.length;i++){
		var d = draggables[i];
		if(d.shaking) return false;
	}
	return true;
}

function step() {

	// Stores which algorithm is selected
	// 0 for random					id : #random
	// 1 for happiness				id : #happiness
	// 2 for collective happiness	id : #collective
	var selectedAlgo = 0;
	if(document.getElementById("happiness").checked) {
		selectedAlgo = 1;
	} else if(document.getElementById("collective").checked) {
		selectedAlgo = 2;
	}

	// Was used to test algorithm selected
	//console.log(selectedAlgo);

	// Get all shakers
	var shaking = [];
	for(var i=0;i<draggables.length;i++){
		var d = draggables[i];
		if(d.shaking) shaking.push(d);
	}

	// Pick a random shaker
	if(shaking.length==0) return;
	var shaker = shaking[Math.floor(Math.random()*shaking.length)];

	// Go through every spot, get all empty ones
	var empties = [];
	for(var x=0;x<GRID_SIZE;x++){
		for(var y=0;y<GRID_SIZE;y++){

			var spot = {
				x: (x+0.5)*TILE_SIZE,
				y: (y+0.5)*TILE_SIZE
			}

			var spotTaken = false;
			for(var i=0;i<draggables.length;i++){
				var d = draggables[i];
				var dx = d.gotoX-spot.x;
				var dy = d.gotoY-spot.y;
				if(dx*dx+dy*dy<10){
					spotTaken=true;
					break;
				}
			}

			if(!spotTaken){
				empties.push(spot);
			}

		}
	}

    // Go to a random empty spot
	var tspot;
	if (selectedAlgo == 0) {
	    tspot = empties[Math.floor(Math.random() * empties.length)];
	}
	if (selectedAlgo == 1) {
	    for (var j = 0; j < empties.length; j++) {
	        var spots = []
	        spot = empties[j];
	        var neighbors = 0;
	        var same = 0;
	        for (var i = 0; i < draggables.length; i++) {
	            var t = draggables[i];
	            var tx = t.x - spot.x;
	            var ty = t.y - spot.y;
	            if (shaker == t) continue;
	            if (tx * tx + ty * ty < DIAGONAL_SQUARED) {
	                neighbors++;
	                if (shaker.color == t.color) {
	                    same++;
	                }
	            }
	        }
            if (neighbors > 0) {
	            shaker.sameness = (same / neighbors);
	        } else {
	            shaker.sameness = 1;
	        }
	        if (shaker.sameness > BIAS && shaker.sameness < NONCONFORM) {
	            tspot = spot
	        }
	        if (neighbors == 0) {
	            tspot = spot;
	        }
	    }
	    //tspot = spots[Math.floor(Math.random() * spots.length)];

	}
	if (selectedAlgo == 2) {

	    for (var j = 0; j < empties.length; j++) {
	        var neigbors = [];
	        spot = empties[j];
	        var neighborsa = 0;
	        var same = 0;
	        var thappy = true;
	        for (var i = 0; i < draggables.length; i++) {
	            var t = draggables[i];
	            var tx = t.x - spot.x;
	            var ty = t.y - spot.y;
	            if (shaker == t) continue;
	            if (tx * tx + ty * ty < DIAGONAL_SQUARED) {
	                neighborsa.push(t);
	                neighbors++;
	                if (shaker.color == t.color) {
	                    same++;
	                }
	            }
	        }
	            if (neighbors > 0) {
	                shaker.sameness = (same / neighbors);
	            } else {
	                shaker.sameness = 1;
	            }
	            if (shaker.sameness < BIAS || shaker.sameness > NONCONFORM) {
	                thappy = false;
	            }

	        for (var l = 0; l < neighborsa.length; l++) {
	            var neigbors2 = 0;
	            var same2 = 0;
	            for (var i = 0; i < draggables.length; i++) {
	                var t = draggables[i];
	                var tx = t.x - neigborsa[l].x;
	                var ty = t.y - neighborsa[l].y;
	                if (shaker == t) continue;
	                if (tx * tx + ty * ty < DIAGONAL_SQUARED) {
	                    neighbors2++;
	                    if (neigborsa[l].color == t.color) {
	                        same2++;
	                    }
	                }
	            }
	                neigbors2++;
	                if (neigborsa[l].color == shaker.color) {
	                    same2++;
	                }
	                if (neighbors2 > 0) {
	                    neighborsa[l].sameness = (same2 / neighbors2);
	                } else {
	                    neighborsa[l].sameness = 1;
	                }
	                if (neighborsa[l].sameness < BIAS || neighborsa[l].sameness > NONCONFORM) {
	                    thappy = false;
	                }
	            
	        }

	    }
	    
	    if (thappy == true) {
	        tspot = spot;
	    }
	}
	if(!tspot) return;
	shaker.gotoX = tspot.x;
	shaker.gotoY = tspot.y;

}

////////////////////
// ANIMATION LOOP //
////////////////////
window.requestAnimFrame = window.requestAnimationFrame ||
	window.webkitRequestAnimationFrame ||
	window.mozRequestAnimationFrame ||
	function(callback){ window.setTimeout(callback, 1000/60); };
(function animloop(){
	requestAnimFrame(animloop);
	if(window.IS_IN_SIGHT){
		render();
	}
})();

window.IS_IN_SIGHT = false;

window.onload=function(){
	reset();
}
