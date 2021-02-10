const canvas = obj('canvas');
const ctx = canvas.getContext('2d');
const socket = io();
const g = obj('game');
hide(g);
var name = location.href.includes('?')?location.href.split('?')[1]:prompt('Enter Name');
var people;
serverRequests();

let a=16807,seed=1,c=0,m=2147483647;
function pRandom(){
	let pnr = (a*seed+c)%m;
	let r = seed/m;
	seed = pnr;
	return r;
}

function pRandBetween(min,max){
	return Math.floor(min+pRandom()*(max-min+1));
}

for(let i=0;i<10;i++) console.log(pRandBetween(1,10));

async function chooseColor(){
	let p = new Promise((res,rej)=>{
		let c = document.querySelectorAll('.color');
		for(let el of c){
			el.on('click',e=>{
				let c = el.style.backgroundColor;
				hide(obj('colors'));
				res(c);
			});
		}
	});
	return await p;
}

function serverRequests(){
	socket.on('EF-chooseColor',async e=>{
		show(obj('wait'));
		hide(obj('main'));
		chooseColor().then(color=>{
			socket.emit('EF-color',color);
		});
	});

	socket.on('EF-gobutton',e=>{
		let b = create('button','Start');
		obj('wait').appendChild(b);
		b.on('click',e=>{
			socket.emit('EF-begin');
		});
	});

	socket.on('EF-waitdata',e=>{
		people = e;
		obj('peoplein').innerHTML = '';
		for(let person of e){
			let els = document.querySelectorAll('.color');
			for(let el of els){
				if(el.style.backgroundColor==person.color){
					el.remove();
				}
			}
			let p = create('p',person.name);
			p.style.color = person.color.length?person.color:'white';
			obj('peoplein').appendChild(p);
		}
	});

	socket.on('EF-join',e=>{
		let r = create('div',e.name+' wants to join!');
		r.classList.add('req');
		r.innerHTML += '<br>';
		let a = create('div','✔');
		let x = create('div','❌');
		a.style.display='inline';
		x.style.display='inline';
		a.style.fontSize='30px';
		x.style.fontSize='30px';
		a.style.float='right';
		x.style.float='left';
		r.appendChild(a);
		r.appendChild(x);
		a.on('click',()=>{
			r.remove();
			socket.emit('EF-accept',e);
		})
		x.on('click',e=>{
			r.remove();
		})
		obj('req').appendChild(r);
	})

	socket.on('EF-lobby',ppl=>{
		obj('#people').innerHTML = '';
		for(let p of ppl){
			let ln = create('p',p);
			ln.classList.add('ppl');
			obj('#people').appendChild(ln);
			ln.on('click',e=>{socket.emit('EF-request_join_game',p)});
		}
	})

	socket.on('dc',person=>{
		alert(person+' left the game');
	});
}


(function(global){
	const MAP = loadImage('assets/map.jpg');
	const tree = loadImage('assets/tree.jpg');
	const EF = {};
	global.EF = EF;

	socket.emit('EF-setup',name);

	socket.on('EF-lobby',people=>{

	});

	socket.on('EF-delgame',()=>{
		location.href = './index.html?'+name;
	});

	socket.on('EF-game_start',data=>{
		hide(obj('lobby'));
		show(obj('game'));
		setup(data);
		loop();
	})

	var cards = [];
	var trees = [];
	var clips = [];
	var show_hint=false,big_card=false,big_clip=null;

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

	function setup(data){

		seed = data;

		clips = getClips(cards);

		cards.sort((a,b)=>pRandom()-.5);

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
		pile.draw();
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

	EF.start = loop;
	EF.setup = setup;
})(this);