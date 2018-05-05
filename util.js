let CONFIG	= {};

let storage	= new function() {
	this.wallet		= '',
	this.address	= '',
	this.tx				= '',
	this.time			= 0,
	this.load		= function() {
		if(!storage.hasData())
			return;
		let data				= JSON.parse(localStorage[CONFIG['_name']]);
		storage.wallet	= data.wallet;
		storage.address	= data.address;
		storage.time		= data.time;
	},
	this.save		= function() {
		localStorage[CONFIG['_name']] = storage.wallet!=''?JSON.stringify({'wallet':storage.wallet,'address':storage.address,'tx':storage.tx,'time':storage.time}):'';
	},
	this.hasData		= function() {
		return (typeof localStorage[CONFIG['_name']] !== 'undefined' && localStorage[CONFIG['_name']] != '');
	},
	this.hasStorage	= function() {
		return (typeof(Storage) !== "undefined");
	},
	this.remove		= function() {
		storage.wallet	= '';
		storage.address	= '';
		storage.tx			= '';
		localStorage.removeItem(CONFIG['_name']);
	},
	this.reset		= function() {
		storage.address	= '';
		storage.time		= 0;
	}
}

let wallet	= new function() {
	this.web3					= null,
	this.stateBackup	= -1,
	this.timer				= 1800000,
	this.coins				= [	{'icon':'<span class="ethereum"></span>','name':' Eth','balance':-2,'address':''},
												{'icon':'<span class="ethereum"></span>','name':' Nitro','balance':-2,'address':'0x7Afb74413bDE81006c6e8BC150E0CaCD4c3aEd47','contract':null}],
	this.ERC20ABI			= [{"constant": true,"inputs": [],"name": "name","outputs": [{"name": "","type": "string"}],"payable": false,"type": "function"},{"constant": true,"inputs": [],"name": "decimals","outputs": [{"name": "","type": "uint8"}],"payable": false,"type": "function"},{"constant": true,"inputs": [{"name": "_owner","type": "address"}],"name": "balanceOf","outputs": [{"name": "balance","type": "uint256"}],"payable": false,"type": "function"},{"constant": true,"inputs": [],"name": "symbol","outputs": [{"name": "","type": "string"}],"payable": false,"type": "function"}],
	this.state				= function() {
		if (storage.hasStorage() && storage.hasData() && storage.wallet != '') {
			if(storage.address!=='')
				return 2;
			else
				return 1;
		}
		return 0;
	},
	this.start			= function(mainUpdate) {
		if(!storage.hasStorage())
			modal.alert('This browser is not support storage!');
		else if(!storage.hasData()) {
			storage.remove();
		} else {
			storage.load();
			wallet.updateTimer(true);
		}

		if(CONFIG['_type']=="http") {
			wallet.web3		= new Web3(new Web3.providers.HttpProvider(CONFIG['_provider']));
			setInterval(()=>{wallet.update();mainUpdate();},2000);
		} else {
			wallet.web3		= new Web3(new Web3.providers.WebsocketProvider(CONFIG['_provider']));
			wallet.web3.eth.subscribe('newBlockHeaders',wallet.update);
		}

		for(let i=1 ; i < wallet.coins.length ; i++)
			wallet.coins[i]['contract']	= new wallet.web3.eth.Contract(wallet.ERC20ABI,wallet.coins[i]['address']);

		console.log("web3 :"+wallet.web3.version);
	},
	this.update					= function(){
		wallet.updateTimer(false);
		wallet.updateNavAccount();

		for(let i = 0 ; i < wallet.coins.length ; i++ ) {
			if(wallet.state()==2)
				wallet.updateBalance(i,()=>{
					$('#balance'+i).html(wallet.web3.utils.fromWei(wallet.coins[i]['balance'].toString(),'ether')+wallet.coins[i]['name']);
				});
			else
				wallet.coins[i]['balance'] = -1;
		}
	},
	this.updateTimer		= function(update) {
		let time = new Date().getTime();
		if(wallet.state()!=2)
			return;
		if(time > parseInt(storage.time) + wallet.timer) {
			storage.reset();
			storage.save();
			location.href	= location.origin;
		} else if(update)
			storage.time	= time;
		storage.save();
	},
	this.updateBalance			= function(coin,callback) {
		if(coin==0)
			wallet.web3.eth.getBalance(storage.address,(e,r)=>{
				if(!e&&wallet.state()==2)
					wallet.coins[coin]['balance']=parseInt(r);
				else
					wallet.coins[coin]['balance']=-1;
				callback();
			});
		else
			wallet.coins[coin]['contract'].methods.balanceOf(storage.address).call((e,r)=>{
				if (!e&&wallet.state()==2)
					wallet.coins[coin]['balance']=parseInt(r);
				else
					wallet.coins[coin]['balance']=-1;
				callback();
			});
	},
	this.updateNavAccount	= function() {
		let temp	= wallet.state();
		if(temp==wallet.stateBackup)
			return;

		switch (temp) {
			case 0:
				$('#navAccount').html(	'<a class="dropdown-item" style="cursor:hand" data-toggle="modal" data-target="#modlg" onClick="script:wallet.create()">Create</a>'+
																'<a class="dropdown-item" style="cursor:hand" data-toggle="modal" data-target="#modlg" onClick="script:wallet.restore()">Restore</a>' );
				break;
			case 1:
				$('#navAccount').html(	'<a class="dropdown-item" style="cursor:hand" data-toggle="modal" data-target="#modlg" onClick="script:wallet.logIn()">Login</a>' );
				break;
			case 2:
				let coins = '';
				for(let i = 0 ; i < wallet.coins.length ; i ++)
					coins	+=	'<a class="dropdown-item">'+wallet.coins[i]['icon']+
										'<span id="balance'+i+'" class="withIcon"></span><span>'+	// todo need align right
										'<i class="material-icons" style="cursor:hand;" data-toggle="modal" data-target="#modlg" onClick="script:wallet.withrawal('+i+')">account_balance_wallet</i>'+
										'<i class="material-icons" style="cursor:hand;" data-toggle="modal" data-target="#modlg" onClick="script:wallet.transactions('+i+')">receipt</i></span>';
				$('#navAccount').html(	coins + '<div class="dropdown-divider"></div>' +
																'<a class="dropdown-item" style="cursor:hand" data-toggle="modal" data-target="#modlg" onClick="script:wallet.deposit()">Deposit Address</a>' +
																'<div class="dropdown-divider"></div>' +
																'<a class="dropdown-item" style="cursor:hand" data-toggle="modal" data-target="#modlg" onClick="script:wallet.export()">Export</a>' +
																'<a class="dropdown-item" style="cursor:hand" data-toggle="modal" data-target="#modlg" onClick="script:wallet.destory()">Destroy</a>' +
																'<div class="dropdown-divider"></div>' +
																'<a class="dropdown-item" style="cursor:hand" data-toggle="modal" data-target="#modlg" onClick="script:wallet.logOut()">Logout</a>' );
				break;
		}

		wallet.stateBackup	= temp;
	},

	// create
	this.create		= function() {
		if(!storage.hasStorage()) {
			modal.update('Create Fail','This browser is not support storage!');
			return;
		}

		let body	=		'<div style="overflow-x:auto;">' +
									'<center>Create wallet from <b>' + CONFIG['_name'] + '</b></center>' +
									'<center>Wallet data in your computer only.</center>' +
									'<center>If you clean up your browser. Be removed wallet data permanently too.</center><br/>' +
									'<div class="input-group mb-3"><div class="input-group-prepend"><span class="input-group-text"><i class="material-icons">lock</i></span></div><input id="pass1" type="password" class="form-control" placeholder="Password (Over 8 letters)" aria-label="Password (Over 8 letters)"></div>' +
									'<div class="input-group"><div class="input-group-prepend"><span class="input-group-text"><i class="material-icons">lock</i></span></div><input id="pass2" type="password" class="form-control" placeholder="Password retype" aria-label="Password retype">' +
									'</div></div>';
		modal.update(	'Create wallet',body,'wallet.createOK()');
		modal.alert(	'<center>Don\'t forget your password. And MUST backup your wallet.</center>','alert-danger');
	},
	this.getPrivateKeyString	= function(password) {
		let privateKey	= null;
		try {
			let temp		= keythereum.recover(password, JSON.parse(storage.wallet));
			privateKey	= Array.prototype.map.call(temp, x => ('00' + x.toString(16)).slice(-2)).join('');
		} catch (e) {
			privateKey	= null;
		}
		return privateKey;
	},
	this.getPrivateKeyBuffer	= function(password) {
		let privateKey	= null;
		try {
			privateKey	= keythereum.recover(password, JSON.parse(storage.wallet));
		} catch (e) {
			privateKey	= null;
		}
		return privateKey;
	},
	this.createOK	= function() {
		let p1	= $('#pass1').val();
		let p2	= $('#pass2').val();

		if(p1===p2 && p1.length > 7) {
			let dk				= keythereum.create();
			let keyObject	= keythereum.dump(p1, dk.privateKey, dk.salt, dk.iv);

			keyObject.isMainNet	= CONFIG['_name']=='main';
			storage.wallet			= JSON.stringify(keyObject);
			storage.reset();
			storage.save();

			wallet.updateNavAccount();
			UPDATE();

			modal.update('Create','Success create your new account.');
			modal.alert('<center>Don\'t forget your password. And must backup your wallet.</center>','alert-danger');
		} else {
			if(p1!=p2) {
				modal.alert('Passwords are not same.');
			} else {
				modal.alert('password is too short.');
			}
		}
	}
	// create

	// login&out
	this.logIn			= function() {
		let body=	'<div style="overflow-x:auto;">' +
							'<div class="input-group"><div class="input-group-prepend"><span class="input-group-text"><i class="material-icons">lock</i></span></div><input id="loginPass" type="password" class="form-control" placeholder="Password" aria-label="Password"></div>' +
							'</div>';
		modal.update('Login',body,'wallet.logInOK()');
	},
	this.logInOK		= function() {
		let password		= $('#loginPass').val();

		try {
			keythereum.recover(password, JSON.parse(storage.wallet));
			wallet.loginWithPK();
		} catch (e) {
			if(password!='')
				modal.alert('Password is wrong.');
			else
				modal.alert('Password is empty.');
		}
	},
	this.loginWithPK		= function() {
		wallet.web3.eth.net.getNetworkType((e, r) => {
				let data	= JSON.parse(storage.wallet);

				if((r=='main'&&data.isMainNet)||(r!='main'&&!data.isMainNet)) {
					storage.address	= '0x'+data.address;
					storage.time		= new Date().getTime();
					storage.save();

					wallet.updateNavAccount();
					UPDATE();

					modal.update('Login','Login Success');
				} else  {
					modal.update('Login','Login Fail');
					return;
				}
			});
	},
	this.logOut			= function() {
		modal.update('Logout','Are you sure?','wallet.logOutOK()');
	},
	this.logOutOK		= function() {
		storage.reset();
		storage.save();

		wallet.updateNavAccount();
		UPDATE();

		modal.update('Logout','See you next time.');
		setTimeout(function(){storage.reset();storage.save();location.href=location.origin;},2000);
	},
	// login&out

	// destory
	this.destory			= function() {
		let body	=	'<p class="text-danger">Destroy Wallet.</p>' +
						'<div style="overflow-x:auto;">' +
						'<div class="input-group"><div class="input-group-prepend"><span class="input-group-text"><i class="material-icons">lock</i></span></div><input id="destoryPass" type="password" class="form-control" placeholder="Password" aria-label="Password"></div>' +
						'</div>';
		modal.update('Destory',body,'wallet.destroyOK()');
	},
	this.destroyOK		= function() {
		let password		= $('#destoryPass').val();

		try {
			keythereum.recover(password, JSON.parse(storage.wallet));
			storage.remove();
			wallet.logOutOK();
			modal.update('Destory','Destory wallet complete');
		} catch (e) {
			if(password!='')
				modal.alert('Password is wrong.');
			else
				modal.alert('Password is empty.');
		}
	},
	// destory

	// export & import
	this.export	= function() {
		wallet.updateTimer(true);
		let body	=	'<div style="overflow-x:auto;">' +
								'<div class="input-group"><div class="input-group-prepend"><span class="input-group-text"><i class="material-icons">lock</i></span></div><input id="exportPass" type="password" class="form-control" placeholder="Password" aria-label="Password"></div>' +
								'</div>';
		modal.update('Export Wallet',body,'wallet.exportOK()');
	},
	this.exportOK	= function() {
		let password		= $('#exportPass').val();

		try {
			let privateKey		= keythereum.recover(password, JSON.parse(storage.wallet));
			modal.update('Export Wallet','<div style="overflow-x:auto;"><small>'+storage.wallet+'</small></div>');
		} catch (e) {
			if(re=='')
				modal.alert('Password is empty.');
			else
				modal.alert('Password is wrong.');
		}
	},
	this.restore	= function() {
		if(!storage.hasStorage()) {
			modal.update('Restore Fail','This browser is not support storage!');
			return;
		}

		let body	=	'<div style="overflow-x:auto;">' +
								'<div class="input-group mb-3"><input id="restoreStr" type="text" class="form-control" placeholder="Restore string" aria-label="Restore string"></div>' +
								'<div class="input-group"><div class="input-group-prepend"><span class="input-group-text"><i class="material-icons">lock</i></span></div><input id="restorePass" type="password" class="form-control" placeholder="Password" aria-label="Password"></div>' +
								'</div>';
		modal.update('Restore',body,'wallet.restoreOK()');
	},
	this.restoreOK	= function() {
		let password	= $('#restorePass').val();
		let restore		= $('#restoreStr').val();
		let keyObject	= JSON.parse(restore);

		try {
			let privateKey		= keythereum.recover(password, keyObject);
			storage.wallet		= JSON.stringify(keyObject);
			storage.reset();
			storage.save();
			modal.update('Restore','Restore wallet complete');
		} catch (e) {
			if(password!=''&&restore!='')
				modal.alert('Password is wrong.');
			else if(restore=='')
				modal.alert('Restore string is empty.');
			else if(password=='')
				modal.alert('Restore password is empty.');
		}
	},
	// export & import

	// deposit & withdrawal
	this.deposit			= function() {
		wallet.updateTimer(true);
		let body	= '<div align="center"><p class="text-warning">!! WARNING! THIS NETWORK IS '+CONFIG['_name']+' !!</p></div>';
		body		+="<div align='center'><img src='https://api.qrserver.com/v1/create-qr-code/?data="+storage.address+"&size=256x256 alt='' width='256' height='256'/></div><br/>";
		body		+="<div align='center'><a class='text-primary' target='_blank' href='"+CONFIG['_href']+"/address/"+storage.address+"'>"+storage.address+"</a></div>";
		modal.update('Deposit',body);
	},
	this.withrawal		= function(coin) {
		wallet.updateTimer(true);
		let body	='<div style="overflow-x:auto;">' +
							 '<div class="input-group mb-3"><div class="input-group-prepend"><span class="input-group-text">'+wallet.coins[coin]['icon']+'</span></div><input id="withrawalAdr" type="text" class="form-control" placeholder="Withrawal Address" aria-label="Withrawal Address"></div>' +
							 '<label><i class="material-icons">account_balance_wallet</i><span id="withrawalBal" class="withIcon"> '+wallet.web3.utils.fromWei(wallet.coins[coin]['balance'].toString(),'ether')+wallet.coins[coin]['name']+'</span></label>'+
							 '<div class="input-group mb-3"><input id="withrawalVal" type="number" step="any" class="form-control" placeholder="Withrawal Amount" aria-label="Withrawal Amount">'+
							 '<div class="input-group-append"><span class="input-group-text">'+wallet.coins[coin]['name']+'</span></div></div>'+
							 '<div class="input-group"><div class="input-group-prepend"><span class="input-group-text"><i class="material-icons">lock</i></span></div><input id="withrawalPass" type="password" class="form-control" placeholder="Password" aria-label="Withrawal Password"></div>' +
							 '</div>';
		modal.update('Withrawal',body,'wallet.withrawalOK('+coin+')');
	},
	this.withrawalOK		= function(coin) {
		let address		= $('#withrawalAdr').val();
		let amount		= $('#withrawalVal').val();
		let password	= $('#withrawalPass').val();
		modal.alert('');

		if(address==''||amount==0||amount==''||password==''||!wallet.web3.utils.isAddress(address)||address==storage.address) {
			if(!wallet.web3.utils.isAddress(address))	modal.alert('Address is wrong.');
			else if(address=='')											modal.alert('Address is empty.');
			else if(amount==0||amount=='')						modal.alert('Withrawal is zero.');
			else if(password=='')											modal.alert('Passward is empty.');
			else if(address==storage.address)					modal.alert('This is your address.');
		} else {
			wallet.updateBalance(coin,()=>{
				if(wallet.coins[coin]['balance']>wallet.web3.utils.toWei(amount,'ether')) {
					if(storage.tx != '') {
						wallet.web3.eth.getTransaction(storage.tx,function(e,r){
							if(!e)
								if(r.blockNumber==null || parseInt(r.blockHash) == 0)
									modal.alert('Transaction is pending : <br/><small><a target="_blank" href="'+CONFIG['_href']+'/tx/'+storage.tx+'">'+storage.tx+'</a></small>');
								else {
									storage.tx	= '';
									storage.save();
									wallet.transfer(coin,address,password,amount);
								}
							else
								modal.alert('Transaction fail.');
						});
					} else
						wallet.transfer(coin,address,password,amount);
				} else {
					modal.alert('Amount is too big. Less then '+wallet.web3.utils.fromWei(wallet.coins[coin]['balance'].toString(),'ether')+wallet.coins[coin]['name']);
				}
			});
		}
	},
	this.transfer	= function(coin,address,password,amount) {
		let data = null;
		if(coin==0) {
			amount	= wallet.web3.utils.toWei(amount, 'ether');
		} else {
			amount	= wallet.web3.utils.toWei(0, 'ether');
			data		= wallet.coins[coin]['contract'].methods.transfer(amount).encodeABI();
		}

		if(!wallet.sendTransaction(address,password,amount,data))
			modal.alert('Password is wrong.');
	},
	this.sendTransaction		= function(address,password,amount,data=null) {
		let privateKey	= wallet.getPrivateKeyString(password);

		if(privateKey!=null&&wallet.web3.utils.isAddress(address)) {
			wallet.web3.eth.getGasPrice((e,gasPrice)=>{
				if(e!=null) {
					modal.alert('Network error - getGasPrice.');
				} else {
					wallet.web3.eth.getTransactionCount(storage.address,(e,t)=>{
						let tx = {'from':storage.address,'to':address,'value':wallet.web3.utils.toHex(amount)};
						if(data!=null)	tx['data']	= data;

						wallet.web3.eth.estimateGas(tx).then((gasLimit)=>{
							tx['gasPrice']	= wallet.web3.utils.toHex(parseInt(gasPrice));
							tx['gasLimit']	= wallet.web3.utils.toHex(parseInt(gasLimit));
							wallet.web3.eth.accounts.privateKeyToAccount('0x'+privateKey).signTransaction(tx).then((r)=>{
								wallet.web3.eth.sendSignedTransaction(r.rawTransaction)
									.on('transactionHash',(r)=>{
										modal.alert('Tx <small>(<a target="_blank" href="'+CONFIG['_href']+'/tx/'+r+'">'+r+'</a>)</small>');
										storage.tx=r;
									}).then((r)=>{
										modal.alert('Success <small>(<a target="_blank" href="'+CONFIG['_href']+'/tx/'+r.transactionHash+'">'+r.transactionHash+'</a>)</small>');
										storage.tx='';
									}).catch(console.log);	// todo : check
							});
						});
					});
				}
			});
			return true;
		}
		return false;
	},
	// deposit & withdrawal

	// transaction history
	this.transactions			= function(coin) {
		wallet.updateTimer(true);
		modal.update('Transaction History',"Now Loading...");

		if(coin==0)
			wallet.getNormalTransactions(storage.address,(data)=>{wallet.trasactionItems(coin,data);});
		else
			wallet.getERC20transactions(coin,(data)=>{wallet.trasactionItems(coin,data);});
	},
	this.trasactionItems = function (coin, data) {
		if(data["result"].length==0)
			modal.update('Transaction History',data["message"]);
		else {
			let table	= "<div style='overflow-x:auto;'><table class='table table-striped table-hover'><tbody>";
			for(i=0;i<data["result"].length;i++){
				let date	= new Date(data["result"][i]["timeStamp"]*1000);
				let tx		= '<a target="_blank" href="'+CONFIG['_href']+'/tx/' + data["result"][i]["hash"] + '">'+data["result"][i]["hash"]+'</a>';
				let from	= '<a target="_blank" href="'+CONFIG['_href']+'/address/' + data["result"][i]["from"] + '">'+data["result"][i]["from"]+'</a>';
				let to		= '<a target="_blank" href="'+CONFIG['_href']+'/address/' + data["result"][i]["to"] + '">'+data["result"][i]["to"]+'</a>';
				let value	= wallet.web3.utils.fromWei(data["result"][i]["value"],'ether');
				let status= data["result"][i]["txreceipt_status"]==0?"<div class='text-danger'><small>[CANCELLED]</small></div>":"";

				if(data["result"][i]["from"]==storage.address) {
					value *= -1;
					table	+="<tr><td><div><h6>"+date+"</h6></div><div class='d-inline-block text-truncate' style='max-width: 320px;'><small>Tx : "+tx+"</small></div><div class='d-inline-block text-truncate' style='max-width: 320px;'><small>To : "+to+"</small></div></td><td class='align-middle text-right'>"+status+value+wallet.coins[coin]['name']+"</td></tr>";
				} else {
					table	+="<tr><td><div><h6>"+date+"</h6></div><div class='d-inline-block text-truncate' style='max-width: 320px;'><small>Tx : "+tx+"</small></div><div class='d-inline-block text-truncate' style='max-width: 320px;'><small>From : "+from+"</small></div></td><td class='align-middle text-right'>"+status+value+wallet.coins[coin]['name']+"</td></tr>";
				}
			}
			table		+= "</tbody></table></div>";
			modal.update('Transaction History',table);
		}
	},
	// transaction history
	this.getNormalTransactions = function(address,callback) {
		let jsonUrl	= CONFIG['_api']+"/api?module=account&action=txlist&address="+address+"&startblock=0&endblock=latest&sort=desc";
		$.getJSON(jsonUrl,callback);
	},
	this.getInternalTransactions = function(address,callback) {
		let jsonUrl	= CONFIG['_api']+"/api?module=account&action=txlistinternal&address="+address+"&startblock=0&endblock=latest&sort=desc";
		$.getJSON(jsonUrl,callback);
	},
	this.getERC20transactions	= function (coin,callback) {
		let jsonUrl	= CONFIG['_api']+'/api?module=account&action=tokentx&contractaddress='+wallet.coins[coin]['address']+'&address='+storage.address+'&startblock=0&endblock=latest&sort=asc';
		$.getJSON(jsonUrl,callback);
	},
	this.getLogs	= function(address,topic0,callback) {
		let jsonUrl	= CONFIG['_api']+'/api?module=logs&action=getLogs&fromBlock=0&toBlock=latest&address='+address;
		if(topic0!='')
			jsonUrl +='&topic0='+topic0;
		$.getJSON(jsonUrl,(data)=>{callback(data.result);});
	}
}

