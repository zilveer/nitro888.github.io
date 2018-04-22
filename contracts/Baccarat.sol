pragma solidity ^0.4.22;

import "./Casino.sol";

contract Baccarat is Casino {
    uint constant   fee                 = 100000000000000;  // fee for transfer - 0.0001E (1,000,000,000,000,000,000 = 1eth)
    uint constant   betPrice            = 1000000000000000; // 0.001E (1,000,000,000,000,000,000 = 1eth)

    constructor(address _token) public {
  	    lastUser    = msg.sender;
  	    token       = ServiceToken(_token);
  	}

    function getFee() internal constant returns (uint) {
        return fee;
    }
    function getBetPrice() internal constant returns (uint) {
        return betPrice;
    }
    function getSlotMax() internal constant returns (uint8) {
        return 3;
    }
    function getShoeDeckCount() internal constant returns (uint) {
        return 8;
    }
    function isNotShoeChange(uint _round, address _a, address _b, uint _c) internal constant returns (bool) {
        return (_round < 61);
    }

    function gameBet(uint _seed) internal returns(bool) {
        return true;
    }
    function gameRoundEnd(uint _seed) internal returns (bool) {
        bool result     = false;
        uint8[] memory draws    = drawCardsFromShoe(4,_seed);	    // player, bunker

        uint8 p         = 0;
        uint8 b         = 0;
        uint8 player    = cutOver10(Cards.getCardPoint(draws[0]))+cutOver10(Cards.getCardPoint(draws[2]));
        player          = player%10;

        uint8 banker    = cutOver10(Cards.getCardPoint(draws[1]))+cutOver10(Cards.getCardPoint(draws[3]));
        banker          = banker%10;

        if ((player == 6 || player == 7) && (banker < 6)) {
            b           = drawOneCardFromShoe();
            banker      = (banker+cutOver10(Cards.getCardPoint(b)))%10;
        } else if (player <= 5 && (banker < 8)){
            p           = drawOneCardFromShoe();
            uint8 temp	= cutOver10(Cards.getCardPoint(p));
            player      = (player+temp)%10;

            if(	(banker<3) ||
            (banker==3 && (temp!=8)) ||
            (banker==4 && (temp>=2 && temp<=7)) ||
            (banker==5 && (temp>=4 && temp<=7)) ||
            (banker==6 && (temp==6 || temp==7))) {
                b       = drawOneCardFromShoe();
                banker	= (banker+cutOver10(Cards.getCardPoint(b)))%10;
            }
        }

        openCards   = (uint64(p)<<48) | (uint64(draws[2])<<40) | (uint64(draws[0])<<32) | (uint64(b)<<16) | (uint64(draws[3])<<8) | uint64(draws[1]);

        if (banker>player)      result = gameResult(0,195,false);  // banker   195%
        else if (banker<player) result = gameResult(1,200,false);  // player   200%
        else                    result = gameResult(2,900,false);  // tie      900%

        return result;
    }

    function cutOver10(uint8 _point) private pure returns(uint8) {
        return _point>9?0:_point;
    }
}
