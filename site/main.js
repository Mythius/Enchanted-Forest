const canvas = obj('canvas');
const ctx = canvas.getContext('2d');
const MAP = loadImage('assets/map.jpg');
const tree = loadImage('assets/tree.jpg');

var cards = [];
var trees = [];
var clips = [];
var show_hint = true,big_card = false,big_clip=null;

xml('assets/positions.json',data=>{
	let objs = JSON.parse(data);
	let ix = 0;
	for(let obj of objs) {
		new Circle(obj,ix++);
	}
	xml('assets/connections.json',data=>{
		let objs = JSON.parse(data);
		for(let obj of objs){
			Circle.all[obj.t].addCon(Circle.all[obj.f]);
		}
	});
});
xml('assets/treepos.json',data=>{
	let objs = JSON.parse(data);
	let ix = 0;
	for(let obj of objs){
		new Tree(obj,ix++);
	}
});



mouse.start(canvas);
keys.start();

for(let i=0;i<13;i++){
	let name = 'assets/'+('00'+i).slice(-2)+'.jpg';
	cards.push({img:loadImage(name),ix:i});
}


function loadImage(src){
	let img = new Image;
	img.src = src;
	return img;
}

function setup(){

	clips = getClips(cards);

	cards.sort((a,b)=>Math.random()-.5);

	for(let i=0;i<13;i++){
		Tree.all[i].assignHint(i,clips[i]);
	}
}

setTimeout(setup,500);

function getClips(cards){
	let cnv = create('canvas');
	let cctx = cnv.getContext('2d');
	var clips = [];
	// document.body.appendChild(cnv);
	for(let card of cards){
		cnv.width = 255*2;
		cnv.height = 255*2;
		cctx.beginPath();
		cctx.arc(340-82,368-109,255,0,Math.PI*2);
		cctx.clip();
		cctx.drawImage(card.img,-82,-109);
		clips.push(loadImage(cnv.toDataURL()));
	}
	return clips;
}

function loop(){
	setTimeout(loop,1000/30);
	ctx.clearRect(-2,-2,canvas.width+2,canvas.height+2);
	drawMap();
	pile.draw('red');
}

let pile = new Button(574,215,63,111,onclick=>{
	let topcard = cards[0].ix;
	big_card = true;
	setTimeout(()=>{
		big_card = false;
	},5000);
});

function drawMap(){
	ctx.drawImage(MAP,0,0,canvas.width,canvas.height);
	let top = cards[0];
	for(let circle of Circle.all){
		circle.draw();
	}
	for(let tree of Tree.all){
		tree.drawTree();
	}
	Circle.getCurrent()?.draw('red');
	for(let i=0;i<cards.length-1;i++){
		ctx.drawImage(cards[cards.length-i-1].img,545-(big_card?63/2:0),160-(big_card?111/2:0),big_card?63*2:63,big_card?111*2:111);
	}
	if(big_clip){
		big_clip.drawTree();
	}
}



class Tree extends Button{
	static img = loadImage('assets/tree.jpg');
	static all = [];
	constructor(pos,ix){
		function onclick(){
			if(show_hint) this.showHint();
		}
		super(pos.x+17,pos.y+27,36,48,onclick,Tree.img);
		this.pos = pos;
		this.ix = ix;
		this.onclick = onclick;
		this.showing = false;
		Tree.all.push(this);
	}
	assignHint(ix,clip){
		this.hint = ix;
		this.clip = clip;
	}
	drawTree(){
		this.draw();
		if(this.showing && this.clip){
			ctx.drawImage(this.clip,canvas.width/2-100,canvas.height/2-100,200,200);
		}
	}
	async showHint(){
		let prom = new Promise((res,rej)=>{
			this.showing = true;
			big_clip = this;
			setTimeout(()=>{
				this.showing = false;
				big_clip = null;
				res();
			},5000);
		});
		return await prom;
	}
}

class Circle{
	static radius = 11;
	static all = [];
	static getCurrent = function(){
		return Circle.all.filter(e=>e.hasMouse())[0];
	}
	constructor(pos,ix){
		this.pos = pos;
		this.ix = ix;
		this.color = 'black';
		this.cons = [];
		Circle.all.push(this);
	}
	hasMouse(mousepos=mouse.pos){
		let dist = Vector.distance(this.pos.x,this.pos.y,mousepos.x,mousepos.y);
		return dist <= Circle.radius;
	}
	draw(color=this.color){
		// for(let con of this.cons){
		// 	ctx.beginPath();
		// 	ctx.strokeStyle = 'cyan';
		// 	ctx.lineWidth = 5;
		// 	ctx.moveTo(con.pos.x,con.pos.y);
		// 	ctx.lineTo(this.pos.x,this.pos.y);
		// 	ctx.stroke();
		// }
		ctx.beginPath();
		ctx.strokeStyle = color;
		ctx.lineWidth = 2;
		ctx.arc(this.pos.x,this.pos.y,Circle.radius,0,Math.PI*2);
		ctx.stroke();
	}
	addCon(circle){
		this.cons.push(circle);
		circle.cons.push(this);
	}
}

loop();