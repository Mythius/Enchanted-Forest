var ingame = [];
var games = [];

const random=(min,max)=>Math.floor(min+Math.random()*(max-min+1));

class Game{
	constructor(admin){
		this.admin = admin;
		this.players = [];
		this.started = false;
		this.colors = ['purple','yellow','green','tan','red','blue'];
		this.turn = -1;
		this.seed = random(0,3000);
		// this.seed = 235;
		this.admin.emit('EF-gobutton');
		this.over = false;
		games.push(this);
		this.addPerson(admin);
		updateLobby();
	}
	caniJoin(person){
		if(this.players.length > 5) return;
		this.admin.emit('EF-join',{name:person.name,id:person.id});
	}
	addPerson(p){
		p.game = this;
		p.emit('EF-chooseColor',this.colors);
		this.players.push(p);
		p.color = '';
		p.points = 0;
		this.sendLobbyInfo();
	}
	sendLobbyInfo(){
		let people = this.players.map(e=>{return {name:e.name,color:e.color}});
		for(let player of this.players) player.emit('EF-waitdata',people);
	}
	delete(){
		let ix = games.indexOf(this);
		if(ix!=-1) games.splice(ix,1);
		for(let p of this.players){
			p.emit('EF-delgame');
			p.game = null;
		}
	}
	msgAll(msg,dat){
		for(let p of this.players){
			p.emit(msg,dat);
		}
	}
	start(){
		for(let p of this.players){
			if(!p.color){
				p.color = this.colors.shift();
			}
		}
		this.sendLobbyInfo();
		setTimeout(()=>{
			this.msgAll('EF-game_start',this.seed);
			this.nextTurn();
		},50);
	}
	nextTurn(){
		if(this.other) return;
		this.turn = (this.turn+1)%this.players.length;
		let cp = this.players[this.turn];
		let d = {pix:this.turn,points:cp.points,color:cp.color,name:cp.name,d1:random(1,6),d2:random(1,6)};
		// let d = {pix:this.turn,points:cp.points,color:cp.color,name:cp.name,d1:6,d2:6};
		this.msgAll('EF-turn',d);
	}
}

function updateLobby(){
	let data = games.filter(e=>!e.started).map(e=>e.admin.name);
	for(let person of ingame){
		if(!person.game){
			person.emit('EF-lobby',data);
		}
	}
}

function handleData(player){
	var socket = player.socket;
	socket.emit('EF-lobby',games.filter(e=>!e.started).map(e=>e.admin.name));
	socket.on('EF-request_join_game',name=>{
		let game = games.filter(e=>!e.started&&e.admin.name==name)[0];
		if(game){
			game.caniJoin(player);
		} else {
			player.emit('EF-delgame');
		}
	});
	socket.on('EF-accept',p=>{
		if(player.game.admin!=player) return;
		let person = ingame.filter(e=>e.id==p.id)[0];
		if(!person) return;
		player.game.addPerson(person);
	});
	socket.on('EF-newgame',()=>{
		if(player.game) return;
		new Game(player);
	});
	socket.on('EF-color',color=>{
		let ix = player.game.colors.indexOf(color);
		if(ix!=-1) player.game.colors.splice(ix,1);
		player.color = color;
		player.game.sendLobbyInfo();
	});
	socket.on('EF-begin',e=>{
		player.game.start();
	});
	socket.on('EF-nextturn',scored=>{
		player.game.nextTurn();
	});
	socket.on('EF-turninfo',data=>{
		let person = player.game.players.indexOf(player);
		console.log({data,person});
		player.game.msgAll('EF-otherturn',{data,person});
	});
	socket.on('EF-sendpoints',data=>{
		player.points++;
		let ix = 0;
		let players = player.game.players.map(player=>{
			return {ix:ix++,points:player.points,name:player.name};
		});
		console.log('Updating Points:',players);
		player.game.msgAll('EF-showPoints',players);
		if(player.points > 2){
			player.game.msgAll('EF-winner',player.name);
			player.game.over = true;
		}
	});
}

function addPlayer(player){
	ingame.push(player);
	handleData(player);
}

function removePlayer(player){
	if(!player.game) return;
	if(player.game.admin == player){
		player.game.delete();
	} else if(player.game){
		player.game.admin.emit('dc',player.name);
		let ix = player.game.players.indexOf(player);
		if(ix!=-1) player.game.players.splice(ix,1);
	}
	let ix = ingame.indexOf(player);
	if(ix!=-1) ingame.splice(ix,1);
	updateLobby();
}

exports.addPlayer = addPlayer;
exports.removePlayer = removePlayer;