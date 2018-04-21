pragma solidity ^0.4.22;

import "./Service.sol";

library Machine {
	function balls(uint8 _ballCount) internal pure returns (uint64[]) {
		uint64[] memory b	= new uint64[](_ballCount);
		for(uint8 i = 0 ; i < b.length ; i++)
			b[i] = uint64(1)<<i;
		return b;
	}
	function compaire(uint64 _ticket, uint64[] _balls, uint8 _matchCount) internal pure returns (bool){
		uint8 count	= 0;
		for(uint8 i = 0 ; i <  _balls.length ; i++)
			if(_ticket&_balls[i]>0)
				count++;
		return count==_matchCount;
	}
	function lotto(uint8 _ballCount, uint8 _drawCount, address _a, address _b, uint _c) internal pure returns (uint64,uint64) {
		uint64[] memory b		= balls(_ballCount);
		uint[] memory rnds	= Utils.RNG(_ballCount,uint8(_drawCount*(_c%3+3)), _a, _b, _c);

		for(uint i = 0 ; i < rnds.length ; i++) {
			uint pos1       = i%_drawCount;
			uint pos2       = rnds[i];

			uint64 temp	    = b[pos1];
			b[pos1]         = b[pos2];
			b[pos2]         = temp;
		}

		for(i=1 ; i < _drawCount-1 ; i++)
			b[0]	|=b[i];

		return (b[0],b[_drawCount-1]);	// prize, bonus
	}
	function validateTicket(uint64[] _tickets, uint8 _ballCount, uint8 _drawCount) internal pure returns (bool) {
		uint64[] memory b	= balls(_ballCount);
		bool result			= true;

		for(uint i = 0 ; i <  _tickets.length ; i++) {
			uint count = 0;
			for(uint j = 0 ; j <  b.length ; j++)
				if(b[j]&_tickets[i]>0)
					count++;
			result	= result && (count == _drawCount);
		}

		return result&&_tickets.length>0;
	}
}

contract Lotto is Service {
	uint                                    round;
	uint64[]					            					ticketsIndex;
	mapping(address=>uint64[]) internal     userTickets;
	mapping(uint64=>address[])              tickets;
	uint internal														autoWithdrawal				= 1000000000000000000;	// 1 Eth

	function information(address player) public constant returns (uint,STATE,uint,uint,uint,uint,uint64[]) {
		return (round,state,address(this).balance,getTicketPrice(),getFee(),pendings.length,userTickets[player]);
	}
	function terminate() onlyOwner public {
		state               = STATE.DISABLE;

		uint totalTransfer  = 0;
		for(uint i=0 ; i<ticketsIndex.length ; i++)
			for(uint j=0 ; j<tickets[ticketsIndex[i]].length ; j++ )
				totalTransfer   +=transfer(PENDING(tickets[ticketsIndex[i]][j], getTicketPrice()), address(this).balance-totalTransfer);

		reset();

		if(pendings.length==0)
			msg.sender.transfer(address(this).balance);
	}

	function reset() private {
		for(uint i = 0 ; i < ticketsIndex.length ; i++) {
			for(uint j = 0 ; j < tickets[ticketsIndex[i]].length ; j++)
				userTickets[tickets[ticketsIndex[i]][j]].length = 0;
			delete tickets[ticketsIndex[i]];
		}
		ticketsIndex.length	= 0;
	}

	event History(uint,uint128);

	function update(uint _seed) onlyOwner public {
		if(state==STATE.READY) {
			state	= STATE.OPEN;
		} else if(state==STATE.OPEN) {
			state	= STATE.CLOSE;
			updatePending();
		} else if(state==STATE.CLOSE) {
			state	= STATE.PLAY;

			uint64  prizeNumbers= 0;
			uint64  bonusNumber = 0;
			(prizeNumbers,bonusNumber)  = roundEnd(_seed);
			emit History(round,(uint128(prizeNumbers)<<64)|uint128(bonusNumber));
		} else if(state==STATE.PLAY) {
			round++;
			state	= STATE.READY;
			reset();
		}
	}

	function prize1(uint64 _prizeNumbers, uint _amount) internal returns (bool) {
		if(tickets[_prizeNumbers].length>0) {
			givePrize(_prizeNumbers, _amount / tickets[_prizeNumbers].length);
			return true;
		}
		return false;
	}
	function prize2(uint64 _prizeNumbers, uint _amount, uint64 _bonusNumber, uint64[] _balls) internal returns (bool) {
		uint winners        = 0;
		uint8 matchCount    = getMatchCount()-1;

		for(uint i=0 ; i<ticketsIndex.length ; i++)
			if(Machine.compaire(ticketsIndex[i]&_prizeNumbers,_balls,matchCount)&&(ticketsIndex[i]&_bonusNumber>0))
				winners +=tickets[ticketsIndex[i]].length;

		if(winners>0) {
			uint prize  = _amount / winners;
			if(prize>0)
				for(i=0 ; i<ticketsIndex.length ; i++)
					if(Machine.compaire(ticketsIndex[i]&_prizeNumbers,_balls,matchCount)&&(ticketsIndex[i]&_bonusNumber>0))
						givePrize(ticketsIndex[i],prize);
		}

		return (winners>0);
	}
	function prize3(uint64 _prizeNumbers, uint _amount, uint64[] _balls) internal returns (bool) {
			uint winners				= 0;
			uint8 matchCount    = getMatchCount()-2;

			for(uint i=0 ; i<ticketsIndex.length ; i++)
					if(Machine.compaire(ticketsIndex[i]&_prizeNumbers,_balls,matchCount))
							winners +=tickets[ticketsIndex[i]].length;

			if(winners>0) {
					uint prize  = _amount / winners;
					if(prize>0)
							for(i=0 ; i<ticketsIndex.length ; i++)
									if(Machine.compaire(ticketsIndex[i]&_prizeNumbers,_balls,matchCount))
											givePrize(ticketsIndex[i],prize);
			}

			return (winners>0);
	}

	function givePrize(uint64 _prizeNumbers, uint _value) internal returns (uint) {
		uint totalTransfer	= 0;
		for(uint i=0 ; i < tickets[_prizeNumbers].length && _value>0 ; i++)
			totalTransfer   +=transfer(PENDING(tickets[_prizeNumbers][i], _value), address(this).balance-totalTransfer);
		return totalTransfer;
	}

	function getTicketPrice() internal constant returns (uint);
	function getBallCount() internal constant returns (uint8);
	function getMatchCount() internal constant returns (uint8);
	function roundEnd(uint _seed) internal returns (uint64, uint64);
	function bet(uint64[] _tickets) public;
}
