pragma solidity ^0.4.22;

import "./zeppelin-solidity/token/ERC20/BurnableToken.sol";
import "./zeppelin-solidity/ownership/Ownable.sol";

contract ServiceToken is BurnableToken, Ownable {
  struct SERVICE  {
		bool		enable;
		uint		amount;
	}
  modifier onlyService {
		require(services[msg.sender].enable);
		_;
	}

  mapping(address=>SERVICE) private services;
  uint256 constant                  rate = 1000;

  function enableService(address _service) onlyOwner public {
    services[_service]    = SERVICE(true,services[_service].amount);
  }
  function disableService(address _service) onlyOwner public {
    services[_service]    = SERVICE(false,services[_service].amount);
  }

  event Mileage(address indexed to, uint256 amount);
  function mileage(uint256 _amount) onlyService public returns (bool) {
    uint256 amount        = _amount.mul(rate);
    totalSupply_          = totalSupply_.add(amount);
    balances[msg.sender]  = balances[msg.sender].add(amount);
    emit Mileage(msg.sender, _amount);
    emit Transfer(address(0), msg.sender, amount);
    return true;
  }
}