let modal	= new function() {
	this.update	= function(title, body, foot='', alert=''){
		let dismiss	= '<button type="button" class="btn btn-primary" data-dismiss="modal">Dismiss</button>';
		$('#modalTitle').html(title);
		$('#modalAlert').html(alert);
		$('#modalBody').html(body);
		$('#modalFooter').html(foot===''?dismiss:'<button type="button" class="btn btn-primary" onClick="script:'+foot+'">Confirm</button>'+dismiss);
	},
	this.alert	= function(msg='',type='alert-warning'){
		if(msg=='')
			$('#alert').modal("hide");
		else {
			msg = '<div class="alert alert-fix '+type+' alert-dismissible fade show" role="alert">'+msg;
			msg +='<button type="button" class="close" data-dismiss="modal">&times;</button></div>';
			$('#alertMsg').html(msg);
			$("#alert").modal();
		}
	},
	this.updateInformation		= function(game,address,data,rate) {
		wallet.updateTimer(true);

		let coin	= (game=='jackpot649'?wallet.coins[1]['name']:wallet.coins[0]['name']);
		let table	= "<div style='overflow-x:auto;'><table class='table table-striped table-hover'><tbody>";
		table			+='<tr><td>Contract</td><td><a style="cursor:hand" onClick="window.open(\''+CONFIG['_href']+'/address/'+address+'\',\'_blank\')"><small>'+address+"</small></td></tr>";

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
	}
}
$('#modlg').on('hidden.bs.modal', ()=>{modal.update('&nbsp','&nbsp')});

let util	= new function() {
	this.historyRow			= 6,
	this.historyCol			= 90,
	this.stateBackup		= {},
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
			case 'dragonTiger':
				let d	= util.card(openCards['1st'][0]);
				let t	= util.card(openCards['2nd'][0]);
				toolTip = '('+d+','+t+')';
				win 		= d>t?1:d<t?2:3;
				break;
			case 'highLow':
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

		let index		= (game=='jackpot649'?22:12);
		let topic0	= CONFIG[game]['abi'][index]['signature'];

		wallet.getLogs(address,topic0,(logs)=>{	// ??? :storage.address
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
