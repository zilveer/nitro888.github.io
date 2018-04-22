pragma solidity ^0.4.22;

import "./Lotto.sol";

contract Jackpot649 is Lotto, ServiceToken {
    uint constant fee                   = 100000000000000;      // fee for transfer - 0.0001E (1,000,000,000,000,000,000 = 1eth)
    uint constant ticketPrice           = 1000000000000000000;  // 1 service token

    uint8 constant matchCount           = 6;    // match 6 & bonus 1
    uint8 constant ballCount            = 49;   // must be under 64

    uint constant percent1stPrize       = 25;   // 25%
    uint constant percent2ndPrize       = 20;   // 20%
    uint constant percent3rdPrize       = 20;   // 20%

    constructor() public {
        lastUser    = msg.sender;
        token       = ServiceToken(address(this));
    }

    function getFee() internal constant returns (uint) {
        return fee;
    }
    function getTicketPrice() internal constant returns (uint) {
        return ticketPrice;
    }
    function getBallCount() internal constant returns (uint8) {
        return ballCount;
    }
    function getMatchCount() internal constant returns (uint8) {
        return matchCount;
    }

    function roundEnd(uint _seed) internal returns (bool, uint64, uint64) {
        uint64[] memory balls       = Machine.balls(ballCount);
        uint64 prizeNumbers         = 0;
        uint64 bonusNumber          = 0;
        (prizeNumbers,bonusNumber)  = Machine.lotto(ballCount,matchCount+1,block.coinbase,lastUser,_seed);

        bool result = true;
        result = result && prize1(prizeNumbers, Utils.PERCENT(address(this).balance, percent1stPrize));                    // 1st	- match all numbers
        result = result && prize2(prizeNumbers, Utils.PERCENT(address(this).balance, percent2ndPrize), bonusNumber, balls);// 2nd	- match all-1 numbers + 1 bonus number;
        result = result && prize3(prizeNumbers, Utils.PERCENT(address(this).balance, percent3rdPrize), balls);
        result = result && prize_(prizeNumbers,ticketPrice*10, matchCount-2, balls);
        result = result && prize_(prizeNumbers,ticketPrice, matchCount-3, balls);

        return (result,prizeNumbers,bonusNumber);
    }

    function bet(uint64[] _tickets) payable public {
  		require(msg.value == 0 && (balanceOf(msg.sender) >= getTicketPrice()*_tickets.length) && state==STATE.OPEN);
  		require(Machine.validateTicket(_tickets,getBallCount(),getMatchCount()));

  		for(uint i = 0 ; i <  _tickets.length ; i++) {
  			if(tickets[_tickets[i]].length==0)
  				ticketsIndex.push(_tickets[i]);
  			tickets[_tickets[i]].push(msg.sender);
  			userTickets[msg.sender].push(_tickets[i]);
  		}

  		lastUser	= msg.sender;
  		burn(getTicketPrice()*_tickets.length);
  	}
    function betTo3rdPerson(address _3rdPerson, uint64[] _tickets) payable public {
  		require(msg.value == 0 && (balanceOf(msg.sender) >= getTicketPrice()*_tickets.length) && state==STATE.OPEN);
  		require(Machine.validateTicket(_tickets,getBallCount(),getMatchCount()));

  		for(uint i = 0 ; i <  _tickets.length ; i++) {
  			if(tickets[_tickets[i]].length==0)
  				ticketsIndex.push(_tickets[i]);
  			tickets[_tickets[i]].push(_3rdPerson);
  			userTickets[_3rdPerson].push(_tickets[i]);
  		}

  		lastUser	= msg.sender;
  		burn(getTicketPrice()*_tickets.length);
  	}
}
