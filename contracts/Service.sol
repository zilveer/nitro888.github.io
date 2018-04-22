pragma solidity ^0.4.22;

import "./ServiceToken.sol";

library Utils {
	function RNG(uint _max, uint8 length, address _a, address _b, uint _c) internal pure returns (uint[]) {
		// 0~_max-1
		uint[] memory r = new uint[](length%256+1);
		uint seed       = uint(keccak256(_c,_a,_b));
		for(uint i = 0 ; i < r.length ; i++) {
			r[i]	= seed%_max;
			seed	= seed&1==1?(seed>>1)|2**255:seed>>1;
		}
		return r;
	}
	function PERCENT(uint _value, uint _percent) internal pure returns (uint) {
	    return _value * _percent / 100 ;
	}
}

contract Service is Ownable {
	struct PENDING  {
		address		player;
		uint			value;
	}
	PENDING[]		        		pendings;

	enum			        			STATE							{ READY, OPEN, CLOSE, DONE, DISABLE }
	STATE internal		    	state   					= STATE.DONE;

	ServiceToken internal		token;
	address	internal	    	lastUser;   // for rnd seed

	uint internal constant	jackpotWithdrawalStart		= 1000000000000000000;	// 1 Eth
	uint internal constant	jackpotWithdrawalPercent	= 5;    								// 5%

	constructor(address _token) public {
	    lastUser    = msg.sender;
	    token       = ServiceToken(_token);
	}

	function terminate() public;
	function getFee() internal constant returns (uint);

	function withdrawal(uint _value) onlyOwner payable public {
		require(_value<=address(this).balance);
		owner.transfer(_value);
	}
	function withdrawal2Jackpot(bool _jackPotEnable) internal {	// todo :
		if(_jackPotEnable&&(address(this)!=address(token))&&(address(this).balance>=jackpotWithdrawalStart))
			address(token).transfer(Utils.PERCENT(address(this).balance, jackpotWithdrawalPercent));
	}

	function transfer(PENDING _pending, uint _lessThen) internal returns (uint) {
		if(_pending.value<=_lessThen) {
			uint value	= _pending.value;
			uint fee		= getFee();
			value       = value>fee ? value-fee : value;
			_pending.player.transfer(value);
			return value;
		}
		pendings.push(_pending);
		return 0;
	}

	function updatePending() internal {
	    if(pendings.length<1)
	        return;
		uint totalTransfer = 0;
		for(int i = int(pendings.length)-1; i >= 0; i--) {
			uint value  = pendings[uint(i)].value;
			uint fee    = getFee();
			value       = value>fee ? value-fee : value;
			if((value+totalTransfer) <= address(this).balance) {
				address temp = pendings[uint(i)].player;
				pendings.length--;
				totalTransfer+=value;
				temp.transfer(value);
			}
			else
				return;
		}
	}
}
