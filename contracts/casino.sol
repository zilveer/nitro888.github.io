pragma solidity ^0.4.22;

import "./ownership.sol";

library cards{
	function getCardPoint(uint8 _card) internal pure returns(uint8) {
		return uint8((_card-1)%13)+1;
	}

	function makeShoe(uint _repeat, uint8 _shuffleLength, address _a, address _b, uint _c) internal pure returns (uint8[]) {
		uint8[] memory card	= new uint8[](52*_repeat);
		for(uint i = 0 ; i < card.length ; i++)
			card[i] = uint8(i%52+1);
		return shuffle(card,_shuffleLength,_a,_b,_c);
	}

	function drawCardsFromShoe(uint8[] _shoe, uint8 _count, address _a, address _b, uint _c) internal pure returns(uint8[] shoe,uint8[] draw) {
		shoe    = shuffle(_shoe,_count+2,_a,_b,_c);
		draw    = new uint8[](_count);

		for(uint i = 0 ; i < _count ; i++)
			draw[i] = shoe[shoe.length-1-i];

		return (shoe,draw);
	}

	function shuffle(uint8[] _cards, uint8 _shuffleLength, address _a, address _b, uint _c) internal pure returns (uint8[]) {
		uint[] memory rnds  = utils.RNG(_cards.length,uint8(_shuffleLength*(_c%3+3)), _a, _b, _c);

		for(uint i = 0 ; i < rnds.length ; i++) {
			uint pos1       = (_cards.length-_shuffleLength) + i%_shuffleLength;
			uint pos2       = rnds[i];

			uint8 temp	    = _cards[pos1];
			_cards[pos1]    = _cards[pos2];
			_cards[pos2]    = temp;
		}

		return _cards;
	}

	function validateSlot(uint8[] _slots, uint8 _indexMax) internal pure returns (bool) {
    	for(uint i=0;i<_slots.length;i++)
    	    if(_slots[i]>=_indexMax)
    	        return false;
    	return true;
	}
}

contract casino is ownership {
	uint[2]						            round;              // shoe-game
	uint64[]						        history;			// [records]

	uint8[]						            shoe;				// [cards]
	uint64 internal						    openCards;			// 3*8 + 3*8 + 8

	mapping(address=>uint8[]) internal      userSlots;
	mapping(uint8=>address[])               slots;

	function getBetPrice() internal constant returns (uint);
	function getSlotMax() internal constant returns (uint8);
    function getShoeDeckCount() internal constant returns (uint);
    function isNotShoeChange(uint _round, address _a, address _b, uint _c) internal constant returns (bool);

	function info0() public constant returns (uint,uint,uint,uint) {
	    return (address(this).balance,getBetPrice(),getFee(),pendings.length);
	}
	function info1(address player) public constant returns (uint[2],STATE,uint64[],uint64,uint8[]){
	    return (round,state,history,openCards,userSlots[player]);
	}
	function terminate() onlyOwner public {
    	state       = STATE.DISABLE;
    	uint8 max   = getSlotMax();

    	uint totalTransfer  = 0;
    	for(uint8 i=0 ; i<max ; i++)
    	    for(uint j=0 ; j < slots[i].length ; j++ )
    	        totalTransfer   +=transfer(pending(slots[i][j], getBetPrice()), address(this).balance-totalTransfer);

    	reset();

    	if(pendings.length==0)
    	    msg.sender.transfer(address(this).balance);
	}
	function reset() private {
    	uint8 max   = getSlotMax();
    	for(uint8 i = 0 ; i < max ; i++) {
    	    for(uint j = 0 ; j < slots[i].length ; j++)
    	        delete userSlots[slots[i][j]];
    	    slots[i].length = 0;
    	}
	}

	function resetShoe(address _a, address _b, uint _c, bool _d) private returns (bool) {
    	openCards   = 0;

    	if(round[0]>0 && isNotShoeChange(round[1],_a,_b,_c)) {
        	if(_d)
        	    round[1]++;
        } else {
        	round[0]++;
        	round[1]        = 1;
        	history.length  = 0;
        	shoe            = cards.makeShoe(getShoeDeckCount(), 6, _a, _b, _c);
        	drawCardsFromShoe(3, _c);

        	return true;
    	}

    	return false;
	}

	function drawCardsFromShoe(uint8 _count, uint _seed) internal returns(uint8[] _draw) {
    	(shoe,_draw)    =cards.drawCardsFromShoe(shoe,_count,block.coinbase,lastUser,getSeed(_seed));
    	shoe.length     -= _count;
    	return _draw;
	}
	function drawOneCardFromShoe() internal returns(uint8 card) {
    	card = shoe[shoe.length-1];
    	shoe.length--;
    	return card;
	}

	event eventUpdate(uint,uint64[]);

	function update(uint _seed) onlyOwner public {
    	if(state==STATE.READY) {
        	state	    = STATE.OPEN;
        	if(!gameBet(_seed)) {
        	    state   = STATE.READY;
        	    resetShoe(block.coinbase,lastUser,_seed,false);
        	}
    	} else if(state==STATE.OPEN) {
        	state	    = STATE.CLOSE;
        	updatePending();
    	} else if(state==STATE.CLOSE) {
        	state       = STATE.PLAY;
        	gameRoundEnd(_seed);
    	} else if(state==STATE.PLAY) {
        	state       = STATE.READY;
        	if(resetShoe(block.coinbase,lastUser,_seed,true))
        	    emit eventUpdate(round[0]-1,history);
    	}
	}

	function gameBet(uint _seed) internal returns (bool);
	function gameRoundEnd(uint _seed) internal;

	function getSeed(uint _seed) internal constant returns (uint) {
	    return  block.number|(_seed|(history.length>0?uint(history[history.length-1])<<128:block.number));
	}

	function gameResult(uint8 _win, uint _rate, bool _pushBack) internal {
    	uint betPrice           = getBetPrice();
    	uint fee                = getFee();
    	uint totalTransfer	    = 0;

    	uint8 max               = getSlotMax();
    	for(uint8 i = 0 ; i < max ; i++) {
        	for(uint j=0 ; j < slots[i].length ; j++ ) {
        	    if(_pushBack)   totalTransfer   +=transfer(pending(slots[i][j], betPrice+fee), address(this).balance-totalTransfer);
        	    else if(i==_win)totalTransfer   +=transfer(pending(slots[i][j], utils.PERCENT(betPrice,_rate)), address(this).balance-totalTransfer);
        	}
    	}

    	reset();

    	history.push(openCards);
	}

	function bet(uint8[] _slots) payable public{
	    require(state==STATE.OPEN&&_slots.length>0&&msg.value==getBetPrice()*_slots.length&&cards.validateSlot(_slots,getSlotMax()));

    	for(uint8 i = 0 ; i < _slots.length ; i++)
    	    slots[_slots[i]].push(msg.sender);
    	lastUser	= msg.sender;
	}
}
