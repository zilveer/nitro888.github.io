pragma solidity ^0.4.22;

import "./zeppelin-solidity/token/ERC20/BurnableToken.sol";

contract MileageToken is BurnableToken {
  event Mileage(address indexed to, uint256 amount);
  function mileage(uint256 _amount) public returns (bool) {
    uint256 amount        = _amount.mul(1000);
    totalSupply_          = totalSupply_.add(amount);
    balances[msg.sender]  = balances[msg.sender].add(amount);
    emit Mileage(msg.sender, _amount);
    emit Transfer(address(0), msg.sender, amount);
    return true;
  }
}
