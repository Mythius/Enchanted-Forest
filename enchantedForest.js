var ingame = [];
var games = [];

const random=(min,max)=>Math.floor(min+Math.random()*(max-min+1));

class Game{
	constructor(admin){
		this.admin = admin;
		this.players = [];
		this.started = false;
		this.colors = ['purple','yellow','green','tan','orange','blue'];
		this.turn = 0;
		this.seed = random(0,3000);
		this.admin.emit('EF-gobutton');
		games.push(this);
		this.addPerson(admin);
		updateLobby();
	}
	caniJoin(person){
		this.admin.emit('EF-join',{name:person.name,id:person.id});
	}
	addPerson(p){
		p.game = this;
		p.emit('EF-chooseColor',this.colors);
		this.players.push(p);
		p.color = '';
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
		player.game.msgAll('EF-game_start',player.game.seed);
	});
}

function addPlayer(player){
	ingame.push(player);
	player.loc = 'EF-lobby';
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