let WALLET	= {
	'net'					: 'ropsten',
	'type'				: 'http',

	'main'				: {	'http'	: 'https://mainnet.infura.io',
										'wss'		: 'wss://mainnet.infura.io/ws',
										'api'		: 'https://api.etherscan.io',
										'href'	: 'https://etherscan.io'},
	'ropsten' 		: {	'http'	: 'https://ropsten.infura.io',
										'wss'		: 'wss://ropsten.infura.io/ws',
										'api'		: 'https://api-ropsten.etherscan.io',
										'href'	: 'https://ropsten.etherscan.io'},

	'tokens'			: ['empty for eth','nitrotoken'],
	'tokenABI'		: [{"constant": true,"inputs": [],"name": "name","outputs": [{"name": "","type": "string"}],"payable": false,"type": "function"},{"constant": true,"inputs": [],"name": "decimals","outputs": [{"name": "","type": "uint8"}],"payable": false,"type": "function"},{"constant": true,"inputs": [{"name": "_owner","type": "address"}],"name": "balanceOf","outputs": [{"name": "balance","type": "uint256"}],"payable": false,"type": "function"},{"constant": true,"inputs": [],"name": "symbol","outputs": [{"name": "","type": "string"}],"payable": false,"type": "function"}],
	'nitrotoken'	: {'address':'0xdF60Ce3dE7b799Ba695A3F049E03c94f8b70fD6A','contract':null}
};

let storage	= new function() {
	this.wallet		= '',
	this.address	= '',
	this.tx				= '',
	this.nonce		= 0,
	this.txs			= [],
	this.time			= 0,
	this.load		= function() {
		if(!storage.hasData())
			return;
		let data				= JSON.parse(localStorage[WALLET['net']]);
		storage.wallet	= data.wallet;
		storage.address	= data.address;
		storage.tx			= data.tx;
		storage.nonce		= data.nonce;
		storage.txs			= data.txs;
		storage.time		= data.time;
	},
	this.save		= function() {
		localStorage[WALLET['net']] = storage.wallet!=''?JSON.stringify({'wallet':storage.wallet,'address':storage.address,'tx':storage.tx,'nonce':storage.nonce,'txs':storage.txs,'time':storage.time}):'';
	},
	this.hasData		= function() {
		return (typeof localStorage[WALLET['net']] !== 'undefined' && localStorage[WALLET['net']] != '');
	},
	this.hasStorage	= function() {
		return (typeof(Storage) !== "undefined");
	},
	this.remove		= function() {
		storage.wallet	= '';
		storage.address	= '';
		storage.tx			= '';
		storage.nonce		= 0;
		storage.txs			= [];
		localStorage.removeItem(WALLET['net']);
	},
	this.reset		= function() {
		storage.address	= '';
		storage.time		= 0;
	}
}

