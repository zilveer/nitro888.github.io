pragma solidity ^0.4.22;

import "./Lotto.sol";

contract Lotto525 is Lotto {
    uint constant fee                   = 100000000000000;  // fee for transfer - 0.0001E (1,000,000,000,000,000,000 = 1eth)
    uint constant ticketPrice           = 5000000000000000; // 0.005E (1,000,000,000,000,000,000 = 1eth)

    uint8 constant matchCount           = 5;    // match 5 & bonus 1
    uint8 constant ballCount            = 25;   // must be under 64

    uint constant percent1stPrize       = 25;   // 25%
    uint constant percent2ndPrize       = 20;   // 20%
    uint constant percent3rdPrize       = 20;   // 20%

    constructor(address _token) public {
  	    lastUser    = msg.sender;
  	    token       = ServiceToken(_token);
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



        return (result,prizeNumbers,bonusNumber);
    }

    function bet(uint64[] _tickets) payable public {
      _bet(_tickets);
  	}
}
