pragma solidity ^0.4.22;

import "./Casino.sol";

contract DragonTiger is Casino {
    uint constant   fee                 = 100000000000000;  // fee for transfer - 0.0001E (1,000,000,000,000,000,000 = 1eth)
    uint constant   betPrice            = 1000000000000000; // 0.001E (1,000,000,000,000,000,000 = 1eth)

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
        return 6;
    }
    function isNotShoeChange(uint _round, address _a, address _b, uint _c) internal constant returns (bool) {
        return (_round < 52 || _round < Utils.RNG(28,1, _a, _b, _c)[0]);
    }

    function gameBet(uint _seed) internal returns(bool) {
        return true;
    }
    function gameRoundEnd(uint _seed) internal returns (bool) {
        bool result           = false;
        uint8[] memory draws  = drawCardsFromShoe(2,_seed);

        uint8 dragon          = Cards.getCardPoint(draws[0]);
        uint8 tiger           = Cards.getCardPoint(draws[1]);
        openCards             = (uint64(draws[1])<<32) | uint64(draws[0]);

        if (dragon>tiger)       result = gameResult(0,200,false);  // dragon   200%
        else if (dragon<tiger)  result = gameResult(1,200,false);  // tiger    200%
        else                    result = gameResult(2,900,false);  // tie      900%

        return result;
    }
}