let wallet	= new function() {
	this.web3					= null,
	this.MAIN					= null,
	this.stateBackup	= -1,
	this.timer				= 1800000,
	this.coins				= [	{'icon':'<span class="ethereum"></span>','name':' Eth','balance':-2},
												{'icon':'<span class="ethereum"></span>','name':' Nitro','balance':-2}],
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

		wallet.MAIN = mainUpdate;

		if(WALLET['type']=="http") {
			wallet.web3		= new Web3(new Web3.providers.HttpProvider(WALLET[WALLET['net']][WALLET['type']]));
			setInterval(()=>{wallet.update();wallet.MAIN();},60000);
		} else {
			wallet.web3		= new Web3(new Web3.providers.WebsocketProvider(WALLET[WALLET['net']][WALLET['type']]));
			wallet.web3.eth.subscribe('newBlockHeaders',wallet.update);
		}

		for(let i=1 ; i < WALLET['tokens'].length ; i++)
			WALLET[WALLET['tokens'][i]]['contract']	= new wallet.web3.eth.Contract(WALLET['tokenABI'],WALLET[WALLET['tokens'][i]]['address']);

		wallet.update();

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
			WALLET[WALLET['tokens'][coin]]['contract'].methods.balanceOf(storage.address).call((e,r)=>{
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
									'<center>Create wallet from <b>' + WALLET['net'] + '</b></center>' +
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

			keyObject.isMainNet	= WALLET['net']=='main';
			storage.wallet			= JSON.stringify(keyObject);
			storage.reset();
			storage.save();

			wallet.update();
			wallet.MAIN();

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

					wallet.update();
					wallet.MAIN();

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

		wallet.update();
		wallet.MAIN();

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
		let body	= '<div align="center"><p class="text-warning">!! WARNING! THIS NETWORK IS '+WALLET['net']+' !!</p></div>';
		body		+="<div align='center'><img src='https://api.qrserver.com/v1/create-qr-code/?data="+storage.address+"&size=256x256 alt='' width='256' height='256'/></div><br/>";
		body		+="<div align='center'><a class='text-primary' target='_blank' href='"+WALLET[WALLET['net']]['href']+"/address/"+storage.address+"'>"+storage.address+"</a></div>";
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
									modal.alert('Transaction is pending : <br/><small><a target="_blank" href="'+WALLET[WALLET['net']]['href']+'/tx/'+storage.tx+'">'+storage.tx+'</a></small>');
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
	this.transfer	= function(coin,address,password,amount,callback=null) {
		let data = null;
		if(coin==0) {
			amount	= wallet.web3.utils.toWei(amount, 'ether');
		} else {
			amount	= wallet.web3.utils.toWei(0, 'ether');
			data		= WALLET[WALLET['tokens'][coin]]['contract'].methods.transfer(amount).encodeABI();
		}

		if(!wallet.sendTransaction(address,password,amount,data,callback))
			modal.alert('Password is wrong.');
	},
	this.sendTransaction		= function(address,password,amount,data=null,callback=null) {
		let privateKey	= wallet.getPrivateKeyString(password);

		if(privateKey!=null&&wallet.web3.utils.isAddress(address)) {
			wallet.web3.eth.getGasPrice((e,gasPrice)=>{
				if(e!=null) {
					modal.alert('Network error - getGasPrice.');
				} else {
					wallet.web3.eth.getTransactionCount(storage.address,(e,t)=>{ // todo : t????????
						let tx = {'from':storage.address,'to':address,'value':wallet.web3.utils.toHex(amount)};
						if(data!=null)	tx['data']	= data;

						wallet.web3.eth.estimateGas(tx).then((gasLimit)=>{
							tx['gasPrice']	= wallet.web3.utils.toHex(parseInt(gasPrice));
							tx['gasLimit']	= wallet.web3.utils.toHex(parseInt(gasLimit));
							wallet.web3.eth.accounts.privateKeyToAccount('0x'+privateKey).signTransaction(tx).then((r)=>{
								wallet.web3.eth.sendSignedTransaction(r.rawTransaction)
									.on('transactionHash',(r)=>{
										modal.alert('Tx<hr/><small><span class="d-inline-block text-truncate" style="max-width: 450px;><a target="_blank" href="'+WALLET[WALLET['net']]['href']+'/tx/'+r+'">'+r+'</a></span></small>');
										storage.tx=r;
									}).then((r)=>{
										modal.alert('Success<hr/><small><span class="d-inline-block text-truncate" style="max-width: 450px;><a target="_blank" href="'+WALLET[WALLET['net']]['href']+'/tx/'+r.transactionHash+'">'+r.transactionHash+'</a></span></small>');
										storage.tx='';
										wallet.update();
										if(callback!=null)
											callback(r);
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
				let tx		= '<a target="_blank" href="'+WALLET[WALLET['net']]['href']+'/tx/' + data["result"][i]["hash"] + '">'+data["result"][i]["hash"]+'</a>';
				let from	= '<a target="_blank" href="'+WALLET[WALLET['net']]['href']+'/address/' + data["result"][i]["from"] + '">'+data["result"][i]["from"]+'</a>';
				let to		= '<a target="_blank" href="'+WALLET[WALLET['net']]['href']+'/address/' + data["result"][i]["to"] + '">'+data["result"][i]["to"]+'</a>';
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
		let jsonUrl	= WALLET[WALLET['net']]['api']+"/api?module=account&action=txlist&address="+address+"&startblock=0&endblock=latest&sort=desc";
		$.getJSON(jsonUrl,callback);
	},
	this.getInternalTransactions = function(address,callback) {
		let jsonUrl	= WALLET[WALLET['net']]['api']+"/api?module=account&action=txlistinternal&address="+address+"&startblock=0&endblock=latest&sort=desc";
		$.getJSON(jsonUrl,callback);
	},
	this.getERC20transactions	= function (coin,callback) {
		let jsonUrl	= WALLET[WALLET['net']]['api']+'/api?module=account&action=tokentx&contractaddress='+wallet.coins[coin]['address']+'&address='+storage.address+'&startblock=0&endblock=latest&sort=asc';
		$.getJSON(jsonUrl,callback);
	},
	this.getLogs	= function(address,topic0,callback) {
		let jsonUrl	= WALLET[WALLET['net']]['api']+'/api?module=logs&action=getLogs&fromBlock=0&toBlock=latest&address='+address;
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
	}
}
$('#modlg').on('hidden.bs.modal', ()=>{modal.update('&nbsp','&nbsp')});
