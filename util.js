let CONFIG	= {};

let util	= new function() {
	this.historyRow			= 6,
	this.historyCol			= 90,
	this.stateBackup		= {},
	this.updateInformation		= function(game,address,data,rate) {
		wallet.updateTimer(true);

		let coin	= (game=='jackpot649'?wallet.coins[1]['name']:wallet.coins[0]['name']);
		let table	= "<div style='overflow-x:auto;'><table class='table table-striped table-hover'><tbody>";
		table			+='<tr><td>Contract</td><td><a style="cursor:hand" onClick="window.open(\''+WALLET[WALLET['net']]['href']+'/address/'+address+'\',\'_blank\')"><small>'+address+"</small></td></tr>";

		switch(game){
			case 'jackpot649':
			case 'lotto49':
			case 'lotto525':
				table	+="<tr><td>Round</td><td>"+data[0]+" <small>("+util.getGameState(parseInt(data[1]))+")</small></td></tr>";
				break;
			default:
				table	+="<tr><td>Round</td><td>"+data[0][0] +"-" + data[0][1] +" <small>("+util.getGameState(parseInt(data[1]))+")</small></td></tr>";
				break;
		}

		table	+="<tr><td>Balance</td><td>"+wallet.web3.utils.fromWei(data[3]).toString()+wallet.coins[0]['name']+"</td></tr>";
		table	+="<tr><td>Bet</td><td>"+wallet.web3.utils.fromWei(data[4]).toString()+coin+"</td></tr>";
		table	+="<tr><td>Transfer fee</td><td>"+parseInt(data[5])+" %</td></tr>";
		if(parseInt(rate)!=0)
			table	+="<tr><td>Mileage</td><td> 1"+wallet.coins[0]['name']+" = "+parseInt(rate)+wallet.coins[1]['name']+"</td></tr>";
		table	+="</tbody></table></div>";

		modal.update(CONFIG[game]['name'],table);
	},
	this.win				= function(game,openCards) {
		let win			= 0;
		let toolTip	= '';

		switch(game){
			case 'baccarat':
				let b	= (util.cut10(util.card(openCards['1st'][0]))+util.cut10(util.card(openCards['1st'][1])))%10;
				b		= openCards['1st'][2]==0?b:(b+util.cut10(util.card(openCards['1st'][2])))%10;
				let p	= (util.cut10(util.card(openCards['2nd'][0]))+util.cut10(util.card(openCards['2nd'][1])))%10;
				p		= openCards['2nd'][2]==0?p:(p+util.cut10(util.card(openCards['2nd'][2])))%10;
				toolTip = '('+b+','+p+')';
				win 		= b>p?1:b<p?2:3;
				break;
			case 'dragontiger':
				let d	= util.card(openCards['1st'][0]);
				let t	= util.card(openCards['2nd'][0]);
				toolTip = '('+d+','+t+')';
				win 		= d>t?1:d<t?2:3;
				break;
			case 'highlow':
				let c1	= util.card(openCards['1st'][0]);
				let c2	= util.card(openCards['2nd'][0]);
				toolTip = '('+c1+','+c2+')';
				win 		= c2>c1?1:c2<c1?2:3;
				break;
		}

		return {'win':win,'toolTip':toolTip};
	},
	this.card			= function(index) {
		return (index-1)%13+1;
	},
	this.cut10			= function(num) {
		return num>9?0:num;
	},
	this.openCards		= function(raw) {
		return {'1st':[util.bitwise(raw,0),util.bitwise(raw,8),util.bitwise(raw,16),util.bitwise(raw,24)],'2nd':[util.bitwise(raw,32),util.bitwise(raw,40),util.bitwise(raw,48),util.bitwise(raw,56)]};
	},
	this.bitwise			= function(num, from, size=8, length=64) {
		let str			= (new wallet.web3.utils.BN(num)).toString(2);
		if (str.length < length) str = Array(length - str.length + 1).join("0") + str;
		return parseInt( str.slice(length-from-size,str.length-from), 2 );
	},
	this.binaryString	= function(num,length=64) {
		let str			= (new wallet.web3.utils.BN(num)).toString(2);
		if (str.length < length) str = Array(length - str.length + 1).join("0") + str;
		return str;
	},
	this.getGameState	= function (state) {
		let result	= '';
		switch(state) {
		case 0:
			result = "Ready";
			break;
		case 1:
			result = "Open";
			break;
		case 2:
			result = "Close";
			break;
		case 3:
			result = "Done";
			break;
		}
		return result;
	},
	this.getLottoMaxMarkCol= function(game){
		let max		= 0;
		let mark	= 0;
		let col		= 0;
		switch(game) {
			case 'jackpot649':	max=49;	mark=6;	col=3;	break;
			case 'lotto49':			max=9;	mark=4;	col=6;	break;
			case 'lotto525':		max=25;	mark=5;	col=4;	break;
		}
		return {'max':max,'mark':mark,'col':col};
	},
	this.getNumCircle	= function(num,opacity=1,isRed=false) {
		if(isRed)
			return '<a class="numberCircle2" style="opacity: '+opacity+';">'+num+'</a>';
		return '<a class="numberCircle1" style="opacity: '+opacity+';">'+num+'</a>';
	},
	this.isGameAddress	= function(game,address){
		for(let i=0;i<CONFIG[game]['address'].length;i++)
			if(CONFIG[game]['address'][i]==address)
				return true;
		return false;
	},
	this.ticketLottoMark	= function (ticket,max,mark) {
		if(util.ticketLottoMarkCount(ticket,max)>mark)
			return false;
		return true;
	},
	this.ticketLottoMarkCount = function (ticket,max) {
		let count = 0;
		for(let i=0;i<max;i++)
			if($('#t'+ticket+'_'+i).prop('checked'))
				count++;
		return count;
	},
	this.ticketLottoRandom=function (ticket,max,mark) {
		let marks	= [];

		for(let k=0;k<max;k++)
			marks.push(k);

		for(let i=0;i<marks.length;i++) {
			$('#t'+ticket+'_'+i).prop('checked',false);

			let s = Math.floor(Math.random() * marks.length);
			let b = marks[i];
			marks[i] = marks[s];
			marks[s] = b;
		}

		for(let j=0 ; j<mark ; j++)
			$('#t'+ticket+'_'+marks[j]).prop('checked',true);
	},
	this.updateBtn			= function(game,address) {
		let btn		= '<button data-toggle="modal" data-target="#modlg" type="button" class="btn btn-link btn-sm text-secondary" onClick="page.openInfo(\''+game+'\',\''+address+'\')"><i class="material-icons" style="font-size:20px;">announcement</i></button>';

		// todo : for more lotto
		switch(game) {
		case 'jackpot649':
		case 'lotto49':
		case 'lotto525':
			let maxMark = util.getLottoMaxMarkCol(game);
			btn	='<button data-toggle="modal" data-target="#modlg" type="button" class="btn btn-link btn-sm text-secondary" onClick="page.openLottoHistory(\''+game+'\',\''+address+'\')"><i class="material-icons" style="font-size:20px;">history</i></button>'+btn;
			if(wallet.state()==2) {
				btn	='<button data-toggle="modal" data-target="#modlg" type="button" class="btn btn-link btn-sm text-secondary" onClick="util.myBet(\''+game+'\',\''+address+'\')"><i class="material-icons" style="font-size:20px;">receipt</i></button>'+btn;
				btn	='<button data-toggle="modal" data-target="#modlg" type="button" class="btn btn-link btn-sm text-secondary" onClick="page.ticket(\''+game+'\',\''+address+'\','+maxMark.max+','+maxMark.mark+')"><i class="material-icons" style="font-size:20px;">create</i></button>'+btn;
			}
			break;
		default:
			if(wallet.state()==2) {
				btn	='<button data-toggle="modal" data-target="#modlg" type="button" class="btn btn-link btn-sm text-secondary" onClick="util.myBet(\''+game+'\',\''+address+'\')"><i class="material-icons" style="font-size:20px;">receipt</i></button>'+btn;
				btn	='<button type="button" class="btn btn-link btn-sm text-secondary" onClick="page.play(\''+game+'\',\''+address+'\')"><i class="material-icons" style="font-size:20px;">create</i></button>'+btn;
			}
			break;
		}
		// todo : for more lotto

		return	btn;
	},
	this.myBet	= function(game,address) {
		modal.update(CONFIG[game]['name'],"Now Loading...");

		let index		= (game=='jackpot649'?18:17);
		let topics	= 'topic0='+CONFIG[game]['abi'][index]['signature'];

		wallet.getLogs(address,topics,(logs)=>{	// ??? :storage.address
			let list 	= new Array();

			for(let i=0;i<logs.length;i++) {
				let bet = wallet.web3.eth.abi.decodeLog(CONFIG[game]['abi'][index]['inputs'],logs[i].data,logs[i].topics);
				if(bet[1].toUpperCase()==storage.address.toUpperCase())
					list.push(bet);
			}

			if(list.length==0) {
				modal.update(CONFIG[game]['name'],"No Tickets...");
			} else {
				let table	= "<div style='overflow-x:auto;'><table class='table table-striped table-hover'><tbody>";
				table	+="<tr>My tickets</tr>";
				switch(game){
					case 'jackpot649':
					case 'lotto49':
					case 'lotto525':
						let round = -1;
						for(let i = 0 ; i < list.length ; i++) {
							if(round!=list[i][0])
								table	+="<tr><td><strong>Round "+list[i][0]+"</strong></td></tr>";
							round = list[i][0];
							for(let j = 0 ; j < list[i][2].length ; j++) {
								let temp		= (new wallet.web3.utils.BN(list[i][2][j])).toString(2);
								let ticket	='';
								for(let j=temp.length-1,k=1;j>=0;j--,k++)
									ticket	+= temp[j]=='1'?'<a class="numberCircle1">'+k+'</a>':'';
								table	+="<tr><td>"+ticket+"</td></tr>";
							}
						}
						break;
					default:
						// todo : mybet
						break;
				}
				table		+="</tbody></table></div>";
				modal.update(CONFIG[game]['name'],table);
			}
		});
	},
	this.updateCasino	= function(game,address,data) {
		$('#bal_'+game+'_'+address).html("Balance : "+wallet.web3.utils.fromWei(parseInt(data[3]).toString(),'ether')+wallet.coins[0]['name']);

		if(!util.stateBackup[address]) {
			$('#btn_'+game+'_'+address).html(util.updateBtn(game,address));
			$('#price_'+game+'_'+address).html("Bet : "+wallet.web3.utils.fromWei(parseInt(data[4]).toString(),'ether')+wallet.coins[0]['name']);
			util.stateBackup[address]	= {'round':data[0],'state':data[1],'wallet':wallet.state()};
		}
		else if(util.stateBackup[address]['round'][0]	== data[0][0] && util.stateBackup[address]['round'][1]	== data[0][1] && util.stateBackup[address]['state']	== data[1] && util.stateBackup[address]['wallet']	== wallet.state())
			return;

		$('#btn_'+game+'_'+address).html(util.updateBtn(game,address));
		$('#price_'+game+'_'+address).html("Bet : "+wallet.web3.utils.fromWei(parseInt(data[4]).toString(),'ether')+wallet.coins[0]['name']);
		$('#rnd_'+game+'_'+address).html("Round "+parseInt(data[0][0])+"-"+parseInt(data[0][1])+'<small> ('+util.getGameState(parseInt(data[1]))+')</small>');

		let history = new Array();

		for(let i = 0 ; i < parseInt(data[0][1]-1) ; i++)
			history.push(util.openCards(new wallet.web3.utils.BN(data[6][i])));

		for(let i = 0 ; i < util.historyRow ; i ++)
			for(let j = 0 ; j < util.historyCol ; j++)
				$('#history_'+game+'_'+address+'_'+j+'_'+i).html('&nbsp');

		let red		= "<i class='material-icons' style='font-size:16px;color:red'>brightness_1</i>";
		let blue	= "<i class='material-icons' style='font-size:16px;color:blue'>brightness_1</i>";
		let green	= "<i class='material-icons' style='font-size:16px;color:green'>brightness_1</i>";

		let x1		= 0;
		let x2		= 0;
		let y			= 0;
		let b			= -1;

		for(let i = 0 ; i < history.length ; i++){
			let temp		= util.win(game,history[i]);
			let win			= temp['win'];
			let	toolTip	= temp['toolTip'];

			if(b==win) {
				if(y == (util.historyRow-1) || $('#history_'+game+'_'+address+'_'+x1+'_'+(y+1)).html()!='&nbsp;' ) {
					x2++;
				} else {
					y++;
				}
			} else if(b!=-1) {
				x1++;
				x2= 0;
				y	= 0;
			}

			let marker	= '!';

			if(win==1)			marker = red;		// banker, dragon, high
			else if(win==2)	marker = blue;	// player, tigher, low
			else if(win==3)	marker = green;	// tie

			$('#history_'+game+'_'+address+'_'+(x1+x2)+'_'+y).html('<a style="cursor:hand" data-toggle="tooltip" title="'+toolTip+'">'+marker+'</a>');

			b = win;
		}
	}
}
